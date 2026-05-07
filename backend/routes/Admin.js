const express=require("express");
const router=express.Router();
const { auth,isAdmin } = require("../middlewares/auth");
const {
    getPendingArtists,
    reviewArtist,
    suspendArtist,
    reactivateArtist,
} = require("../Controllers/Admin");

const {
    getAllUsers,
    getUserById,
    deleteUser,
    getAllArtists,
    getAllBookings,
    getBookingById,
    getAllEvents,
    deleteEvent,
    getAllReviews,
    deleteReview,
    getPlatformAnalytics,
} = require("../Controllers/AdminManagement");

// Existing artist approval routes
router.get("/getartist", auth, isAdmin, getPendingArtists);
router.put("/reviewartist", auth, isAdmin, reviewArtist);
router.post("/suspend-artist", auth, isAdmin, suspendArtist);
router.post("/reactivate-artist", auth, isAdmin, reactivateArtist);

// User management
router.get("/users", auth, isAdmin, getAllUsers);
router.get("/users/:userId", auth, isAdmin, getUserById);
router.delete("/users/:userId", auth, isAdmin, deleteUser);

// Artist management (all statuses)
router.get("/artists", auth, isAdmin, getAllArtists);

// Booking management
router.get("/bookings", auth, isAdmin, getAllBookings);
router.get("/bookings/:bookingId", auth, isAdmin, getBookingById);

// Event management
router.get("/events", auth, isAdmin, getAllEvents);
router.delete("/events/:eventId", auth, isAdmin, deleteEvent);

// Review management
router.get("/reviews", auth, isAdmin, getAllReviews);
router.delete("/reviews/:reviewId", auth, isAdmin, deleteReview);

// Platform analytics
router.get("/analytics", auth, isAdmin, getPlatformAnalytics);

module.exports = router;
