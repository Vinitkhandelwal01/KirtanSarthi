import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useLang from "../hooks/useLang";
import { fmtTime, artistDisplayName } from "../utils/helpers";
import { AI_SUGGESTIONS } from "../utils/constants";
import { API_BASE_URL } from "../services/api";

const MAX_HISTORY = 20;
const BASE_URL = API_BASE_URL;

/* Render message text with proper line breaks and bold formatting */
const FormatMsg = ({ text }) => {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    /* Bold between ** markers */
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((seg, j) =>
      seg.startsWith("**") && seg.endsWith("**")
        ? <strong key={j}>{seg.slice(2, -2)}</strong>
        : seg
    );
    return <p key={i} style={{ margin: 0, minHeight: line.trim() === "" ? ".5em" : undefined }}>{parts}</p>;
  });
};

/* Mini star display */
const Stars = ({ rating }) => {
  const r = Math.min(Math.max(Math.round(Number(rating) || 0), 0), 5);
  return (
    <span style={{ color: "var(--gold)", fontSize: ".75rem", letterSpacing: 1 }}>
      {"★".repeat(r)}{"☆".repeat(5 - r)}
      <span style={{ color: "var(--text-muted)", marginLeft: 4, fontSize: ".72rem" }}>
        {(Number(rating) || 0).toFixed(1)}
      </span>
    </span>
  );
};

/* Compact artist card for search results inside chat */
const ArtistCard = ({ artist, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: "flex", gap: 10, padding: "10px 12px",
      background: "var(--cream)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", cursor: "pointer", transition: "border-color .2s",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--saffron)")}
    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
  >
    {artist.user?.image ? (
      <img
        src={artist.user.image}
        alt=""
        style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    ) : (
      <div style={{
        width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg, var(--saffron), var(--gold))",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontWeight: 700, fontSize: ".85rem",
      }}>
        {(artist.user?.firstName?.[0] || "A").toUpperCase()}
      </div>
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: ".85rem", color: "var(--text)" }}>
        {artistDisplayName(artist)}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 2 }}>
        <span style={{
          fontSize: ".62rem", fontWeight: 700, letterSpacing: ".5px",
          padding: "1px 6px", borderRadius: 4,
          background: artist.artistType === "GROUP" ? "rgba(99,102,241,.1)" : "rgba(245,158,11,.1)",
          color: artist.artistType === "GROUP" ? "#4338ca" : "#b45309",
          border: `1px solid ${artist.artistType === "GROUP" ? "rgba(99,102,241,.25)" : "rgba(245,158,11,.25)"}`,
        }}>
          {artist.artistType === "GROUP" ? "GROUP" : "SOLO"}
        </span>
        <span style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>
          · {artist.user?.city || "India"}
        </span>
        <Stars rating={artist.averageRating} />
      </div>
      {artist.artistType === "GROUP" && artist.user?.firstName && (
        <div style={{ fontSize: ".68rem", color: "var(--text-muted)", fontStyle: "italic", marginTop: 2 }}>
          Led by {artist.user.firstName} {artist.user.lastName}
        </div>
      )}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
        {(artist.eventTypes || []).slice(0, 3).map((et) => (
          <span key={et} style={{
            fontSize: ".65rem", padding: "1px 6px", borderRadius: 8,
            background: "var(--cream-dark)", color: "var(--brown-light)",
          }}>{et}</span>
        ))}
      </div>
      <div style={{ marginTop: 4, fontSize: ".82rem", fontWeight: 600, color: "var(--saffron-deep)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        Starting from Rs.{(artist.price || 0).toLocaleString("en-IN")}
        {artist.priceDifference > 0 && (
          <span style={{
            fontSize: ".68rem", padding: "1px 6px", borderRadius: 8,
            background: "#fef3c7", color: "#92400e", fontWeight: 500,
          }}>
            Rs.{artist.priceDifference.toLocaleString("en-IN")} above budget
          </span>
        )}
        {artist.isNegotiable && (
          <span style={{
            fontSize: ".68rem", padding: "1px 6px", borderRadius: 8,
            background: "#dcfce7", color: "#166534", fontWeight: 500,
          }}>
            🤝 Negotiable
          </span>
        )}
      </div>
    </div>
    <div style={{ alignSelf: "center", color: "var(--saffron)", fontSize: "1.2rem" }}>›</div>
  </div>
);

export default function AIChat() {
  const { t } = useLang();
  const { user, resolved } = useAuth();
  const navigate = useNavigate();
  const storageKey = useMemo(
    () => (user?._id ? `ks_ai_messages:${user._id}` : null),
    [user?._id]
  );
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [retryMsg, setRetryMsg] = useState(null);
  const [streamingText, setStreamingText] = useState("");
  const [lastArtists, setLastArtists] = useState([]);
  const [storageHydrated, setStorageHydrated] = useState(false);
  const bottomRef = useRef(null);
  const abortRef = useRef(null);
  const messagesRef = useRef([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    setStorageHydrated(false);
  }, [storageKey]);

  useEffect(() => {
    if (!resolved) return;

    if (!storageKey) {
      setMessages([]);
      setLastArtists([]);
      setStorageHydrated(true);
      return;
    }

    try {
      const saved = JSON.parse(localStorage.getItem(storageKey)) || [];
      setMessages(saved);

      let nextArtists = [];
      for (let i = saved.length - 1; i >= 0; i--) {
        const msg = saved[i];
        if (msg.artists?.length) {
          nextArtists = msg.artists;
          break;
        }
        if (msg.recommended?.length) {
          nextArtists = msg.recommended;
          break;
        }
      }
      setLastArtists(nextArtists);
    } catch {
      setMessages([]);
      setLastArtists([]);
    }
    setStorageHydrated(true);
  }, [resolved, storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, streamingText]);

  useEffect(() => {
    if (!storageKey || !storageHydrated) return;
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageHydrated, storageKey]);

  useEffect(() => {
    if (resolved && !user) navigate("/login");
  }, [resolved, user, navigate]);

  const send = useCallback(async (text) => {
    if (!resolved || !user) return;

    const content = text || input.trim();
    if (!content || loading) return;
    setInput("");
    setRetryMsg(null);
    setStreamingText("");

    const userMsg = { id: Date.now(), role: "user", content, ts: new Date().toISOString() };
    setMessages((p) => [...p, userMsg]);
    setLoading(true);

    const nextHistorySource = [...messagesRef.current, userMsg];
    const history = nextHistorySource
      .filter((m) => !m.isErr)
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content }));

    /* Send the first shown artist as context so backend knows who "this artist" refers to */
    const selectedArtistId = lastArtists[0]?._id || undefined;
    const token = localStorage.getItem("token");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(`${BASE_URL}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ message: content, history, selectedArtistId }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        const requestError = new Error(errBody.reply || errBody.message || "Request failed");
        requestError.status = resp.status;
        throw requestError;
      }

      if (!resp.body) {
        throw new Error("AI response stream not available");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let replyText = "";
      let artists = null;
      let recommended = null;
      let userBudget = null;
      let recommendedMode = null;
      let booking = null;
      let suggestions = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const evt = JSON.parse(jsonStr);
            if (evt.type === "token") {
              replyText += evt.content;
              setStreamingText(replyText);
            } else if (evt.type === "done") {
              replyText = evt.reply || replyText;
              artists = evt.artists || null;
              recommended = evt.recommended || null;
              userBudget = evt.userBudget || null;
              recommendedMode = evt.recommendedMode || null;
              booking = evt.booking || null;
              suggestions = evt.suggestions || null;
            } else if (evt.type === "error") {
              throw new Error(evt.message || "AI service error");
            }
          } catch (parseErr) {
            if (parseErr.message) throw parseErr;
          }
        }
      }

      setStreamingText("");
      /* Track last shown artists for selectedArtistId context */
      if (artists?.length) setLastArtists(artists);
      else if (recommended?.length) setLastArtists(recommended);

      setMessages((p) => [...p, {
        id: Date.now() + 1,
        role: "assistant",
        content: replyText || "No response",
        artists,
        recommended,
        userBudget,
        recommendedMode,
        booking,
        suggestions,
        ts: new Date().toISOString(),
      }]);
    } catch (err) {
      if (err.name === "AbortError") return;
      setStreamingText("");
      const isRateLimit = err.status === 429;
      setMessages((p) => [...p, {
        id: Date.now() + 1,
        role: "assistant",
        content: isRateLimit ? t("ai_rate_limit") : (err.message || t("ai_error")),
        ts: new Date().toISOString(),
        isErr: true,
      }]);
      setRetryMsg(content);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, lastArtists, loading, resolved, t, user]);

  const retry = () => {
    if (retryMsg) {
      setMessages((p) => p.filter((m) => !m.isErr));
      send(retryMsg);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setLastArtists([]);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    setClearConfirm(false);
  };

  if (!resolved) {
    return (
      <div className="main-content text-center" style={{ padding: "4rem" }}>
        <span className="spinner" /> Loading...
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <div className="page-header">
        <div className="page-header-content">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1>🙏 {t("ai_chat")}</h1>
            {messages.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: "white", opacity: 0.8 }}
                onClick={() => setClearConfirm(true)}
              >
                🗑 {t("clear_chat")}
              </button>
            )}
          </div>
          <p>Ask me about artists, bookings, or spiritual events</p>
        </div>
      </div>

      <div className="main-content ai-chat-shell">
        <div className="card ai-chat-card">
          {/* Messages area */}
          <div className="ai-chat-messages">
            {/* Welcome message */}
            {messages.length === 0 && !loading && (
              <div className="ai-msg-wrap theirs">
                <div style={{
                  background: "white", border: "1px solid var(--border)",
                  borderRadius: "16px 16px 16px 4px", padding: "12px 16px",
                  fontSize: ".88rem", lineHeight: 1.6, boxShadow: "0 1px 4px var(--shadow)",
                }}>
                  {t("ai_welcome")}
                </div>
                <div style={{ fontSize: ".7rem", color: "var(--text-muted)", marginTop: 4 }}>
                  AI · Just now
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((m, idx) => (
              <div key={m.id} className={`ai-msg-wrap ${m.role === "user" ? "mine" : "theirs"}`}>
                <div style={{
                  padding: "10px 14px",
                  borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  fontSize: ".88rem", lineHeight: 1.6,
                  background: m.role === "user"
                    ? "linear-gradient(135deg,var(--saffron),var(--saffron-deep))"
                    : m.isErr ? "#fef2f2" : "white",
                  color: m.role === "user" ? "white" : m.isErr ? "#991b1b" : "var(--text)",
                  border: m.isErr ? "1px solid #fecaca" : m.role !== "user" ? "1px solid var(--border)" : "none",
                  boxShadow: "0 1px 4px var(--shadow)",
                }}>
                  {m.role === "user" ? m.content : <FormatMsg text={m.content} />}
                </div>

                {/* Artist search results */}
                {m.artists && m.artists.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    {m.artists.map((a) => (
                      <ArtistCard
                        key={a._id}
                        artist={a}
                        onClick={() => navigate(`/artist/${a._id}`)}
                      />
                    ))}
                  </div>
                )}

                {/* Recommended artists (soft budget match) */}
                {m.recommended && m.recommended.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{
                      fontSize: ".76rem", fontWeight: 600, color: "var(--text-muted)",
                      marginBottom: 6, display: "flex", alignItems: "center", gap: 4,
                    }}>
                      {m.recommendedMode === "soft_budget"
                        ? `Suggested near your budget${m.userBudget ? ` (Rs.${m.userBudget.toLocaleString("en-IN")})` : ""}:`
                        : "Recommended artists you may like:"}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {m.recommended.map((a) => (
                        <ArtistCard
                          key={a._id}
                          artist={a}
                          onClick={() => navigate(`/artist/${a._id}`)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Retry button on error */}
                {m.isErr && retryMsg && idx === messages.length - 1 && (
                  <div style={{ marginTop: 6 }}>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: ".78rem" }}
                      onClick={retry}
                    >
                      ↺ {t("ai_retry")}
                    </button>
                  </div>
                )}

                {/* Contextual suggestion pills - only on the last AI message */}
                {m.role === "assistant" && !m.isErr && m.suggestions?.length > 0 && idx === messages.length - 1 && !loading && (
                  <div style={{
                    marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6,
                  }}>
                    <div style={{ width: "100%", fontSize: ".72rem", color: "var(--text-muted)", marginBottom: 2 }}>
                      You may also ask:
                    </div>
                    {m.suggestions.map((s) => (
                      <button
                        key={s}
                        className="pill"
                        style={{ fontSize: ".75rem", cursor: "pointer" }}
                        onClick={() => send(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                <div style={{
                  fontSize: ".7rem", color: "var(--text-muted)", marginTop: 4,
                  textAlign: m.role === "user" ? "right" : "left",
                }}>
                  {m.role === "user" ? "You" : "AI"} · {fmtTime(m.ts)}
                </div>
              </div>
            ))}

            {/* Streaming bubble - shows tokens as they arrive */}
            {loading && streamingText && (
              <div className="ai-msg-wrap theirs">
                <div style={{
                  padding: "10px 14px",
                  borderRadius: "16px 16px 16px 4px",
                  fontSize: ".88rem", lineHeight: 1.6,
                  background: "white",
                  border: "1px solid var(--border)",
                  boxShadow: "0 1px 4px var(--shadow)",
                  color: "var(--text)",
                }}>
                  <FormatMsg text={streamingText} />
                  <span style={{ animation: "aiBlink 1s infinite", opacity: 0.6 }}>▊</span>
                </div>
              </div>
            )}

            {/* Loading dots - before streaming starts */}
            {loading && !streamingText && (
              <div style={{ alignSelf: "flex-start" }}>
                <div style={{
                  background: "white", border: "1px solid var(--border)",
                  borderRadius: "16px 16px 16px 4px", padding: "12px 18px",
                  display: "flex", gap: 5, alignItems: "center",
                  boxShadow: "0 1px 4px var(--shadow)",
                }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 8, height: 8, borderRadius: "50%", background: "var(--saffron)",
                        animation: `aiDot 1s ${i * 0.2}s infinite ease-in-out`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestion pills */}
          {messages.length === 0 && (
            <div className="ai-suggest-wrap">
              {AI_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="pill"
                  style={{ fontSize: ".78rem" }}
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="ai-input-bar">
            <input
              className="form-input"
              style={{ flex: 1 }}
              placeholder={t("ai_placeholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              disabled={loading}
            />
            <button
              className="btn btn-primary"
              onClick={() => send()}
              disabled={loading || !input.trim()}
            >
              {loading ? <span className="spinner" /> : "➤"}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes aiDot{0%,80%,100%{transform:scale(0.6);opacity:.4}40%{transform:scale(1);opacity:1}}
          @keyframes aiBlink{0%,100%{opacity:.6}50%{opacity:0}}
        `}</style>
      </div>

      {/* Clear confirmation modal */}
      {clearConfirm && (
        <div className="modal-overlay" onClick={() => setClearConfirm(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 380, textAlign: "center" }}
          >
            <button className="modal-close" onClick={() => setClearConfirm(false)}>×</button>
            <div style={{ fontSize: "2.2rem", marginBottom: ".5rem" }}>🗑️</div>
            <h2 style={{
              fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", marginBottom: ".4rem",
            }}>
              Clear Chat History?
            </h2>
            <p style={{
              color: "var(--text-muted)", fontSize: ".88rem", marginBottom: "1.5rem", lineHeight: 1.5,
            }}>
              All messages will be permanently deleted. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-danger" onClick={clearChat}>🗑 Yes, Clear All</button>
              <button className="btn btn-ghost" onClick={() => setClearConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


