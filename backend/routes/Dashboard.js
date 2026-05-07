const express = require("express");
const router = express.Router();
const { auth, isUser, isArtist, isAdmin } = require("../middlewares/auth");

const {
  getUserDashboard,
  getArtistDashboard,
  getAdminDashboard,
} = require("../Controllers/Dashboard");

const {
  getMyPerformance,
  getArtistPerformance,
} = require("../Controllers/ArtistPerformance");

// User dashboard
router.get("/user", auth, isUser, getUserDashboard);

// Artist dashboard
router.get("/artist", auth, isArtist, getArtistDashboard);

// Artist performance (self)
router.get("/artist/performance", auth, isArtist, getMyPerformance);

// Admin dashboard
router.get("/admin", auth, isAdmin, getAdminDashboard);

// Admin: view any artist's performance
router.get("/admin/artist-performance/:artistId", auth, isAdmin, getArtistPerformance);

module.exports = router;
