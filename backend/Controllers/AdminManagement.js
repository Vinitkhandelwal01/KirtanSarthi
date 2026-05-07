const User = require("../models/User");
const Artist = require("../models/Artist");
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const RatingAndReview = require("../models/RatingAndReview");
const Notification = require("../models/Notification");
const { sendNotification } = require("../utills/sendNotification");

// ======================= USER MANAGEMENT =======================

exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, accountType, city } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {};
    if (accountType) filter.accountType = accountType.toUpperCase();
    if (city) filter.city = { $regex: new RegExp(city, "i") };
    if (search) {
      filter.$or = [
        { firstName: { $regex: new RegExp(search, "i") } },
        { lastName: { $regex: new RegExp(search, "i") } },
        { email: { $regex: new RegExp(search, "i") } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      users,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // If user is an artist, fetch artist profile too
    let artistProfile = null;
    if (user.accountType === "ARTIST") {
      artistProfile = await Artist.findOne({ user: userId });
    }

    // Get user booking stats
    const bookingStats = await Booking.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    return res.status(200).json({
      success: true,
      user,
      artistProfile,
      bookingStats,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.accountType === "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Cannot suspend admin accounts",
      });
    }

    if (user.isSuspended) {
      return res.status(400).json({
        success: false,
        message: "User is already suspended",
      });
    }

    const { reason } = req.body;

    // If artist, suspend artist profile and cancel open bookings
    if (user.accountType === "ARTIST") {
      const artist = await Artist.findOne({ user: userId });
      if (artist) {
        await Booking.updateMany(
          { artist: artist._id, status: { $in: ["PENDING", "COUNTERED"] } },
          { $set: { status: "CANCELLED", notes: "Cancelled: user account suspended by admin" } }
        );
        artist.isSuspended = true;
        artist.suspensionReason = reason || "User account suspended by admin";
        artist.suspendedAt = new Date();
        await artist.save();
      }
    } else {
      // Cancel user's open bookings
      await Booking.updateMany(
        { user: userId, status: { $in: ["PENDING", "COUNTERED"] } },
        { $set: { status: "CANCELLED", notes: "Cancelled: user account suspended by admin" } }
      );
    }

    user.isSuspended = true;
    user.suspensionReason = reason || "Account suspended by admin";
    user.suspendedAt = new Date();
    await user.save();

    await sendNotification({
      userId: user._id,
      type: "ARTIST_REJECTED",
      message: `Your account has been suspended. Reason: ${reason || "Account suspended by admin"}`,
    });

    return res.status(200).json({
      success: true,
      message: "User suspended successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to suspend user",
    });
  }
};

// ======================= ARTIST MANAGEMENT =======================

exports.getAllArtists = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {};
    if (status === "approved") {
      filter.isApproved = true;
      filter.isSuspended = false;
      filter.isActive = true;
    } else if (status === "paused") {
      filter.isApproved = true;
      filter.isSuspended = false;
      filter.isActive = false;
    } else if (status === "pending") {
      filter.isApproved = false;
      filter.isSuspended = false;
    } else if (status === "suspended") {
      filter.isSuspended = true;
    }

    let artists = await Artist.find(filter)
      .populate("user", "firstName lastName email city phone image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Apply search filter on populated user fields
    if (search) {
      const searchRegex = new RegExp(search, "i");
      artists = artists.filter(
        (a) =>
          a.user &&
          (searchRegex.test(a.user.firstName) ||
            searchRegex.test(a.user.lastName) ||
            searchRegex.test(a.user.email) ||
            searchRegex.test(a.groupName))
      );
    }

    const total = await Artist.countDocuments(filter);

    return res.status(200).json({
      success: true,
      count: artists.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      artists,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch artists",
    });
  }
};

// ======================= BOOKING MANAGEMENT =======================

exports.getAllBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {};
    if (status) filter.status = status.toUpperCase();

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("user", "firstName lastName email city")
        .populate({
          path: "artist",
          select: "artistType groupName price user",
          populate: { path: "user", select: "firstName lastName" },
        })
        .populate("availability", "date slots"),
      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      bookings,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId)
      .populate("user", "firstName lastName email city phone")
      .populate({
        path: "artist",
        select: "artistType groupName price eventTypes gods user averageRating",
        populate: { path: "user", select: "firstName lastName email phone" },
      })
      .populate("availability", "date slots")
      .populate("event");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch booking",
    });
  }
};

// ======================= EVENT MANAGEMENT =======================

exports.getAllEvents = async (req, res) => {
  try {
    const { page = 1, limit = 20, city, visibility, upcoming } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {};
    if (city) filter.city = { $regex: new RegExp(city, "i") };
    if (visibility) filter.visibility = visibility.toUpperCase();
    if (upcoming === "true") filter.dateTime = { $gte: new Date() };

    const [events, total] = await Promise.all([
      Event.find(filter)
        .sort({ dateTime: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("host", "firstName lastName email")
        .populate({
          path: "artist",
          select: "artistType groupName user",
          populate: { path: "user", select: "firstName lastName" },
        }),
      Event.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: events.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      events,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch events",
    });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    await Event.findByIdAndDelete(eventId);

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete event",
    });
  }
};

// ======================= REVIEW MANAGEMENT =======================

exports.getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, artistId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {};
    if (artistId) filter.artist = artistId;

    const [reviews, total] = await Promise.all([
      RatingAndReview.find(filter)
        .sort({ _id: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("user", "firstName lastName image")
        .populate({
          path: "artist",
          select: "artistType groupName user",
          populate: { path: "user", select: "firstName lastName" },
        }),
      RatingAndReview.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      reviews,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
    });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await RatingAndReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    // Recalculate artist rating
    const artist = await Artist.findById(review.artist);
    if (artist && artist.totalReviews > 1) {
      const newTotal = artist.totalReviews - 1;
      const newAvg =
        (artist.averageRating * artist.totalReviews - review.rating) / newTotal;
      artist.totalReviews = newTotal;
      artist.averageRating = newAvg;
      await artist.save();
    } else if (artist) {
      artist.totalReviews = 0;
      artist.averageRating = 0;
      await artist.save();
    }

    await RatingAndReview.findByIdAndDelete(reviewId);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete review",
    });
  }
};

// ======================= PLATFORM ANALYTICS =======================

exports.getPlatformAnalytics = async (req, res) => {
  try {
    // User growth (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [userGrowth, bookingTrends, topArtists, topCities, eventTypeStats] =
      await Promise.all([
        // Monthly user registrations
        User.aggregate([
          { $match: { createdAt: { $gte: twelveMonthsAgo } } },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
                accountType: "$accountType",
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),

        // Monthly booking trends
        Booking.aggregate([
          { $match: { createdAt: { $gte: twelveMonthsAgo } } },
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
        ]),

        // Top artists by completed bookings and revenue
        Booking.aggregate([
          { $match: { status: "COMPLETED" } },
          {
            $group: {
              _id: "$artist",
              completedBookings: { $sum: 1 },
              totalRevenue: { $sum: "$finalPrice" },
            },
          },
          { $sort: { completedBookings: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "artists",
              localField: "_id",
              foreignField: "_id",
              as: "artist",
            },
          },
          { $unwind: "$artist" },
          {
            $lookup: {
              from: "users",
              localField: "artist.user",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: "$user" },
          {
            $project: {
              completedBookings: 1,
              totalRevenue: 1,
              "artist.artistType": 1,
              "artist.groupName": 1,
              "artist.averageRating": 1,
              "artist.totalReviews": 1,
              "user.firstName": 1,
              "user.lastName": 1,
              "user.city": 1,
            },
          },
        ]),

        // Top cities by bookings
        Booking.aggregate([
          {
            $match: {
              "eventDetails.city": { $exists: true, $ne: null },
            },
          },
          {
            $group: {
              _id: "$eventDetails.city",
              totalBookings: { $sum: 1 },
              completedBookings: {
                $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
              },
              totalRevenue: {
                $sum: {
                  $cond: [{ $eq: ["$status", "COMPLETED"] }, "$finalPrice", 0],
                },
              },
            },
          },
          { $sort: { totalBookings: -1 } },
          { $limit: 10 },
        ]),

        // Event type statistics
        Event.aggregate([
          {
            $group: {
              _id: "$eventType",
              count: { $sum: 1 },
              publicCount: {
                $sum: { $cond: [{ $eq: ["$visibility", "PUBLIC"] }, 1, 0] },
              },
              privateCount: {
                $sum: { $cond: [{ $eq: ["$visibility", "PRIVATE"] }, 1, 0] },
              },
            },
          },
          { $sort: { count: -1 } },
        ]),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        userGrowth,
        bookingTrends,
        topArtists,
        topCities,
        eventTypeStats,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch platform analytics",
    });
  }
};
