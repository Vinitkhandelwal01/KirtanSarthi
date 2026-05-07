const Availability = require("../models/Availability");
const Artist = require("../models/Artist");

const validateSlots = (slots = []) => {
  const slotsToCheck = slots.map((s) => ({ start: s.startTime, end: s.endTime }));

  for (let i = 0; i < slotsToCheck.length; i++) {
    const a = slotsToCheck[i];
    if (!a.start || !a.end || a.start >= a.end) {
      return "Each slot must have a valid start time before end time";
    }
    for (let j = i + 1; j < slotsToCheck.length; j++) {
      const b = slotsToCheck[j];
      if (a.start < b.end && b.start < a.end) {
        return "Time slots cannot overlap";
      }
    }
  }

  return null;
};

exports.createAvailability = async (req, res) => {
  try {
    const { date, slots } = req.body;
    const userId = req.user.id;

    // Get artist
    const artist = await Artist.findOne({ user: userId });
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist profile not found",
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

    // Validate slots don't overlap
    const slotValidationError = validateSlots(slots);
    if (slotValidationError) {
      return res.status(400).json({ success: false, message: slotValidationError });
    }

    // Upsert: update if exists, create if not
    const exists = await Availability.findOne({
      artist: artist._id,
      date: new Date(date),
    });

    let availability;
    if (exists) {
      // Build a map of existing booked slots by startTime+endTime
      const bookedMap = new Map();
      for (const s of exists.slots) {
        if (s.isBooked) bookedMap.set(`${s.startTime}-${s.endTime}`, true);
      }
      // Preserve isBooked for slots that match existing booked ones
      const preparedSlots = slots.map(s => ({
        startTime: s.startTime,
        endTime: s.endTime,
        isBooked: bookedMap.has(`${s.startTime}-${s.endTime}`),
      }));
      exists.slots = preparedSlots;
      await exists.save();
      availability = exists;
    } else {
      const preparedSlots = slots.map(s => ({
        startTime: s.startTime,
        endTime: s.endTime,
        isBooked: false,
      }));
      availability = await Availability.create({
        artist: artist._id,
        date,
        slots: preparedSlots,
      });
    }

    return res.status(201).json({
      success: true,
      availability,
      message: "Availability created successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to create availability",
    });
  }
};

exports.getArtistAvailability = async (req, res) => {
  try {
    const { artistId } = req.params;

    const availability = await Availability.find({ artist: artistId });

    return res.status(200).json({
      success: true,
      availability,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch availability",
    });
  }
};

exports.getFreeSlots = async (req, res) => {
  const { artistId } = req.params;
  const { date } = req.query;

  const availability = await Availability.findOne({
    artist: artistId,
    date: new Date(date)
  });

  if (!availability) {
    return res.json({ availabilityId: null, slots: [] });
  }

  const freeSlots = availability.slots
    .map((s, i) => ({ ...s.toObject(), slotIndex: i }))
    .filter(s => !s.isBooked);

  res.json({ availabilityId: availability._id, slots: freeSlots });
};

exports.markSlotBooked = async (req, res) => {
  try {
    const availabilityId = req.body.availabilityId;
    const slotIndex = Number(req.body.slotIndex);
    const userId = req.user.id;

    const artist = await Artist.findOne({ user: userId }).select("_id");
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist profile not found",
      });
    }

    const availability = await Availability.findById(availabilityId);

    if (!availability || !availability.slots[slotIndex]) {
      return res.status(404).json({
        success: false,
        message: "Slot not found",
      });
    }

    if (availability.artist.toString() !== artist._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to modify this availability",
      });
    }

    if (availability.slots[slotIndex].isBooked) {
      return res.status(400).json({
        success: false,
        message: "Slot already booked",
      });
    }

    availability.slots[slotIndex].isBooked = true;
    await availability.save();

    return res.json({
      success: true,
      message: "Slot marked as booked",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark slot as booked",
    });
  }
};


exports.updateAvailability = async (req, res) => {
  try{
    const { availabilityId } = req.params;
    const { slots } = req.body;
    const userId = req.user.id;

    const artist = await Artist.findOne({ user: userId }).select("_id");
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist profile not found",
      });
    }

    const availability = await Availability.findById(availabilityId);
    if (!availability) {
      return res.status(404).json({
        success: false,
        message: "Availability not found",
      });
    }

    if (availability.artist.toString() !== artist._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to modify this availability",
      });
    }

    const slotValidationError = validateSlots(slots);
    if (slotValidationError) {
      return res.status(400).json({
        success: false,
        message: slotValidationError,
      });
    }

    availability.slots = slots;
    await availability.save();

    return res.status(200).json({
      success: true,
      message: "Slot updated successfully",
    });
  }
  catch(error){
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update availability",
    });
  }
};

