const express = require("express");
const router = express.Router();
const { auth, isArtist, isArtistNotSuspended } = require("../middlewares/auth");

const {
  createAvailability,
  getArtistAvailability,
  getFreeSlots,
  updateAvailability,
  markSlotBooked
} = require("../Controllers/Availability");


router.post("/create", auth, isArtist, isArtistNotSuspended, createAvailability);
router.get("/free/:artistId", auth, getFreeSlots);   // always above
router.get("/:artistId", getArtistAvailability);
router.put("/update/:availabilityId", auth, isArtist, isArtistNotSuspended, updateAvailability);
router.post("/markSlotBooked", auth, isArtist, isArtistNotSuspended, markSlotBooked);

module.exports = router;
