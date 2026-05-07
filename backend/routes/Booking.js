const express = require("express");
const router = express.Router();
const { auth, isUser, isArtist, isArtistNotSuspended } = require("../middlewares/auth");

const {
  createBooking,
  respondToBooking,
  cancelBookingByUser,
  cancelBookingByArtist,
  userRespondToCounter,
  completeBooking,
  getBookings,
  getArtistBookings
} = require("../Controllers/Booking");


router.post("/create", auth, isUser, createBooking);
router.get("/my", auth, isUser, getBookings);
router.get("/artist", auth, isArtist, getArtistBookings);
router.post("/respond", auth, isArtist, isArtistNotSuspended, respondToBooking);
router.post("/cancel/user", auth, isUser, cancelBookingByUser);
router.post("/cancel/artist", auth, isArtist, cancelBookingByArtist);
router.post("/counter", auth, isUser, userRespondToCounter);
router.post("/complete", auth, completeBooking);

module.exports = router;
