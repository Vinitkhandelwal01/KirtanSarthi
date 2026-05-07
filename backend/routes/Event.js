const express = require("express");
const router = express.Router();
const { auth, authOptional, isAdmin, isArtist } = require("../middlewares/auth");

const {
  createEvent,
  getEventsByCity,
  getNearbyEvents,
  getEvent,
  getEventForEdit,
  getArtistEvents,
  updateEvent,
  cancelEvent,
} = require("../Controllers/Event");

// Create Event (Admin / Artist)
router.post("/create", auth, createEvent);
router.get("/nearby", authOptional, getNearbyEvents);

// Public
router.get("/", getEventsByCity);// ?city=Jaipur
router.get("/:id/manage", auth, getEventForEdit);
router.get("/artist/:artistId", getArtistEvents);
router.get("/:id", getEvent);

// Managed actions
router.put("/update/:id", auth, updateEvent);
router.delete("/delete/:id", auth, cancelEvent);

module.exports = router;
