const express = require("express");
const router = express.Router();
const { getRespondChat, getChatHealth, getChatLogs, getChatInsights } = require("../controller/chatController");

router.post("/chatbot", getRespondChat);
router.get("/health", getChatHealth);
router.get("/logs", getChatLogs);
router.get("/insights", getChatInsights);

module.exports = router;
