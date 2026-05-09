const Artist = require("../models/Artist");
const Booking = require("../models/Booking");
const mailSender = require("../utills/mailSender");
const mongoose = require("mongoose");
const { sendNotification } = require("../utills/sendNotification");

const cancelOpenBookingsForArtist = async (artistId, reason = "Artist suspended by admin") => {
  await Booking.updateMany(
    {
      artist: artistId,
      status: { $in: ["PENDING", "COUNTERED"] },
    },
    {
      $set: {
        status: "CANCELLED",
        notes: reason,
      },
    }
  );
};

exports.getPendingArtists = async (req, res) => {
  try {
    const artists = await Artist.find({ isApproved: false, isSuspended: false })
      .populate("user", "firstName lastName email city phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: artists.length,
      artists,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending artists",
    });
  }
};

exports.reviewArtist = async (req, res) => {
  try {
    const { artistId, action, reason } = req.body;

    if (!artistId || !action) {
      return res.status(400).json({
        success: false,
        message: "artistId and action are required",
      });
    }

    const artist = await Artist.findOne({_id: new mongoose.Types.ObjectId(artistId)}).populate("user");
    // const artist = await Artist.findOne({ _id: artistId }).populate("user");

    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist not found",
      });
    }

    // ===== APPROVE =====
    if (action === "APPROVE") {
      artist.isApproved = true;
      await artist.save();

      // notify artist
      await mailSender(
        artist.user.email,
        "Artist Profile Approved 🎉",
        `
          <h3>Congratulations!</h3>
          <p>Your artist profile has been approved.</p>
          <p>You can now receive bookings on KirtanSarthi.</p>
        `
      );

      await sendNotification({
        userId: artist.user._id,
        type: "ARTIST_APPROVED",
        message: "Your artist profile has been approved",
      });


      return res.status(200).json({
        success: true,
        message: "Artist approved successfully",
      });
    }

    // ===== REJECT =====
    if (action === "REJECT") {
      artist.isApproved = false;
      artist.isSuspended = true;
      artist.suspensionReason = reason || "Profile rejected by admin";
      artist.suspendedAt = new Date();
      await artist.save();
      await cancelOpenBookingsForArtist(artist._id, "Cancelled due to artist rejection/suspension by admin");

      await mailSender(
        artist.user.email,
        "Artist Profile Rejected ❌",
        `
          <h3>Profile Rejected</h3>
          <p>Reason: ${reason || "Profile incomplete or invalid"}</p>
          <p>Please update your details and apply again.</p>
        `
      );

      await sendNotification({
        userId: artist.user._id,
        type: "ARTIST_REJECTED",
        message: "Your artist profile has been rejected",
      });
      return res.status(200).json({
        success: true,
        message: "Artist rejected, suspended, and notified",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid action",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to review artist",
    });
  }
};

exports.suspendArtist = async (req, res) => {
  try {
    const { artistId, reason } = req.body;

    if (!artistId || !reason) {
      return res.status(400).json({
        success: false,
        message: "artistId and reason are required",
      });
    }

    const artist = await Artist.findById(artistId).populate("user");
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist not found",
      });
    }

    artist.isSuspended = true;
    artist.suspensionReason = reason;
    artist.suspendedAt = new Date();
    await artist.save();

    await cancelOpenBookingsForArtist(artist._id, "Cancelled due to artist suspension by admin");

    if (artist.user?._id) {
      await sendNotification({
        userId: artist.user._id,
        type: "ARTIST_REJECTED",
        message: `Your artist account has been suspended. Reason: ${reason}`,
      });
    }

    if (artist.user?.email) {
      // send email in background so HTTP response isn't blocked by mail network latency
      mailSender(
        artist.user.email,
        "Artist Account Suspended ⚠️",
        `
          <h3>Account Suspended</h3>
          <p>Your artist account on KirtanSarthi has been suspended.</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>If you believe this is a mistake, please contact our support team at <a href="mailto:info@KirtanSarthi.com">info@KirtanSarthi.com</a>. We are here to help!.</p>
        `
      )
        .then((info) => console.log("suspend email sent", info && info.messageId))
        .catch((err) => console.error("suspend email error:", err && err.message));
    }

    return res.status(200).json({
      success: true,
      message: "Artist suspended successfully",
      artist,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to suspend artist",
    });
  }
};

exports.reactivateArtist = async (req, res) => {
  try {
    const { artistId } = req.body;

    if (!artistId) {
      return res.status(400).json({
        success: false,
        message: "artistId is required",
      });
    }

    const artist = await Artist.findById(artistId).populate("user");
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist not found",
      });
    }

    artist.isSuspended = false;
    artist.suspensionReason = null;
    artist.suspendedAt = null;
    await artist.save();

    if (artist.user?._id) {
      await sendNotification({
        userId: artist.user._id,
        type: "ARTIST_APPROVED",
        message: "Your artist account has been reactivated. You can now receive bookings again.",
      });
    }

    if (artist.user?.email) {
      mailSender(
        artist.user.email,
        "Artist Account Reactivated 🎉",
        `
          <h3>Account Reactivated!</h3>
          <p>Your artist account on KirtanSarthi has been reactivated.</p>
          <p>You can now receive bookings again. Welcome back!</p>
        `
      );
    }

    return res.status(200).json({
      success: true,
      message: "Artist reactivated successfully",
      artist,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to reactivate artist",
    });
  }
};
