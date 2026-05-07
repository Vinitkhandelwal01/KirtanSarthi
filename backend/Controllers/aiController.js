const mongoose = require("mongoose");
const Artist = require("../models/Artist");
const Booking = require("../models/Booking");
const groq = require("../utills/aiClient");

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CONSTANTS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const MAX_MSG_LEN = 1200;
const MAX_HISTORY = 20;
const MAX_TXT = 80;
const MAX_RESULTS = 10;
const MAX_PRICE = 1_000_000;
const SOFT_BUDGET_MARGIN = 1000;
const NEGOTIATION_MARGIN = 1500;
const STREAM_CHUNK_SIZE = 12;
const STREAM_DELAY_MS = 20;
const VALID_ACTIONS = new Set(["SEARCH", "CANCEL", "RECOMMEND"]);
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const EVENT_TYPE_KEYWORDS = ["Kirtan", "Bhajan", "Jagran", "Ram Katha", "SundarKand"];
const SEARCH_HINTS = ["artist", "artists", "singer", "singers", "bhajan", "kirtan", "jagran", "ram katha", "sundarkand"];

const trim = (v, max = MAX_TXT) => String(v || "").trim().slice(0, max);
const escRx = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const isValidObjectId = (v) => typeof v === "string" && mongoose.Types.ObjectId.isValid(v);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   KEYWORD â†’ DEITY MAPPING  (Feature 3)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const FESTIVAL_DEITY_MAP = {
  janmashtami: "Krishna",
  shivratri: "Shiva",
  mahashivratri: "Shiva",
  navratri: "Durga",
  "hanuman jayanti": "Hanuman",
  "ram navami": "Ram",
  "ganesh chaturthi": "Ganesh",
  diwali: "Lakshmi",
  "radha ashtami": "Radha",
  "guru purnima": "Vishnu",
  "khatu shyam": "Khatu Shyam",
};

/** Enrich search params by detecting festival/deity keywords in the user message */
const enrichWithDeityMapping = (action, userMessage) => {
  if (action.god) return action; // already has an explicit deity
  const lower = userMessage.toLowerCase();
  for (const [keyword, deity] of Object.entries(FESTIVAL_DEITY_MAP)) {
    if (lower.includes(keyword)) {
      return { ...action, god: deity };
    }
  }
  return action;
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CONTEXT MEMORY  (Feature 1)
   Lightweight per-user session memory (in-process).
   Stores the last shown artists so "book this" can resolve.
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const contextStore = new Map();       // userId â†’ { lastShownArtists, updatedAt }
const CTX_TTL_MS = 30 * 60 * 1000;   // 30 min TTL

const getContext = (userId) => {
  const ctx = contextStore.get(userId);
  if (!ctx) return null;
  if (Date.now() - ctx.updatedAt > CTX_TTL_MS) { contextStore.delete(userId); return null; }
  return ctx;
};

const setContext = (userId, artists) => {
  contextStore.set(userId, {
    lastShownArtists: artists.slice(0, 5).map((a) => ({
      id: String(a._id),
      name: a.groupName || `${a.user?.firstName || ""} ${a.user?.lastName || ""}`.trim() || "Artist",
      city: a.user?.city || "",
      price: a.price || 0,
    })),
    updatedAt: Date.now(),
  });
};

/* Periodic cleanup to prevent memory leaks (runs every 10 min) */
setInterval(() => {
  const now = Date.now();
  for (const [uid, ctx] of contextStore) {
    if (now - ctx.updatedAt > CTX_TTL_MS) contextStore.delete(uid);
  }
}, 10 * 60 * 1000);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SYSTEM PROMPT  (Features 1, 4, 7)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const SYSTEM_PROMPT = [
  "You are KirtanSarthi AI â€” a warm, knowledgeable assistant for an Indian spiritual event and artist booking platform.",
  "",
  "PLATFORM CONTEXT:",
  "KirtanSarthi connects devotees with Kirtan, Bhajan, Jagran, Ram Katha, and SundarKand artists across India.",
  "Users can search artists by city, deity, event type, and budget; book artists; negotiate prices; and manage bookings.",
  "To book an artist, users should visit the artist's profile page and click 'Book This Artist'.",
  "",
  "YOUR CAPABILITIES:",
  "1. Answer questions about spiritual events, rituals, planning tips, and Indian devotional traditions.",
  "2. Help users search for artists based on their needs (city, budget, event type, deity).",
  "3. Help users cancel bookings (they must provide a booking ID).",
  "4. Explain the booking process on KirtanSarthi (see BOOKING FLOW section below).",
  "5. Recommend top-rated artists without strict filters when user asks for suggestions.",
  "",
  "BOOKING FLOW ON KIRTANSARTHI:",
  "When a user asks how to book, how to book an artist, step-by-step booking, or anything about the booking process, give ONLY these platform-specific steps.",
  "FORMATTING RULE: You MUST use numbered steps (1. 2. 3. 4. 5.) with each step on a NEW LINE (use \\n). NEVER write steps in a paragraph. Each step = one short sentence.",
  "Example reply format (follow this exact pattern):",
  '"Namaste Ji ðŸ™\\n\\nYou can book {artist name} in these steps:\\n\\n1. Click the artist card shown above in the chat.\\n2. This opens the artist\'s profile page.\\n3. Click the **Book This Artist** button.\\n4. Fill in event details (event type, date, location, budget).\\n5. Submit the booking request.\\n\\nThe artist will review and confirm your booking."',
  "- If an artist name is available from context (SELECTED_ARTIST or LAST_SHOWN_ARTISTS), mention them by name.",
  "- NEVER give generic event planning advice (venue selection, choosing event type, etc.) when the user asks how to BOOK.",
  '- "How to book" and "How to plan an event" are DIFFERENT questions. Only give planning advice when explicitly asked about planning.',
  "",
  'CANNOT BOOK FOR USER:',
  'If a user says "you book my booking", "book it for me", "can you book this artist", "please book for me":',
  '- Clearly explain: "I cannot directly book the artist for you, but you can do it easily."',
  '- Then show the numbered booking steps above.',
  '- Do NOT repeat the same previous message verbatim. If you already gave steps, give a shorter version or rephrase.',
  '- NEVER just repeat your last reply word-for-word. Vary your wording each time.',
  "",
  "CONTEXT AWARENESS:",
  "- If the user refers to an artist shown earlier (e.g. 'book this', 'that artist', 'this one', 'I like them', 'how do I book this', 'how to book him'), assume they mean the previously displayed artist.",
  "- Do NOT trigger SEARCH again in such cases.",
  "- Instead, give the booking flow steps above, mentioning the artist by name.",
  "- If a SELECTED_ARTIST context or LAST_SHOWN_ARTISTS context is provided below, reference those artists by name. Do NOT run SEARCH again.",
  "",
  "WHEN TO USE SEARCH ACTION:",
  "- ONLY when the user EXPLICITLY asks to find, search, show, or list artists with specific criteria.",
  '- Example: "Find kirtan artists in Jaipur", "Show me bhajan singers", "Search artists under 5000".',
  "- Do NOT use SEARCH when user asks HOW to book, asks general questions, says 'book this', or refers to a previously shown artist.",
  "",
  "WHEN TO USE RECOMMEND ACTION:",
  "- When user asks for general suggestions without strict filters.",
  '- Example: "Who are the best artists?", "Suggest some good bhajan singers", "Best artists for Janmashtami".',
  "- RECOMMEND returns top-rated artists with optional loose filters.",
  "",
  "EVENT PLANNING GUIDANCE (only when user explicitly asks about PLANNING, NOT booking):",
  'When a user asks "how to plan an event", "help me plan a Bhajan Sandhya", "how to organize a function", provide these steps:',
  "Step 1 â€” Choose your event type (Kirtan, Bhajan, Jagran, etc.)",
  "Step 2 â€” Select an artist on KirtanSarthi that fits your event",
  "Step 3 â€” Set your budget and preferred date",
  "Step 4 â€” Arrange a venue (home, temple, community hall)",
  "Step 5 â€” Book the artist through KirtanSarthi and coordinate details",
  "Keep it concise. Do NOT use SEARCH for planning questions.",
  '- IMPORTANT: If user asks "how to book", "how do I book this artist", "booking steps", DO NOT use these planning steps. Use the BOOKING FLOW ON KIRTANSARTHI section above instead.',
  "",
  "RESPONSE FORMAT â€” You MUST reply in this exact JSON format, nothing else:",
  '{ "reply": "Your conversational response text here", "action": null, "suggestions": ["Follow-up 1", "Follow-up 2", "Follow-up 3"] }',
  "",
  "SUGGESTIONS FIELD (mandatory):",
  "- Always include 2-3 short contextual follow-up suggestions the user might want to ask next.",
  "- Keep each suggestion under 40 characters.",
  "- Make them relevant to the current conversation context.",
  '- Examples after a search: ["Artists under Rs.7000", "How to book this artist", "Bhajan singers near Delhi"]',
  '- Examples after booking info: ["Find more artists", "How to cancel a booking", "Plan a spiritual event"]',
  '- Examples after general chat: ["Find Kirtan artists", "Best artists for Janmashtami", "How to book an artist"]',
  "",
  "When the user wants to FIND/SEARCH for artists (explicit criteria):",
  '{ "reply": "Let me find artists for you...", "action": { "type": "SEARCH", "city": "", "god": "", "eventType": "", "maxPrice": 0, "artistName": "" }, "suggestions": [...] }',
  "",
  "When the user wants general RECOMMENDATIONS (no strict criteria):",
  '{ "reply": "Here are some top artists...", "action": { "type": "RECOMMEND", "eventType": "", "god": "" }, "suggestions": [...] }',
  "",
  "When the user wants to CANCEL a booking (must provide booking ID):",
  '{ "reply": "Your response", "action": { "type": "CANCEL", "bookingId": "..." }, "suggestions": [...] }',
  "",
  "RULES:",
  "- Be warm and concise. Use occasional Hindi/Sanskrit greetings (Namaste ðŸ™, Ji, etc.).",
  "- Keep replies concise â€” 2-4 sentences usually, 4-6 steps max for booking/planning instructions.",
  "- FORMATTING: When giving steps, ALWAYS use numbered list (1. 2. 3.) with newlines. NEVER combine steps into a paragraph.",
  "- AVOID REPETITION: Do NOT repeat the same reply text. If you already gave booking steps before, rephrase or give a shorter version.",
  "- GRAMMAR TOLERANCE: Users may use incorrect English (e.g. 'you book my booking', 'how do I booking', 'I want booking'). Interpret the intended meaning and respond helpfully.",
  "- maxPrice = 0 means no budget filter. Set a value only if the user mentions a specific budget.",
  "- Never invent booking IDs. Only use CANCEL if the user provides one.",
  "- Leave unknown fields as empty strings.",
  "- Event types on the platform: Kirtan, Bhajan, Jagran, Ram Katha, SundarKand.",
  '- When user asks "how to book" â†’ use BOOKING FLOW steps, NOT event planning steps.',
  "- IMPORTANT: Return ONLY valid JSON. No markdown, no backticks, no extra text.",
].join("\n");

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   HELPERS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/** Safely parse JSON from LLM output (handles markdown wrappers) */
const parseJson = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  try { return JSON.parse(raw); } catch { /* fallback below */ }
  const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
  if (s === -1 || e <= s) return null;
  try { return JSON.parse(raw.slice(s, e + 1)); } catch { return null; }
};

/** Parse and clamp a price value */
const parsePrice = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_PRICE) : null;
};

const inferSearchAction = (message = "") => {
  const lower = String(message).toLowerCase();
  const looksLikeSearch = SEARCH_HINTS.some((hint) => lower.includes(hint));
  if (!looksLikeSearch) return null;

  const matchedEventType = EVENT_TYPE_KEYWORDS.find((type) =>
    lower.includes(type.toLowerCase())
  );
  const budgetMatch =
    lower.match(/(?:under|below|within)\s*(?:rs\.?|â‚¹)?\s*(\d[\d,]*)/i) ||
    lower.match(/(?:rs\.?|â‚¹)\s*(\d[\d,]*)/i);

  return {
    type: "SEARCH",
    city: "",
    god: "",
    eventType: matchedEventType || "",
    maxPrice: budgetMatch ? Number(String(budgetMatch[1]).replace(/,/g, "")) : 0,
    artistName: "",
  };
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   AGGREGATION  (Features 5, 6)
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const ARTIST_PROJECT = {
  $project: {
    _id: 1, artistType: 1, groupName: 1, description: 1, experienceYears: 1,
    eventTypes: 1, gods: 1, price: 1, averageRating: 1, totalReviews: 1, totalEvents: 1,
    user: {
      _id: "$userDoc._id", firstName: "$userDoc.firstName",
      lastName: "$userDoc.lastName", city: "$userDoc.city", image: "$userDoc.image",
    },
  },
};
const ARTIST_SORT = {
  $sort: { averageRating: -1, totalReviews: -1, totalEvents: -1, experienceYears: -1, _id: 1 },
};

/** Base pipeline: approved + not-suspended, joined with user */
const basePipeline = () => [
  { $match: { isApproved: true, isSuspended: false } },
  { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "userDoc" } },
  { $unwind: "$userDoc" },
];

/** Build $match stages for search criteria */
const buildMatchStages = (params, priceLimit) => {
  const stages = [];
  if (params.city) {
    stages.push({ $match: { "userDoc.city": { $regex: escRx(params.city), $options: "i" } } });
  }
  if (params.god) {
    stages.push({ $match: { gods: { $elemMatch: { $regex: escRx(params.god), $options: "i" } } } });
  }
  if (params.eventType) {
    stages.push({ $match: { eventTypes: { $elemMatch: { $regex: escRx(params.eventType), $options: "i" } } } });
  }
  if (priceLimit > 0) {
    stages.push({ $match: { price: { $lte: priceLimit } } });
  }
  if (params.artistName) {
    const rx = escRx(params.artistName);
    stages.push({
      $match: {
        $or: [
          { "userDoc.firstName": { $regex: rx, $options: "i" } },
          { "userDoc.lastName": { $regex: rx, $options: "i" } },
          { groupName: { $regex: rx, $options: "i" } },
        ],
      },
    });
  }
  return stages;
};

const buildSearchPipeline = (params, priceLimit) => [
  ...basePipeline(),
  ...buildMatchStages(params, priceLimit),
  ARTIST_PROJECT,
  ARTIST_SORT,
  { $limit: MAX_RESULTS },
];

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEARCH EXECUTION  (Feature 2 + 5)
   Multi-step: exact â†’ soft budget â†’ negotiable tagging
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const executeSearch = async (action, userMessage) => {
  let enriched = enrichWithDeityMapping(action, userMessage);

  const params = {
    city: trim(enriched.city),
    god: trim(enriched.god),
    eventType: trim(enriched.eventType),
    maxPrice: parsePrice(enriched.maxPrice),
    artistName: trim(enriched.artistName, 120),
  };

  const userBudget = params.maxPrice;
  const strictLimit = userBudget || 0;

  /* Step 1 â€” Exact match */
  let artists = await Artist.aggregate(buildSearchPipeline(params, strictLimit));

  let recommended = null;
  let recommendedMode = null;

  /* Step 2 â€” Soft budget fallback (Feature 5) */
  if (userBudget && artists.length < 3) {
    const softLimit = userBudget + SOFT_BUDGET_MARGIN;
    const softResults = await Artist.aggregate(buildSearchPipeline(params, softLimit));
    const strictIds = new Set(artists.map((a) => String(a._id)));
    const softOnly = softResults.filter((a) => !strictIds.has(String(a._id)));
    if (softOnly.length > 0) {
      recommended = softOnly.map((a) => ({
        ...a,
        priceDifference: (a.price || 0) - userBudget,
        isNegotiable: (a.price || 0) <= userBudget + NEGOTIATION_MARGIN,
      }));
    }
  }

  /* Feature 2 â€” Tag negotiable artists in exact matches too */
  if (userBudget) {
    artists = artists.map((a) => ({
      ...a,
      isNegotiable: (a.price || 0) > userBudget && (a.price || 0) <= userBudget + NEGOTIATION_MARGIN,
      priceDifference: Math.max(0, (a.price || 0) - userBudget),
    }));
  }

  return { artists, recommended, userBudget, recommendedMode };
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   RECOMMEND EXECUTION  (Feature 7)
   Returns top-rated artists with optional loose filters.
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const executeRecommend = async (action, userMessage) => {
  const enriched = enrichWithDeityMapping(action, userMessage);
  const params = {
    city: "",
    god: trim(enriched.god),
    eventType: trim(enriched.eventType),
    maxPrice: null,
    artistName: "",
  };
  const artists = await Artist.aggregate(buildSearchPipeline(params, 0));
  return { artists, recommended: null, userBudget: null };
};

/** Fetch a single artist by ID (for context-aware booking) */
const fetchArtistById = async (artistId) => {
  if (!isValidObjectId(artistId)) return null;
  const results = await Artist.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(artistId), isApproved: true, isSuspended: false } },
    ...basePipeline().slice(1), // skip duplicate $match, reuse $lookup + $unwind
    ARTIST_PROJECT,
    { $limit: 1 },
  ]);
  return results[0] || null;
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SSE STREAMING HANDLER
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
exports.aiChat = async (req, res) => {
  try {
    /* â”€â”€ Auth â”€â”€ */
    if (req.user?.accountType !== "USER") {
      return res.status(403).json({ success: false, reply: "AI assistant is available for user accounts only." });
    }

    /* â”€â”€ Input validation â”€â”€ */
    const raw = req.body?.message;
    const message = typeof raw === "string" ? raw.trim() : "";
    if (!message) {
      return res.status(400).json({ success: false, reply: "Message is required." });
    }
    if (message.length > MAX_MSG_LEN) {
      return res.status(400).json({ success: false, reply: `Message too long (max ${MAX_MSG_LEN} characters).` });
    }

    const userId = String(req.user.id);
    const selectedArtistId = typeof req.body?.selectedArtistId === "string"
      ? req.body.selectedArtistId.trim()
      : null;

    /* â”€â”€ Build conversation messages for Groq â”€â”€ */
    const hist = Array.isArray(req.body?.history) ? req.body.history.slice(-MAX_HISTORY) : [];
    const chatMessages = [{ role: "system", content: SYSTEM_PROMPT }];

    for (const m of hist) {
      if (!m || typeof m.content !== "string") continue;
      chatMessages.push({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content.slice(0, MAX_MSG_LEN),
      });
    }

    /* â”€â”€ Inject context memory (Feature 1) â”€â”€ */
    let selectedArtist = null;

    if (selectedArtistId) {
      selectedArtist = await fetchArtistById(selectedArtistId);
      if (selectedArtist) {
        const name = selectedArtist.groupName
          || `${selectedArtist.user?.firstName || ""} ${selectedArtist.user?.lastName || ""}`.trim()
          || "the artist";
        chatMessages.push({
          role: "system",
          content: `SELECTED_ARTIST: The user is referring to "${name}" (ID: ${selectedArtist._id}, Price: Rs.${selectedArtist.price}, City: ${selectedArtist.user?.city || "India"}). Guide them to visit the artist's profile to book. Do NOT use SEARCH.`,
        });
      }
    }

    /* Inject last-shown artists from context memory if no explicit selection */
    if (!selectedArtist) {
      const ctx = getContext(userId);
      if (ctx?.lastShownArtists?.length) {
        const summary = ctx.lastShownArtists
          .map((a, i) => `${i + 1}. ${a.name} (${a.city}, Rs.${a.price})`)
          .join("; ");
        chatMessages.push({
          role: "system",
          content: `LAST_SHOWN_ARTISTS: ${summary}. If user says "book this", "that one", "first artist", etc., refer to these. Do NOT run SEARCH again.`,
        });
      }
    }

    chatMessages.push({ role: "user", content: message });

    /* â”€â”€ SSE headers â”€â”€ */
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    /* â”€â”€ Collect full Groq response â”€â”€ */
    const stream = await groq.chat.completions.create({
      model: MODEL,
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 1024,
      response_format: { type: "json_object" },
      stream: true,
    });

    let fullText = "";
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || "";
      if (delta) fullText += delta;
    }

    /* â”€â”€ Parse AI response â”€â”€ */
    const parsed = parseJson(fullText);
    let reply = parsed?.reply || fullText;
    const action = parsed?.action;
    const suggestions = Array.isArray(parsed?.suggestions)
      ? parsed.suggestions.filter((s) => typeof s === "string" && s.trim()).slice(0, 3)
      : null;

    let artists = null;
    let recommended = null;
    let recommendedMode = null;
    let userBudget = null;
    let booking = null;

    /* â”€â”€ Execute validated actions (Feature 8 â€” safety) â”€â”€ */
    let resolvedAction = action && VALID_ACTIONS.has(action.type)
      ? action
      : inferSearchAction(message);

    if (resolvedAction && VALID_ACTIONS.has(resolvedAction.type)) {
      if (resolvedAction.type === "SEARCH") {
        const result = await executeSearch(resolvedAction, message);
        artists = result.artists;
        recommended = result.recommended;
        userBudget = result.userBudget;
        recommendedMode = result.recommendedMode;

        if ((!artists || artists.length === 0) && (!recommended || recommended.length === 0)) {
          const recommendFallback = await executeRecommend(resolvedAction, message);
          recommended = recommendFallback.artists;
          recommendedMode = recommended?.length ? "general_fallback" : null;
          if (recommended?.length) {
            reply = userBudget
              ? `I could not find approved artists within your budget of Rs.${userBudget.toLocaleString("en-IN")} right now, but here are some artists you may still like.`
              : "I could not find an exact match, but here are some good artists you may like.";
          } else {
            reply = userBudget
              ? `I could not find approved artists within your budget of Rs.${userBudget.toLocaleString("en-IN")} right now. Please try a higher budget or a different event type.`
              : "I could not find matching artists right now. Please try a higher budget or a different event type.";
          }
        }
      }

      if (resolvedAction.type === "RECOMMEND") {
        const result = await executeRecommend(resolvedAction, message);
        artists = result.artists;
      }

      if (resolvedAction.type === "CANCEL") {
        const bid = trim(resolvedAction.bookingId, 64);
        if (isValidObjectId(bid)) {
          const cancelled = await Booking.findOneAndUpdate(
            { _id: bid, user: req.user.id, status: { $in: ["PENDING", "COUNTERED", "ACCEPTED"] } },
            { $set: { status: "CANCELLED" } },
            { new: true, projection: { _id: 1, status: 1 } }
          );
          if (cancelled) booking = cancelled;
        }
      }
    }
    /* Unknown action.type is silently ignored */

    /* â”€â”€ Update context memory with results â”€â”€ */
    const allArtists = [...(artists || []), ...(recommended || [])];
    if (allArtists.length > 0) {
      setContext(userId, allArtists);
    }

    /* â”€â”€ Stream reply text in smooth chunks â”€â”€ */
    const chunks = reply.match(new RegExp(`.{1,${STREAM_CHUNK_SIZE}}`, "gs")) || [reply];
    for (const chunk of chunks) {
      res.write(`data: ${JSON.stringify({ type: "token", content: chunk })}\n\n`);
      await wait(STREAM_DELAY_MS);
    }

    /* â”€â”€ Send final structured payload â”€â”€ */
    const donePayload = { type: "done", reply, artists, booking };
    if (recommended) donePayload.recommended = recommended;
    if (userBudget) donePayload.userBudget = userBudget;
    if (recommendedMode) donePayload.recommendedMode = recommendedMode;
    if (selectedArtist) donePayload.selectedArtist = selectedArtist;
    if (suggestions?.length) donePayload.suggestions = suggestions;

    res.write(`data: ${JSON.stringify(donePayload)}\n\n`);
    res.end();
  } catch (err) {
    console.error("aiChat error:", err?.message || err);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "AI service error. Please try again." })}\n\n`);
      return res.end();
    }
    return res.status(500).json({ success: false, reply: "AI service is temporarily unavailable. Please try again shortly." });
  }
};


