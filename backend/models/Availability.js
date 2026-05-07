const mongoose = require("mongoose");

// {
//   "date": "2025-01-20",
//   "slots": [
//     { "start": "10:00", "end": "13:00", "isBooked": false },
//     { "start": "16:00", "end": "19:00", "isBooked": true }
//   ]
// }

const slotSchema = new mongoose.Schema(
  {
    startTime: {
      type: String, // "10:00"
      required: true
    },
    endTime: {
      type: String, // "13:00"
      required: true
    },
    isBooked: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const availabilitySchema = new mongoose.Schema(
  {
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Artist",
      required: true
    },

    date: {
      type: Date,
      required: true
    },

    slots: {
      type: [slotSchema],
      required: true
    }
  },
  { timestamps: true }
);

availabilitySchema.index({ artist: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Availability", availabilitySchema);
