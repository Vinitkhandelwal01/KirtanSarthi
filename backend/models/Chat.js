const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["PRIVATE", "GROUP"],
    required: true,
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  admins: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  //for grp chat
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
  },
  // for private booking chat
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
  },
  lastMessage: {
      type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model("Chat", chatSchema);
