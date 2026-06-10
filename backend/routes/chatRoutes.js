const express = require("express");
const router = express.Router();
const { authMiddleware, restrictTo } = require("../middlewares/authMiddlewares");
const { requestIdMiddleware } = require("../middlewares/requestIdMiddleware");
const {
  getRespondChat,
  getChatHealth,
  getChatLogs,
  getChatInsights,
} = require("../controller/chatController");

router.use(requestIdMiddleware);

router.post("/chatbot", getRespondChat);
router.get("/health", getChatHealth);
router.get("/logs", authMiddleware, restrictTo("Admin"), getChatLogs);
router.get("/insights", authMiddleware, restrictTo("Admin"), getChatInsights);

module.exports = router;
