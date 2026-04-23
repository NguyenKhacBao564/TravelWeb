const express = require("express");
const router = express.Router();
const { getRespondChat } = require("../controller/chatController");

router.post("/chatbot", getRespondChat);

module.exports = router;