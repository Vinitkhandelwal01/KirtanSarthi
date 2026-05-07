// Import the required modules
const express = require("express")
const router = express.Router()
const { auth, isUser } = require("../middlewares/auth");
const aiRateLimit = require("../middlewares/aiRateLimit");

const {aiChat} = require("../Controllers/aiController");

router.post("/chat", auth, isUser, aiRateLimit, aiChat);

module.exports = router
