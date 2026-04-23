const express = require("express");
const router = express.Router();

const { getHistoryBooking, getHistoryBookingById } = require("../controller/historyBookingController");

router.get("/history", getHistoryBooking);
router.get("/historyDetail/:id", getHistoryBookingById);

module.exports = router;
