const Event = require("../models/Event");
const User = require("../models/User");
const Artist = require("../models/Artist");
const { sendNotification } = require("../utills/sendNotification");
const { getIO } = require("../socket/Socket");
const { geocodeAddress, reverseGeocodeCity } = require("../utills/geocodeAddress");

const CORE_EVENT_FIELDS = [
  "title",
  "eventType",
  "god",
];
const MAX_NEARBY_DISTANCE_METERS = Number(process.env.NEARBY_RADIUS) || 10000;
const MAX_NEARBY_RESULTS = 20;
let hasCheckedUserGeoIndex = false;
let userGeoIndexAvailable = false;

const isValidPoint = (location) =>
  location &&
  location.type === "Point" &&
  Array.isArray(location.coordinates) &&
  location.coordinates.length === 2 &&
  location.coordinates.every((c) => Number.isFinite(c));

const canRunNearbyUserGeoQuery = async () => {
  if (hasCheckedUserGeoIndex) return userGeoIndexAvailable;

  try {
    const indexes = await User.collection.indexes();
    userGeoIndexAvailable = indexes.some((index) => index.key?.location === "2dsphere");

    if (!userGeoIndexAvailable) {
      console.warn("User location 2dsphere index missing; attempting to create it before falling back to city.");

      await User.collection.createIndex({ location: "2dsphere" }, { sparse: true });

      const refreshedIndexes = await User.collection.indexes();
      userGeoIndexAvailable = refreshedIndexes.some((index) => index.key?.location === "2dsphere");

      if (!userGeoIndexAvailable) {
        console.warn("User location 2dsphere index is still unavailable; using city fallback.");
      }
    }
  } catch (error) {
    console.warn("Failed to inspect or create user geo index; using city fallback.", error.message);
    userGeoIndexAvailable = false;
  }

  hasCheckedUserGeoIndex = true;
  return userGeoIndexAvailable;
};

const getNearbyUsersWithFallback = async (event) => {
  const recipients = [];
  let geoQueryWorked = false;

  if (isValidPoint(event.location) && await canRunNearbyUserGeoQuery()) {
    try {
      const nearbyUsers = await User.find({
        notifyNearbyEvents: true,
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: event.location.coordinates,
            },
            $maxDistance: 10000,
          },
        },
      });
      recipients.push(...nearbyUsers);
      geoQueryWorked = true;
    } catch (error) {
      console.error("Nearby GPS query failed, falling back to city:", error.message);
    }
  }

  const normalizedCity = String(event.city || "").trim().toLowerCase();
  if (normalizedCity) {
    const cityUsers = await User.find(
      geoQueryWorked
        ? {
            notifyNearbyEvents: true,
            city: normalizedCity,
            $or: [
              { location: { $exists: false } },
              { location: null },
              { "location.coordinates.0": { $exists: false } },
            ],
          }
        : {
            notifyNearbyEvents: true,
            city: normalizedCity,
          }
    );
    recipients.push(...cityUsers);
  }

  const uniqueUsers = [];
  const seen = new Set();
  recipients.forEach((user) => {
    const id = user?._id?.toString?.();
    if (id && !seen.has(id)) {
      seen.add(id);
      uniqueUsers.push(user);
    }
  });

  return uniqueUsers;
};

const notifyNearbyUsers = async (event) => {
  if (event.visibility !== "PUBLIC") return;

  const users = await getNearbyUsersWithFallback(event);

  const io = getIO();
  for (const user of users) {
    await sendNotification({
      userId: user._id,
      type: "NEARBY_EVENT",
      message: `New ${event.eventType} in your area: ${event.title}`,
      data: { eventId: event._id },
    });

    if (io) {
      io.to(user._id.toString()).emit("nearbyEvent", {
        title: event.title,
        city: event.city,
        date: event.dateTime,
        eventId: event._id,
      });
    }
  }
};

const notifyNearbyUsersOfUpdate = async (event) => {
  if (event.visibility !== "PUBLIC") return;

  const users = await getNearbyUsersWithFallback(event);

  const io = getIO();
  for (const user of users) {
    await sendNotification({
      userId: user._id,
      type: "EVENT_UPDATED",
      message: `Updated ${event.eventType} in your area: ${event.title}`,
      data: { eventId: event._id },
    });

    if (io) {
      io.to(user._id.toString()).emit("nearbyEvent", {
        title: event.title,
        city: event.city,
        date: event.dateTime,
        eventId: event._id,
        update: true,
      });
    }
  }
};

const getId = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value._id?.toString?.() || value.id?.toString?.() || null;
  return String(value);
};

const normalizeVisibility = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  return ["PUBLIC", "PRIVATE"].includes(normalized) ? normalized : null;
};

const buildEventPermissions = async (event, user) => {
  const permissions = {
    canEditCore: false,
    canDelete: false,
  };

  if (!user) return permissions;
  if (user.accountType === "ADMIN") {
    return {
      canEditCore: true,
      canDelete: true,
    };
  }

  const isHost = getId(event.host) === String(user.id);
  if (isHost) {
    return {
      canEditCore: true,
      canDelete: true,
    };
  }

  return permissions;
};

const sanitizeCoreUpdates = async (updates) => {
  const sanitized = {};

  CORE_EVENT_FIELDS.forEach((field) => {
    if (updates[field] !== undefined) sanitized[field] = updates[field];
  });

  if (sanitized.visibility !== undefined) {
    const visibility = normalizeVisibility(sanitized.visibility);
    if (!visibility) {
      return { error: "visibility must be PUBLIC or PRIVATE" };
    }
    sanitized.visibility = visibility;
  }

  if (sanitized.city !== undefined) {
    const normalizedCity = String(sanitized.city || "").trim().toLowerCase();
    if (!normalizedCity) return { error: "city is required" };
    sanitized.city = normalizedCity;
  }

  if (sanitized.location !== undefined && !isValidPoint(sanitized.location)) {
    return { error: "location must be a valid GeoJSON Point" };
  }

  if (sanitized.artist !== undefined) {
    if (!sanitized.artist) {
      sanitized.artist = null;
    } else {
      const artist = await Artist.findById(sanitized.artist);
      if (!artist) return { error: "Artist not found" };
      sanitized.artist = artist._id;
    }
  }

  if (sanitized.dateTime !== undefined && !sanitized.dateTime) {
    return { error: "dateTime is required" };
  }

  return { sanitized };
};

const populateEventFeed = (events) =>
  Event.populate(events, [
    {
      path: "artist",
      select: "artistType groupName user",
      populate: { path: "user", select: "firstName lastName image city" },
    },
    {
      path: "host",
      select: "firstName lastName city",
    },
  ]);

const notifyEventUpdated = async (event, actorId, changedFields) => {
  const recipients = [];
  if (event.artist) {
    const artistProfile = await Artist.findById(getId(event.artist)).select("user");
    if (artistProfile?.user) recipients.push(String(artistProfile.user));
  }
  const uniqueRecipients = [...new Set(recipients.filter(Boolean))].filter((id) => id !== String(actorId));

  await Promise.all(
    uniqueRecipients.map((recipientId) =>
      sendNotification({
        userId: recipientId,
        type: "EVENT_UPDATED",
        message: `${event.title} was updated`,
        data: { eventId: event._id, changedFields },
      }).catch(() => null)
    )
  );
};

exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      eventType,
      god,
      city,
      address,
      dateTime,
      location,
      visibility = "PUBLIC",
    } = req.body;
    const userId = req.user.id;
    const role = req.user.accountType;

    if (!title || !eventType || !god || !city || !dateTime || !address) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    const normalizedVisibility = String(visibility).trim().toUpperCase();
    if (!["PUBLIC", "PRIVATE"].includes(normalizedVisibility)) {
      return res.status(400).json({
        success: false,
        message: "visibility must be PUBLIC or PRIVATE",
      });
    }

    let artistId = null;
    let createdBy = "ADMIN";

    if (role === "ARTIST") {
      const artist = await Artist.findOne({ user: userId });
      if (!artist || !artist.isApproved) {
        return res.status(403).json({
          success: false,
          message: "Artist not approved",
        });
      }
      if (artist.isSuspended) {
        return res.status(403).json({
          success: false,
          message: "Artist account suspended by admin",
        });
      }
      if (!artist.isActive) {
        return res.status(403).json({
          success: false,
          message: "Your account is currently paused",
        });
      }
      artistId = artist._id;
      createdBy = "ARTIST";
    }

    if (role === "USER") {
      return res.status(403).json({
        success: false,
        message: "Only artist or admin can create event",
      });
    }

    const normalizedCity = city.trim().toLowerCase();
    let resolvedLocation = isValidPoint(location) ? location : null;

    try {
      const geocodedLocation = await geocodeAddress({
        address,
        city: normalizedCity,
      });
      if (geocodedLocation) {
        resolvedLocation = geocodedLocation;
      }
    } catch (geocodeErr) {
      console.error("Event geocoding failed:", geocodeErr.message);
    }

    if (!isValidPoint(resolvedLocation)) {
      return res.status(400).json({
        success: false,
        message: "Could not determine an exact event location from this address. Please refine the address and try again.",
      });
    }

    const event = await Event.create({
      title,
      eventType,
      god,
      city: normalizedCity,
      address,
      dateTime,
      location: resolvedLocation,
      visibility: normalizedVisibility,
      artist: artistId,
      host: userId,
      createdBy,
    });

    if (normalizedVisibility === "PUBLIC") {
      try {
        await notifyNearbyUsers(event);
      } catch (notifyErr) {
        console.error("Notify nearby users failed:", notifyErr.message);
      }
    }

    if (role === "ARTIST") {
      await Artist.findByIdAndUpdate(artistId, { $inc: { totalEvents: 1 } });
    }

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Event creation failed",
    });
  }
};

exports.getEventsByCity = async (req, res) => {
  try {
    const { city } = req.query;
    const now = new Date();

    const query = {
      visibility: "PUBLIC",
      dateTime: { $gte: now },
    };

    if (city) {
      query.city = { $regex: new RegExp(`^${city}$`, "i") };
    }

    const events = await Event.find(query)
      .sort({ dateTime: 1 })
      .populate({
        path: "artist",
        select: "artistType groupName user",
        populate: { path: "user", select: "firstName lastName image" },
      })
      .populate("host", "firstName lastName");

    return res.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch events" });
  }
};

exports.getNearbyEvents = async (req, res) => {
  try {
    const now = new Date();
    const { lat, lng, city } = req.query;
    const latText = typeof lat === "string" ? lat.trim() : String(lat ?? "").trim();
    const lngText = typeof lng === "string" ? lng.trim() : String(lng ?? "").trim();
    const hasCoords = latText !== "" && lngText !== "";
    let fallbackCity = String(city || "").trim().toLowerCase();
    let parsedLat = null;
    let parsedLng = null;

    if (hasCoords) {
      parsedLat = Number(latText);
      parsedLng = Number(lngText);
      console.log("Incoming coords:", parsedLat, parsedLng);

      if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
        return res.status(400).json({
          success: false,
          message: "lat and lng must be valid numbers",
        });
      }

      if (parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180) {
        return res.status(400).json({
          success: false,
          message: "lat/lng out of range",
        });
      }
    } else {
      console.warn("Nearby request received without coordinates; using city/global fallback");
    }

    // FIX: Always attempt reverse geocode using the actual incoming coords,
    // not the user's saved city. This ensures the fallback city matches the
    // real physical location of the request, not the profile city.
    if (!fallbackCity && hasCoords) {
      try {
        fallbackCity = String(
          (await reverseGeocodeCity({ lat: parsedLat, lng: parsedLng })) || ""
        )
          .trim()
          .toLowerCase();
      } catch (reverseErr) {
        console.warn("Reverse geocode failed for nearby fallback city:", reverseErr.message);
      }
    }

    // FIX: Only use the user's profile city as last resort when reverse
    // geocode also fails, and only if the user is authenticated.
    if (!fallbackCity && req.user?.id) {
      const currentUser = await User.findById(req.user.id).select("city");
      fallbackCity = String(currentUser?.city || "").trim().toLowerCase();
    }

    if (hasCoords) {
      try {
        const nearbyEvents = await Event.aggregate([
          {
            $geoNear: {
              near: {
                type: "Point",
                coordinates: [parsedLng, parsedLat],
              },
              distanceField: "distance",
              maxDistance: MAX_NEARBY_DISTANCE_METERS,
              spherical: true,
              query: {
                visibility: "PUBLIC",
                dateTime: { $gte: now },
              },
            },
          },
          {
            $sort: { distance: 1, dateTime: 1 },
          },
          {
            $limit: MAX_NEARBY_RESULTS,
          },
        ]);

        const populatedEvents = await populateEventFeed(nearbyEvents);
        if (populatedEvents.length > 0) {
          return res.status(200).json({
            success: true,
            source: "geo",
            count: populatedEvents.length,
            events: populatedEvents,
          });
        }

        console.warn("No nearby events found within radius");
      } catch (geoErr) {
        console.error("Nearby events geo query failed:", geoErr.message);
      }
    }

    if (fallbackCity) {
      const cityEvents = await Event.find({
        visibility: "PUBLIC",
        dateTime: { $gte: now },
        city: fallbackCity,
      })
        .sort({ dateTime: 1 })
        .limit(MAX_NEARBY_RESULTS);

      const populatedCityEvents = await populateEventFeed(cityEvents);
      const normalizedCityEvents = populatedCityEvents.map((event) => ({
        ...event.toObject(),
        distance: null,
      }));

      if (normalizedCityEvents.length > 0) {
        console.warn(`Geo results empty; returning city fallback for city=${fallbackCity}`);
        return res.status(200).json({
          success: true,
          source: "city",
          count: normalizedCityEvents.length,
          events: normalizedCityEvents,
        });
      }
    }

    console.warn("Geo/city had no matches; returning global fallback events");
    const publicEvents = await Event.find({
      visibility: "PUBLIC",
      dateTime: { $gte: now },
    })
      .sort({ dateTime: 1 })
      .limit(MAX_NEARBY_RESULTS);

    const populatedEvents = await populateEventFeed(publicEvents);
    const fallbackEvents = populatedEvents.map((event) => ({
      ...event.toObject(),
      distance: null,
    }));

    if (fallbackEvents.length === 0) {
      return res.status(200).json({
        success: true,
        source: "geo",
        count: 0,
        events: [],
        message: "No events nearby",
      });
    }

    return res.status(200).json({
      success: true,
      source: "fallback",
      count: fallbackEvents.length,
      events: fallbackEvents,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch nearby events",
    });
  }
};

exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate({
        path: "artist",
        select: "artistType groupName user",
        populate: { path: "user", select: "firstName lastName image" },
      })
      .populate("host", "firstName lastName phone");

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (event.visibility === "PRIVATE") {
      return res.status(403).json({ success: false, message: "Private event" });
    }

    return res.json({
      success: true,
      event,
      hostContactNumber: event.host?.phone || null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch event" });
  }
};

exports.getEventForEdit = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate({
        path: "artist",
        select: "artistType groupName user",
        populate: { path: "user", select: "firstName lastName image" },
      })
      .populate("host", "firstName lastName phone");

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const permissions = await buildEventPermissions(event, req.user);
    if (!permissions.canEditCore && !permissions.canDelete) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    return res.json({ success: true, event, permissions });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch event" });
  }
};

exports.getArtistEvents = async (req, res) => {
  try {
    const events = await Event.find({
      artist: req.params.artistId,
      visibility: "PUBLIC",
    }).sort({ dateTime: -1 });
    return res.json({ success: true, events });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch artist events" });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const permissions = await buildEventPermissions(event, req.user);
    if (!permissions.canEditCore) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const incoming = req.body || {};
    let updates = {};
    let changedFields = [];

    if (permissions.canEditCore) {
      const { sanitized, error } = await sanitizeCoreUpdates(incoming);
      if (error) {
        return res.status(400).json({ success: false, message: error });
      }
      updates = { ...updates, ...sanitized };
    }

    changedFields = Object.keys(updates).filter((field) => {
      const prevValue = event[field];
      const nextValue = updates[field];
      return JSON.stringify(prevValue) !== JSON.stringify(nextValue);
    });

    if (!changedFields.length) {
      return res.status(400).json({ success: false, message: "No allowed changes provided" });
    }

    Object.assign(event, updates);
    await event.save();

    try {
      await notifyEventUpdated(event, req.user.id, changedFields);
      if (event.visibility === "PUBLIC") {
        await notifyNearbyUsersOfUpdate(event);
      }
    } catch (notifyErr) {
      console.error("Event update notification failed:", notifyErr.message);
    }

    const populatedEvent = await Event.findById(event._id)
      .populate({
        path: "artist",
        select: "artistType groupName user",
        populate: { path: "user", select: "firstName lastName image" },
      })
      .populate("host", "firstName lastName phone");

    return res.json({
      success: true,
      message: "Event updated successfully",
      event: populatedEvent,
      permissions: await buildEventPermissions(event, req.user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Event update failed" });
  }
};

exports.cancelEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const permissions = await buildEventPermissions(event, req.user);
    if (!permissions.canDelete) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    await Event.findByIdAndDelete(eventId);

    if (event.visibility === "PUBLIC") {
      const users = await User.find({ city: event.city });
      for (const u of users) {
        await sendNotification({
          userId: u._id,
          type: "EVENT_CANCELLED",
          message: `${event.title} has been cancelled`,
        });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Event cancel failed" });
  }
};

