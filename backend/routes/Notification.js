const express = require("express");
const router = express.Router();
const { auth } = require("../middlewares/auth");

const {
  getMyNotifications,
  markAsRead,
} = require("../Controllers/NotificationController");

router.get("/notification", auth, getMyNotifications);
router.get("/", auth, getMyNotifications);
router.post("/read", auth, markAsRead);

module.exports = router;
