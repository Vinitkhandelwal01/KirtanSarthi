const Booking = require("../models/Booking");
const Artist = require("../models/Artist");
const Event = require("../models/Event");
const User = require("../models/User");
const RatingAndReview = require("../models/RatingAndReview");
const Notification = require("../models/Notification");

// ======================= USER DASHBOARD =======================

exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      totalBookings,
      pendingBookings,
      acceptedBookings,
      completedBookings,
      cancelledBookings,
      upcomingEvents,
      unreadNotifications,
      reviewsGiven,
    ] = await Promise.all([
      Booking.countDocuments({ user: userId }),
      Booking.countDocuments({ user: userId, status: "PENDING" }),
      Booking.countDocuments({ user: userId, status: "ACCEPTED" }),
      Booking.countDocuments({ user: userId, status: "COMPLETED" }),
      Booking.countDocuments({ user: userId, status: { $in: ["CANCELLED", "REJECTED"] } }),
      Event.countDocuments({ host: userId, dateTime: { $gte: new Date() } }),
      Notification.countDocuments({ user: userId, isRead: false }),
      RatingAndReview.countDocuments({ user: userId }),
    ]);

    // Count unique artists the user has booked
    const uniqueArtists = await Booking.distinct("artist", { user: userId });

    const recentBookings = await Booking.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate({
        path: "artist",
        select: "artistType groupName price averageRating eventTypes",
        populate: { path: "user", select: "firstName lastName image city" },
      })
      .populate("availability", "date slots");

    const upcomingEventsList = await Event.find({
      host: userId,
      dateTime: { $gte: new Date() },
    })
      .sort({ dateTime: 1 })
      .limit(5)
      .populate("artist", "artistType groupName user")

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalBookings,
          pendingBookings,
          acceptedBookings,
          completedBookings,
          cancelledBookings,
          activeBookings: pendingBookings + acceptedBookings,
          upcomingEvents,
          unreadNotifications,
          reviewsGiven,
          artistsExplored: uniqueArtists.length,
        },
        recentBookings,
        upcomingEvents: upcomingEventsList,
        notifications,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user dashboard",
    });
  }
};

// ======================= ARTIST DASHBOARD =======================

exports.getArtistDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const artist = await Artist.findOne({ user: userId });

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist profile not found",
      });
    }

    const artistId = artist._id;

    const [
      totalBookings,
      pendingBookings,
      acceptedBookings,
      completedBookings,
      cancelledBookings,
      totalEvents,
      upcomingEvents,
    ] = await Promise.all([
      Booking.countDocuments({ artist: artistId }),
      Booking.countDocuments({ artist: artistId, status: "PENDING" }),
      Booking.countDocuments({ artist: artistId, status: "ACCEPTED" }),
      Booking.countDocuments({ artist: artistId, status: "COMPLETED" }),
      Booking.countDocuments({ artist: artistId, status: { $in: ["CANCELLED", "REJECTED"] } }),
      Event.countDocuments({ artist: artistId }),
      Event.countDocuments({ artist: artistId, dateTime: { $gte: new Date() } }),
    ]);

    // Revenue from completed bookings
    const revenueResult = await Booking.aggregate([
      { $match: { artist: artist._id, status: "COMPLETED" } },
      { $group: { _id: null, totalRevenue: { $sum: "$finalPrice" } } },
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    const recentBookings = await Booking.find({ artist: artistId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "firstName lastName image city phone")
      .populate("availability", "date slots");

    const upcomingEventsList = await Event.find({
      artist: artistId,
      dateTime: { $gte: new Date() },
    })
      .sort({ dateTime: 1 })
      .limit(5)
      .populate("host", "firstName lastName phone");

    return res.status(200).json({
      success: true,
      data: {
        artistId: artist._id,
        stats: {
          totalBookings,
          pendingBookings,
          acceptedBookings,
          completedBookings,
          cancelledBookings,
          totalEvents,
          upcomingEvents,
          totalRevenue,
          averageRating: artist.averageRating,
          totalReviews: artist.totalReviews,
          isApproved: artist.isApproved,
          isSuspended: artist.isSuspended,
          isActive: artist.isActive,
          isPaused: !artist.isActive,
        },
        recentBookings,
        upcomingEvents: upcomingEventsList,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch artist dashboard",
    });
  }
};

// ======================= ADMIN DASHBOARD =======================

exports.getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      totalArtists,
      approvedArtists,
      pendingArtists,
      suspendedArtists,
      totalBookings,
      pendingBookings,
      acceptedBookings,
      completedBookings,
      cancelledBookings,
      totalEvents,
      upcomingEvents,
    ] = await Promise.all([
      User.countDocuments(),
      Artist.countDocuments(),
      Artist.countDocuments({ isApproved: true, isSuspended: false, isActive: true }),
      Artist.countDocuments({ isApproved: false, isSuspended: false }),
      Artist.countDocuments({ isSuspended: true }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "PENDING" }),
      Booking.countDocuments({ status: "ACCEPTED" }),
      Booking.countDocuments({ status: "COMPLETED" }),
      Booking.countDocuments({ status: { $in: ["CANCELLED", "REJECTED"] } }),
      Event.countDocuments(),
      Event.countDocuments({ dateTime: { $gte: new Date() } }),
    ]);

    // Platform total revenue
    const revenueResult = await Booking.aggregate([
      { $match: { status: "COMPLETED" } },
      { $group: { _id: null, totalRevenue: { $sum: "$finalPrice" } } },
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // Monthly revenue (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          status: "COMPLETED",
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$finalPrice" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Recent bookings
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: startOfMonth } });

    const monthlyRevenueThisMonth = await Booking.aggregate([
      { $match: { status: "COMPLETED", createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, revenue: { $sum: "$finalPrice" } } },
    ]);
    const revenueThisMonth = monthlyRevenueThisMonth[0]?.revenue || 0;

    const avgRatingResult = await Artist.aggregate([
      { $match: { isApproved: true, isSuspended: false, isActive: true, averageRating: { $gt: 0 } } },
      { $group: { _id: null, avg: { $avg: "$averageRating" } } },
    ]);
    const avgRating = avgRatingResult[0]?.avg
      ? Number(avgRatingResult[0].avg.toFixed(1))
      : 0;

    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "firstName lastName email")
      .populate({
        path: "artist",
        select: "artistType groupName user",
        populate: { path: "user", select: "firstName lastName" },
      });

    // Recent registrations
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("firstName lastName email accountType city createdAt");

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalArtists,
          approvedArtists,
          pendingArtists,
          suspendedArtists,
          totalBookings,
          pendingBookings,
          acceptedBookings,
          completedBookings,
          cancelledBookings,
          totalEvents,
          upcomingEvents,
          totalRevenue,
          newUsersThisMonth,
          revenueThisMonth,
          avgRating,
          pendingApprovals: pendingArtists,
          activeArtists: approvedArtists,
        },
        monthlyRevenue,
        recentBookings,
        recentUsers,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin dashboard",
    });
  }
};
