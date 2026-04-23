const express = require("express");
const router = express.Router();
const { getTourPrice, getAllTourPrice, addTourPrice } = require("../controller/tourPriceController");


router.get("/:id", getTourPrice);
router.get("/", getAllTourPrice);
router.post("/", addTourPrice);
module.exports = router;