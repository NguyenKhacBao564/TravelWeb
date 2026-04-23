const express = require("express");
const router = express.Router();
const { getItinerary} = require("../controller/scheduleController");

// router.post("/", insertItinerary);
router.get("/:tour_id", getItinerary);

module.exports = router;

