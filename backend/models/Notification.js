const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "BOOKING_REQUEST",
        "BOOKING_ACCEPTED",
        "BOOKING_REJECTED",
        "BOOKING_COUNTERED",
        "ARTIST_APPROVED",
        "ARTIST_REJECTED",
        "NEARBY_EVENT",
        "EVENT_UPDATED",
        "EVENT_CANCELLED",
        "MEMBER_ADDED",
        "MEMBER_REMOVED",
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
