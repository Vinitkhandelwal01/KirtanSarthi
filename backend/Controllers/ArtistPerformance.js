const Booking = require("../models/Booking");
const Artist = require("../models/Artist");
const Event = require("../models/Event");
const RatingAndReview = require("../models/RatingAndReview");
const mongoose = require("mongoose");

// Get artist performance overview (for the artist themselves)
exports.getMyPerformance = async (req, res) => {
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

    // Booking stats
    const bookingStats = await Booking.aggregate([
      { $match: { artist: artistId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {};
    bookingStats.forEach((s) => {
      stats[s._id] = s.count;
    });

    const totalBookings = Object.values(stats).reduce((a, b) => a + b, 0);
    const completionRate =
      totalBookings > 0
        ? (((stats.COMPLETED || 0) / totalBookings) * 100).toFixed(1)
        : 0;

    // Revenue from completed bookings
    const revenueResult = await Booking.aggregate([
      { $match: { artist: artistId, status: "COMPLETED" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$finalPrice" },
          avgRevenue: { $avg: "$finalPrice" },
          maxRevenue: { $max: "$finalPrice" },
          minRevenue: { $min: "$finalPrice" },
        },
      },
    ]);

    const revenue = revenueResult[0] || {
      totalRevenue: 0,
      avgRevenue: 0,
      maxRevenue: 0,
      minRevenue: 0,
    };

    // Monthly revenue (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          artist: artistId,
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

    // Monthly bookings trend (last 12 months - all statuses)
    const monthlyBookings = await Booking.aggregate([
      {
        $match: {
          artist: artistId,
          createdAt: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Event type breakdown
    const eventTypeBreakdown = await Booking.aggregate([
      {
        $match: {
          artist: artistId,
          status: "COMPLETED",
          "eventDetails.eventType": { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$eventDetails.eventType",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$finalPrice" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // City-wise breakdown
    const cityBreakdown = await Booking.aggregate([
      {
        $match: {
          artist: artistId,
          status: "COMPLETED",
          "eventDetails.city": { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$eventDetails.city",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$finalPrice" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Recent reviews
    const recentReviews = await RatingAndReview.find({ artist: artistId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .populate("user", "firstName lastName image");

    // Rating distribution
    const ratingDistribution = await RatingAndReview.aggregate([
      { $match: { artist: artistId } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Monthly average ratings (last 12 months)
    // Use $addFields to derive a date from _id for reviews without createdAt
    const monthlyRatings = await RatingAndReview.aggregate([
      { $match: { artist: artistId } },
      {
        $addFields: {
          reviewDate: {
            $ifNull: ["$createdAt", { $toDate: "$_id" }],
          },
        },
      },
      { $match: { reviewDate: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$reviewDate" },
            month: { $month: "$reviewDate" },
          },
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        bookingStats: {
          total: totalBookings,
          pending: stats.PENDING || 0,
          countered: stats.COUNTERED || 0,
          accepted: stats.ACCEPTED || 0,
          completed: stats.COMPLETED || 0,
          rejected: stats.REJECTED || 0,
          cancelled: stats.CANCELLED || 0,
          completionRate: Number(completionRate),
        },
        revenue: {
          total: revenue.totalRevenue,
          average: Math.round(revenue.avgRevenue),
          highest: revenue.maxRevenue,
          lowest: revenue.minRevenue,
        },
        monthlyRevenue,
        monthlyBookings,
        monthlyRatings,
        eventTypeBreakdown,
        cityBreakdown,
        ratings: {
          average: artist.averageRating,
          total: artist.totalReviews,
          distribution: ratingDistribution,
        },
        recentReviews,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch artist performance",
    });
  }
};

// Get specific artist performance (for admin)
exports.getArtistPerformance = async (req, res) => {
  try {
    const { artistId } = req.params;

    const artist = await Artist.findById(artistId).populate(
      "user",
      "firstName lastName email city phone image"
    );

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist not found",
      });
    }

    // Booking stats
    const bookingStats = await Booking.aggregate([
      { $match: { artist: artist._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {};
    bookingStats.forEach((s) => {
      stats[s._id] = s.count;
    });

    const totalBookings = Object.values(stats).reduce((a, b) => a + b, 0);
    const completionRate =
      totalBookings > 0
        ? (((stats.COMPLETED || 0) / totalBookings) * 100).toFixed(1)
        : 0;

    // Revenue
    const revenueResult = await Booking.aggregate([
      { $match: { artist: artist._id, status: "COMPLETED" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$finalPrice" },
          avgRevenue: { $avg: "$finalPrice" },
        },
      },
    ]);

    const revenue = revenueResult[0] || { totalRevenue: 0, avgRevenue: 0 };

    // Monthly revenue (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          artist: artist._id,
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

    // Rating distribution
    const ratingDistribution = await RatingAndReview.aggregate([
      { $match: { artist: artist._id } },
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Recent reviews
    const recentReviews = await RatingAndReview.find({ artist: artist._id })
      .sort({ _id: -1 })
      .limit(10)
      .populate("user", "firstName lastName image");

    // Event type breakdown
    const eventTypeBreakdown = await Booking.aggregate([
      {
        $match: {
          artist: artist._id,
          status: "COMPLETED",
          "eventDetails.eventType": { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$eventDetails.eventType",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$finalPrice" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        artist: {
          _id: artist._id,
          user: artist.user,
          artistType: artist.artistType,
          groupName: artist.groupName,
          price: artist.price,
          eventTypes: artist.eventTypes,
          gods: artist.gods,
          experienceYears: artist.experienceYears,
          isApproved: artist.isApproved,
          isSuspended: artist.isSuspended,
        },
        bookingStats: {
          total: totalBookings,
          pending: stats.PENDING || 0,
          accepted: stats.ACCEPTED || 0,
          completed: stats.COMPLETED || 0,
          rejected: stats.REJECTED || 0,
          cancelled: stats.CANCELLED || 0,
          completionRate: Number(completionRate),
        },
        revenue: {
          total: revenue.totalRevenue,
          average: Math.round(revenue.avgRevenue),
        },
        monthlyRevenue,
        ratings: {
          average: artist.averageRating,
          total: artist.totalReviews,
          distribution: ratingDistribution,
        },
        recentReviews,
        eventTypeBreakdown,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch artist performance",
    });
  }
};
