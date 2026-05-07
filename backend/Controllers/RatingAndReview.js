const Artist=require("../models/Artist");
const RatingAndReview=require("../models/RatingAndReview");
const Booking=require("../models/Booking");
const { default: mongoose } = require("mongoose");

exports.createRating = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rating, review, artistId } = req.body;

    if (!rating || !review || !artistId) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    // Check completed booking
    const completedBooking = await Booking.findOne({
      user: userId,
      artist: artistId,
      status: "COMPLETED"
    });

    if (!completedBooking) {
      return res.status(403).json({
        success: false,
        message: "You can rate only after completed booking"
      });
    }

    // Prevent multiple ratings
    const alreadyRated = await RatingAndReview.findOne({
      user: userId,
      artist: artistId
    });

    if (alreadyRated) {
      return res.status(403).json({
        success: false,
        message: "You already rated this artist"
      });
    }

    // Create rating
    const ratingReview = await RatingAndReview.create({
      user: userId,
      rating,
      review,
      artist: artistId
    });

    // Update artist summary
    const artist = await Artist.findById(artistId);
    const newTotal = artist.totalReviews + 1;
    const newAvg =
      (artist.averageRating * artist.totalReviews + rating) / newTotal;

    artist.totalReviews = newTotal;
    artist.averageRating = newAvg;
    await artist.save();

    return res.status(201).json({
      success: true,
      message: "Rating submitted successfully",
      ratingReview
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to create rating"
    });
  }
};


exports.getAverageRating = async (req, res) => {
  try {
    const { artistId } = req.params;

    const result = await RatingAndReview.aggregate([
      {
        $match: {
          artist: new mongoose.Types.ObjectId(artistId),
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    const averageRating = result.length > 0 ? result[0].averageRating : 0;

    return res.status(200).json({
      success: true,
      averageRating,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to calculate average rating",
    });
  }
};


// getAllRatingAndReview handler -> mtlb jb review likhe aate h tab view all bhi aata h to vo h
exports.getAllRatingAndReview = async (req, res) => {
  try {
    const { artistId } = req.query;
    const filter = {};
    if (artistId) {
      if (!mongoose.Types.ObjectId.isValid(artistId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid artistId",
        });
      }
      filter.artist = artistId;
    }

    const reviews = await RatingAndReview.find(filter)
      .sort({ createdAt: -1, rating: -1 })
      .populate("user", "firstName lastName image")
      .populate({
        path: "artist",
        populate: {
          path: "user",
          select: "firstName lastName",
        },
      });

    return res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
    });
  }
};

exports.getMyRatingAndReview = async (req, res) => {
  try {
    const userId = req.user.id;

    const reviews = await RatingAndReview.find({ user: userId })
      .sort({ createdAt: -1, rating: -1 })
      .populate("user", "firstName lastName image")
      .populate({
        path: "artist",
        select: "artistType groupName averageRating totalReviews user",
        populate: {
          path: "user",
          select: "firstName lastName image city",
        },
      });

    return res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your reviews",
    });
  }
};

exports.getArtistRatingAndReview = async (req,res) =>{
  try{
    const { artistId } = req.query;
    const filter = {};
    if (artistId) {
      if (!mongoose.Types.ObjectId.isValid(artistId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid artistId",
        });
      }
      filter.artist = artistId;
    }
    const reviews = await RatingAndReview.find(filter)
      .sort({ createdAt: -1, rating: -1 })
      .populate("user", "firstName lastName image");
    
    const totalReviews_avgRating = await Artist.find(artistId).select("totalReviews averageRating");
    return res.status(200).json({
      success: true,
      reviews,
      totalReviews_avgRating,
    });

  }
  catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
    });
  }
}
