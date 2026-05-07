const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    eventType: {
      type: String, // Kirtan / Bhajan / Jagran / Ram Katha
      required: true,
    },
    god: {
      type: String, // Krishna / Ram / Mata etc
    },
    city: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    dateTime: {
      type: Date,
      required: true,
    },
    visibility: {
      type: String,
      enum: ["PUBLIC", "PRIVATE"],
      default: "PUBLIC",
      index: true,
    },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
    },
    groupChat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    createdBy: {
      type: String,
      enum: ["ARTIST", "ADMIN", "USER"],
      required: true,
    },
    artistNotes: {
      type: String,
      default: "",
      trim: true,
    },
    performanceRequirements: {
      type: String,
      default: "",
      trim: true,
    },
    contactPreference: {
      type: String,
      default: "",
      trim: true,
    },
    artistStatus: {
      type: String,
      enum: ["CONFIRMED", "NEEDS_RESCHEDULE", "CANNOT_ATTEND"],
      default: "CONFIRMED",
    },
    pendingLocationChange: {
      city: { type: String, trim: true },
      address: { type: String, trim: true },
      location: {
        type: {
          type: String,
          enum: ["Point"],
        },
        coordinates: {
          type: [Number],
        },
      },
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      requestedAt: {
        type: Date,
      },
      status: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED"],
        default: "PENDING",
      },
    },
  },
  { timestamps: true }
);

eventSchema.index({ location: "2dsphere" });
eventSchema.index({ visibility: 1, dateTime: 1 });
module.exports = mongoose.model("Event", eventSchema);
