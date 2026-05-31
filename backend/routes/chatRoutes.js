const express = require("express");
const router = express.Router();
const { getRespondChat, getChatHealth } = require("../controller/chatController");

router.post("/chatbot", getRespondChat);
router.get("/health", getChatHealth);

module.exports = router;
