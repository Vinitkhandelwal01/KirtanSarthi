const express = require("express");
const router = express.Router();
const { auth, isUser } = require("../middlewares/auth");

const {
  createRating,
  getAverageRating,
  getAllRatingAndReview,
  getMyRatingAndReview,
} = require("../Controllers/RatingAndReview");

router.post("/create", auth, isUser, createRating);
router.get("/average/:artistId", getAverageRating);
router.get("/all", getAllRatingAndReview);
router.get("/my", auth, isUser, getMyRatingAndReview);

module.exports = router;
