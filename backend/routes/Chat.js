const express = require("express");
const router = express.Router();
const { auth } = require("../middlewares/auth");
const chat = require("../middlewares/chat");
const {
  createPrivateChat,
  createGroupChat,
  getMyChats,
  getChatMode,
  getChatMessages,
  addGroupMember,
  removeGroupMember,
  uploadChatMedia
} = require("../Controllers/Chat");


router.post("/private", auth, createPrivateChat);
router.post("/group", auth, createGroupChat);
router.get("/my", auth, getMyChats);
router.get("/:chatId/mode", auth, getChatMode);
router.get("/:chatId/messages", auth, chat, getChatMessages);
router.post("/add", auth, chat, addGroupMember);
router.post("/remove", auth,chat,removeGroupMember);
router.post("/upload", auth,chat, uploadChatMedia);

module.exports = router;
