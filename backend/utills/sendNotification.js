const Notification = require("../models/Notification");
const { getIO } = require("../socket/Socket");

exports.sendNotification = async ({ userId, type, message }) => {
  // Save in DB
  const notification = await Notification.create({
    user: userId,
    type,
    message,
  });

  // Get io only when needed
  const io = getIO();

  if (io) {
    io.to(userId.toString()).emit("notification", {
      _id: notification._id,
      type,
      message,
      createdAt: notification.createdAt,
    });
  }

  return notification;
};
