const express = require("express");
const router = express.Router();
const { getAllReviewsByTourId, getReviewById, addReview, getStatsResults } = require("../controller/ReviewController");

router.get("/:id", getAllReviewsByTourId);
router.get("/review/:id", getReviewById);
router.get("/stats/:id", getStatsResults);
router.post("/", addReview);

module.exports = router;