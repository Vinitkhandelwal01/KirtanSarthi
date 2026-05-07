const express = require("express");
const router = express.Router();
const { auth } = require("../middlewares/auth");
const {  markAsRead, deleteMessage, getUserStatus } = require("../Controllers/Message");
const chat = require("../middlewares/chat");

// router.post("/send", auth, chat, sendMessage);
router.post("/read", auth, chat, markAsRead);
router.post("/delete", auth, chat, deleteMessage);
router.get("/status/:userId", auth, getUserStatus);

module.exports = router;
