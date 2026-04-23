const express = require("express");
const router = express.Router();

const { getFavoriteTours, addFavoriteTour, removeFavoriteTour} = require("../controller/favoriteTourController");


router.get("/:id", getFavoriteTours);
router.post("/addFavoriteTour", addFavoriteTour);
router.delete("/delete/:id", removeFavoriteTour);

module.exports = router;