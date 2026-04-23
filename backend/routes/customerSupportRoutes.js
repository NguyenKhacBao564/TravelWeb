const express = require("express");
const router = express.Router();
const { createSupportRequest } = require("../services/customerSupportService");

// Route để gửi yêu cầu hỗ trợ
router.post("/support/request", createSupportRequest);

module.exports = router;