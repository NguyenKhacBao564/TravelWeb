const express = require("express");
const router = express.Router();
const {
    getSupportRequests,
    createSupportResponse,
} = require("../services/consultantSupportService");

// Route cho nhân viên tư vấn
router.get("/support/consultant/requests", getSupportRequests);
router.post("/support/consultant/response", createSupportResponse);

module.exports = router;