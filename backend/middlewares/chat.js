const Booking = require("../models/Booking");
const Chat = require("../models/Chat");

module.exports= async (req, res, next) => {
  try {
    const chatId = req.params.chatId || req.body.chatId;

    if (!chatId) {
      return res.status(400).json({ message: "chatId missing" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const userId = req.user?.id;
    const isMember = chat.members.some((memberId) => memberId.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ message: "Not allowed in this chat" });
    }

    if (chat.type === "GROUP") {
      req.chat = chat;
      req.booking = null;
      req.chatReadOnly = false;
      return next();
    }

    const booking = await Booking.findOne({ chat: chatId }).sort({ createdAt: -1 });

    if (!booking) {
      return res.status(403).json({
        message: "Chat allowed only after booking request"
      });
    }

    if (["REJECTED", "CANCELLED"].includes(booking.status)) {
      return res.status(403).json({
        message: "Chat disabled for rejected or cancelled booking",
      });
    }

    const allowedStatuses = ["PENDING", "COUNTERED", "ACCEPTED", "COMPLETED"];
    if (!allowedStatuses.includes(booking.status)) {
      return res.status(403).json({
        message: "Chat not allowed for current booking status",
      });
    }

    req.chat = chat;
    req.booking = booking;
    req.chatReadOnly = booking.status === "COMPLETED";
    next();
  } catch (err) {
    res.status(500).json({ message: "Chat authorization failed" });
  }
};
