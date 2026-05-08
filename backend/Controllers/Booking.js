const Booking = require("../models/Booking");
const Availability = require("../models/Availability");
const Artist = require("../models/Artist");
const Event = require("../models/Event");
const User = require("../models/User");
const RatingAndReview = require("../models/RatingAndReview");
const { sendNotification } = require("../utills/sendNotification");
const { getIO } = require("../socket/Socket");
const { geocodeAddress } = require("../utills/geocodeAddress");

const MAX_COUNTER_EXCHANGES = 3;
let hasCheckedUserGeoIndex = false;
let userGeoIndexAvailable = false;

const normalizeVisibility = (value) => {
  if (!value) return "PRIVATE";
  const normalized = String(value).trim().toUpperCase();
  return ["PUBLIC", "PRIVATE"].includes(normalized) ? normalized : null;
};

const isValidPoint = (location) =>
  location &&
  location.type === "Point" &&
  Array.isArray(location.coordinates) &&
  location.coordinates.length === 2 &&
  location.coordinates.every((c) => Number.isFinite(c));

const buildEventDateTime = (dateValue, startTime) => {
  const baseDate = new Date(dateValue);
  if (!Number.isFinite(baseDate.getTime())) return null;

  if (!startTime || typeof startTime !== "string") {
    return baseDate;
  }

  const [hoursText, minutesText] = startTime.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return baseDate;
  }

  const combined = new Date(baseDate);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
};

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

const createEventFromBooking = async (booking) => {
  try {
    if (booking.eventCreated) return null;
    if (booking.eventVisibility !== "PUBLIC") return null;
    if (!booking.eventDetails) {
      console.log("createEventFromBooking: No eventDetails on booking", booking._id);
      return null;
    }

    const details = booking.eventDetails;
    const city = details.city ? details.city.trim().toLowerCase() : undefined;

    if (!details.title || !details.eventType || !details.god || !details.address || !details.date || !city) {
      console.log("createEventFromBooking: Missing required eventDetails fields", {
        title: !!details.title, eventType: !!details.eventType, god: !!details.god,
        address: !!details.address, date: !!details.date, city: !!city,
      });
      return null;
    }

    const artist = await Artist.findById(booking.artist);
    if (!artist) return null;

    const availability = await Availability.findById(booking.availability).select("date slots");
    const selectedSlot = availability?.slots?.[booking.slotIndex];
    const eventDateTime = buildEventDateTime(details.date || availability?.date, selectedSlot?.startTime);
    if (!eventDateTime) {
      console.log("createEventFromBooking: Invalid event date for booking", booking._id);
      return null;
    }

    let location = isValidPoint(details.location) ? details.location : null;

    try {
      const geocodedLocation = await geocodeAddress({
        address: details.address,
        city,
      });
      if (geocodedLocation) {
        location = geocodedLocation;
      }
    } catch (geocodeErr) {
      console.error("Booking event geocoding failed:", geocodeErr.message);
    }

    if (!isValidPoint(location)) {
      try {
        const hostUser = await User.findById(booking.user).select("location");
        if (isValidPoint(hostUser?.location)) {
          location = hostUser.location;
          console.warn(
            `createEventFromBooking: Using host profile location fallback for booking ${booking._id}`
          );
        }
      } catch (hostLookupError) {
        console.error("createEventFromBooking: host location fallback failed:", hostLookupError.message);
      }
    }

    if (!isValidPoint(location)) {
      console.warn(
        `createEventFromBooking: Could not resolve exact location for booking event ${booking._id}; saving without geo point`
      );
      location = null;
    }

    const eventData = {
      title: details.title,
      eventType: details.eventType,
      god: details.god,
      city,
      address: details.address,
      dateTime: eventDateTime,
      visibility: "PUBLIC",
      artist: artist._id,
      host: booking.user,
      booking: booking._id,
      createdBy: "USER",
    };

    if (isValidPoint(location)) {
      eventData.location = location;
    }

    const event = await Event.create(eventData);

    booking.event = event._id;
    booking.eventCreated = true;
    await booking.save();

    try { await notifyNearbyUsers(event); } catch (e) { console.error("notifyNearbyUsers error:", e.message); }

    return event;
  } catch (err) {
    console.error("createEventFromBooking error:", err);
    return null;
  }
};

const lockSlotAtomically = async (availabilityId, slotIndex) => {
  const result = await Availability.updateOne(
    {
      _id: availabilityId,
      [`slots.${slotIndex}.isBooked`]: false,
    },
    {
      $set: { [`slots.${slotIndex}.isBooked`]: true },
    }
  );

  return result.modifiedCount === 1;
};

const unlockSlotIfNeeded = async (booking) => {
  if (!booking || booking.status !== "ACCEPTED") return;

  await Availability.updateOne(
    { _id: booking.availability },
    { $set: { [`slots.${booking.slotIndex}.isBooked`]: false } }
  );
};

const rejectCompetingBookings = async (booking) => {
  const competingBookings = await Booking.find(
    {
      availability: booking.availability,
      slotIndex: booking.slotIndex,
      _id: { $ne: booking._id },
      status: { $in: ["PENDING", "COUNTERED"] },
    }
  );

  if (!competingBookings.length) return;

  const competingIds = competingBookings.map((item) => item._id);

  await Booking.updateMany(
    { _id: { $in: competingIds } },
    {
      $set: {
        status: "REJECTED",
        notes: "Rejected automatically because slot was accepted by another booking",
      },
    }
  );

  const io = getIO();
  await Promise.all(
    competingBookings.map(async (item) => {
      await sendNotification({
        userId: item.user,
        type: "BOOKING_REJECTED",
        message: "Your booking was rejected automatically because this slot was accepted for another booking.",
      });

      if (io) {
        io.to(item.user.toString()).emit("bookingUpdate", {
          bookingId: item._id,
          status: "REJECTED",
          autoRejected: true,
        });
      }
    })
  );
};

const acceptBookingAndLockSlot = async (booking, finalPrice) => {
  const locked = await lockSlotAtomically(booking.availability, booking.slotIndex);
  if (!locked) {
    booking.status = "REJECTED";
    booking.notes = "Slot already booked";
    await booking.save();
    return { success: false };
  }

  booking.status = "ACCEPTED";
  booking.finalPrice = finalPrice;
  await booking.save();
  await rejectCompetingBookings(booking);

  return { success: true };
};

exports.createBooking = async (req, res) => {
  try {
    const { artistId, availabilityId, userBudget, eventVisibility, eventDetails } = req.body;
    const slotIndex = Number(req.body.slotIndex);
    const userId = req.user.id;

    if (!artistId || !availabilityId || Number.isNaN(slotIndex) || !userBudget) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const visibility = normalizeVisibility(eventVisibility);
    if (visibility === null) {
      return res.status(400).json({
        success: false,
        message: "eventVisibility must be PUBLIC or PRIVATE",
      });
    }

    if (!eventDetails) {
      return res.status(400).json({
        success: false,
        message: "eventDetails are required",
      });
    }

    if (eventDetails) {
      if (
        !eventDetails.title ||
        !eventDetails.eventType ||
        !eventDetails.god ||
        !eventDetails.city ||
        !eventDetails.address ||
        !eventDetails.date
      ) {
        return res.status(400).json({
          success: false,
          message:
            "eventDetails requires title, eventType, god, city, address, and date",
        });
      }
    }

    const artist = await Artist.findById(artistId);
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist not found",
      });
    }

    if (!artist.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Artist is not approved",
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
        message: "This artist is currently not accepting bookings",
      });
    }

    const availability = await Availability.findById(availabilityId);
    if (!availability || !availability.slots?.[slotIndex]) {
      return res.status(404).json({
        success: false,
        message: "Invalid availability or slot",
      });
    }

    if (availability.artist.toString() !== artist._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Selected slot does not belong to this artist",
      });
    }

    const duplicateRequest = await Booking.findOne({
      user: userId,
      availability: availabilityId,
      slotIndex,
      status: { $in: ["PENDING", "COUNTERED", "ACCEPTED"] },
    });

    if (duplicateRequest) {
      return res.status(409).json({
        success: false,
        message: "You already have an active booking request for this slot",
      });
    }

    const booking = await Booking.create({
      user: userId,
      artist: artist._id,
      availability: availability._id,
      slotIndex,
      artistPrice: artist.price,
      userBudget,
      status: "PENDING",
      eventVisibility: visibility,
      eventDetails: eventDetails
        ? {
            ...eventDetails,
            city: eventDetails.city.trim().toLowerCase(),
          }
        : undefined,
    });

    await sendNotification({
      userId: artist.user,
      type: "BOOKING_REQUEST",
      message: "You have received a new booking request",
    });

    return res.status(201).json({
      success: true,
      booking,
      message: "Booking request created successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to create booking",
    });
  }
};

exports.respondToBooking = async (req, res) => {
  try {
    const { bookingId, action, counterPrice } = req.body;
    const artistUserId = req.user.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const artist = await Artist.findById(booking.artist);
    if (!artist || artist.user.toString() !== artistUserId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
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

    if (!["PENDING", "COUNTERED"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: "Booking cannot be modified" });
    }

    if (action === "ACCEPT") {
      const finalPrice = booking.counterPrice || booking.userBudget || booking.artistPrice;
      const accepted = await acceptBookingAndLockSlot(booking, finalPrice);
      if (!accepted.success) {
        return res.status(409).json({ success: false, message: "Slot already booked" });
      }

      const event = await createEventFromBooking(booking);

      await sendNotification({
        userId: booking.user,
        type: "BOOKING_ACCEPTED",
        message: `Your booking has been accepted! Final price: Rs.${Number(finalPrice).toLocaleString("en-IN")}`,
      });

      const io = getIO();
      if (io) {
        io.to(booking.user.toString()).emit("bookingUpdate", {
          bookingId: booking._id,
          status: "ACCEPTED",
          eventId: event?._id || null,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Booking accepted",
        booking,
        eventCreated: !!event,
        eventId: event?._id || null,
      });
    }

    if (action === "COUNTER") {
      if (!counterPrice) {
        return res.status(400).json({
          success: false,
          message: "Counter price is required",
        });
      }

      if (booking.counterCount >= MAX_COUNTER_EXCHANGES) {
        return res.status(400).json({
          success: false,
          message: `Counter limit reached (max ${MAX_COUNTER_EXCHANGES})`,
        });
      }

      if (booking.counterBy === "ARTIST") {
        return res.status(400).json({
          success: false,
          message: "Wait for user response before sending another counter",
        });
      }

      booking.status = "COUNTERED";
      booking.counterPrice = counterPrice;
      booking.counterBy = "ARTIST";
      booking.counterCount += 1;
      await booking.save();

      await sendNotification({
        userId: booking.user,
        type: "BOOKING_COUNTERED",
        message: `The artist has made a counter offer of Rs.${Number(counterPrice).toLocaleString("en-IN")} for your booking.`,
      });

      const io = getIO();
      if (io) {
        io.to(booking.user.toString()).emit("bookingUpdate", {
          bookingId: booking._id,
          status: "COUNTERED",
          price: counterPrice,
          counterBy: "ARTIST",
          counterCount: booking.counterCount,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Counter offer sent",
        booking,
      });
    }

    if (action === "REJECT") {
      booking.status = "REJECTED";
      await booking.save();

      await sendNotification({
        userId: booking.user,
        type: "BOOKING_REJECTED",
        message: "Your booking request has been rejected by the artist.",
      });

      const io = getIO();
      if (io) {
        io.to(booking.user.toString()).emit("bookingUpdate", {
          bookingId: booking._id,
          status: "REJECTED",
        });
      }

      return res.status(200).json({ success: true, message: "Booking rejected", booking });
    }

    return res.status(400).json({ success: false, message: "Invalid action" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Booking response failed" });
  }
};

exports.cancelBookingByUser = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to cancel this booking",
      });
    }

    if (!["PENDING", "COUNTERED"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Only pending or countered bookings can be cancelled",
      });
    }

    const artist = await Artist.findById(booking.artist).select("user");

    await unlockSlotIfNeeded(booking);
    booking.status = "CANCELLED";
    await booking.save();

    if (artist?.user) {
      await sendNotification({
        userId: artist.user,
        type: "BOOKING_REJECTED",
        message: "A user cancelled their booking request.",
      });
    }

    const io = getIO();
    if (io && artist?.user) {
      io.to(artist.user.toString()).emit("bookingUpdate", {
        bookingId: booking._id,
        status: "CANCELLED",
        cancelledBy: "USER",
      });
    }

    return res.status(200).json({
      success: true,
      booking,
      message: "Booking cancelled successfully by User",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
    });
  }
};

exports.cancelBookingByArtist = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.id;

    const booking = await Booking.findById(bookingId).populate("artist");
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.artist.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You cannot cancel this booking",
      });
    }

    if (!["PENDING", "COUNTERED"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Artist can cancel only pending or countered bookings",
      });
    }

    await unlockSlotIfNeeded(booking);
    booking.status = "CANCELLED";
    await booking.save();

    await sendNotification({
      userId: booking.user,
      type: "BOOKING_REJECTED",
      message: "Your booking was cancelled by the artist.",
    });

    const io = getIO();
    if (io) {
      io.to(booking.user.toString()).emit("bookingUpdate", {
        bookingId: booking._id,
        status: "CANCELLED",
        cancelledBy: "ARTIST",
      });
    }

    return res.status(200).json({
      success: true,
      booking,
      message: "Booking cancelled by artist",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel booking",
    });
  }
};

exports.userRespondToCounter = async (req, res) => {
  try {
    const { bookingId, action, counterPrice } = req.body;
    const userId = req.user.id;

    if (!bookingId || !action) {
      return res.status(400).json({
        success: false,
        message: "bookingId and action are required",
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (!["PENDING", "COUNTERED"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: "Booking cannot be modified",
      });
    }

    if (action === "ACCEPT") {
      const finalPrice = booking.counterPrice || booking.userBudget || booking.artistPrice;
      const accepted = await acceptBookingAndLockSlot(booking, finalPrice);
      if (!accepted.success) {
        return res.status(409).json({
          success: false,
          message: "Slot already booked",
        });
      }

      const artist = await Artist.findById(booking.artist);
      if (artist?.user) {
        await sendNotification({
          userId: artist.user.toString(),
          type: "BOOKING_ACCEPTED",
          message: `User accepted the booking at Rs.${Number(finalPrice).toLocaleString("en-IN")}. The slot is now confirmed!`,
        });
      }

      const event = await createEventFromBooking(booking);
      return res.status(200).json({
        success: true,
        booking,
        message: "Offer accepted",
        eventCreated: !!event,
        eventId: event?._id || null,
      });
    }

    if (action === "COUNTER") {
      if (!counterPrice) {
        return res.status(400).json({
          success: false,
          message: "Counter price is required",
        });
      }

      if (booking.counterCount >= MAX_COUNTER_EXCHANGES) {
        return res.status(400).json({
          success: false,
          message: `Counter limit reached (max ${MAX_COUNTER_EXCHANGES})`,
        });
      }

      if (booking.counterBy === "USER") {
        return res.status(400).json({
          success: false,
          message: "Wait for artist response before sending another counter",
        });
      }

      booking.status = "COUNTERED";
      booking.counterPrice = counterPrice;
      booking.counterBy = "USER";
      booking.counterCount += 1;
      await booking.save();

      const artist = await Artist.findById(booking.artist);

      // Notify the artist about the user's counter offer
      if (artist?.user) {
        await sendNotification({
          userId: artist.user.toString(),
          type: "BOOKING_COUNTERED",
          message: `User sent a counter offer of Rs.${Number(counterPrice).toLocaleString("en-IN")} for your booking.`,
        });
      }

      const io = getIO();
      if (io && artist?.user) {
        io.to(artist.user.toString()).emit("bookingUpdate", {
          bookingId: booking._id,
          status: "COUNTERED",
          price: counterPrice,
          counterBy: "USER",
          counterCount: booking.counterCount,
        });
      }

      return res.status(200).json({
        success: true,
        booking,
        message: "Counter offer sent",
      });
    }

    if (action === "REJECT") {
      booking.status = "REJECTED";
      await booking.save();

      return res.status(200).json({
        success: true,
        booking,
        message: "Offer rejected",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid action",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to respond to counter",
    });
  }
};

exports.completeBooking = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user.id;

    const booking = await Booking.findById(bookingId)
      .populate("availability")
      .populate("artist");
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status !== "ACCEPTED") {
      return res.status(400).json({
        success: false,
        message: "Only accepted bookings can be completed",
      });
    }

    const bookingUserId = booking.user.toString();
    const artistUserId = booking.artist?.user?.toString();
    const isAdmin = req.user.accountType === "ADMIN";
    if (!isAdmin && bookingUserId !== userId && artistUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to complete booking",
      });
    }

    // Prevent marking complete before the event/booking date â€” admin can bypass
    if (!isAdmin) {
      const bookingDate =
        booking.eventDetails?.date || booking.availability?.date;
      if (bookingDate && new Date(bookingDate) > new Date()) {
        return res.status(400).json({
          success: false,
          message: "Booking cannot be completed before the event date",
        });
      }
    }

    booking.status = "COMPLETED";
    await booking.save();

    await Artist.findByIdAndUpdate(booking.artist._id, { $inc: { totalEvents: 1 } });

    return res.status(200).json({
      success: true,
      booking,
      message: "Booking marked as completed",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete booking",
    });
  }
};

exports.getBookings = async (req,res) => {
  try{
    const userId = req.user.id;
    const bookings = await Booking.find({ user: userId })
      .populate({
        path: "artist",
        select: "artistType groupName price averageRating",
        populate: { path: "user", select: "firstName lastName image city" },
      })
      .populate("availability", "date slots")
      .sort({ createdAt: -1 })
      .lean();

    // Mark which artists this user has already reviewed
    const reviewedArtists = await RatingAndReview.find({ user: userId }).select("artist").lean();
    const reviewedSet = new Set(reviewedArtists.map((r) => r.artist.toString()));
    for (const b of bookings) {
      b.reviewed = reviewedSet.has(b.artist?._id?.toString());
    }

    return res.status(200).json({
      success:true,
      bookings,
    });
  }
  catch(err){
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
}

exports.getArtistBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const artist = await Artist.findOne({ user: userId });
    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist profile not found" });
    }

    const bookings = await Booking.find({ artist: artist._id })
      .populate("user", "firstName lastName image city phone email")
      .populate("availability", "date slots")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      bookings,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch artist bookings",
    });
  }
}
