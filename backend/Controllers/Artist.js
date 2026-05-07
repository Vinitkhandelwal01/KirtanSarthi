const Artist =require("../models/Artist");
const User = require("../models/User");
const { isValidYouTubeUrl } = require("../utills/validation");
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeVideoLinks = (videoLinks) => {
    if (!Array.isArray(videoLinks)) return [];

    const cleanedLinks = videoLinks
        .map((link) => String(link || "").trim())
        .filter(Boolean);

    if (cleanedLinks.some((link) => !isValidYouTubeUrl(link))) {
        return null;
    }

    return cleanedLinks;
};

const normalizePositivePrice = (value) => {
    const numericPrice = Number(value);
    return Number.isFinite(numericPrice) && numericPrice > 0 ? numericPrice : null;
};

exports.createArtist=async(req,res)=>{
    try{
        const userId=req.user.id;
        const {artistType,groupName,membersCount,description,experienceYears,eventTypes,
            gods,price,videoLinks}=req.body;
        
        const user=await User.findById(userId);
        if(!user || user.accountType!=="ARTIST"){
            return res.status(403).json({
                success: false,
                message: "Only artist accounts can create profile",
            })
        }

        // Check artist profile already exists
        const existingArtist = await Artist.findOne({ user: userId });
        if (existingArtist) {
            return res.status(409).json({
                success: false,
                message: "Artist profile already exists",
            });
        }

        if(!artistType ||!experienceYears ||!eventTypes ||!gods || price === undefined || price === null || price === ""){
            return res.status(400).json({
            success: false,
            message: "Required fields missing",
            });
        }

        const normalizedPrice = normalizePositivePrice(price);
        if (normalizedPrice === null) {
            return res.status(400).json({
                success: false,
                message: "Price must be greater than 0",
            });
        }

        if (artistType === "GROUP" && !groupName) {
            return res.status(400).json({
                success: false,
                message: "Group name is required for group artists",
            });
        }

        const normalizedVideoLinks = normalizeVideoLinks(videoLinks);
        if (videoLinks && normalizedVideoLinks === null) {
            return res.status(400).json({
                success: false,
                message: "Only valid YouTube video URLs are allowed",
            });
        }

        const artist = await Artist.create({
            user: userId,artistType,groupName: artistType === "GROUP" ? groupName : undefined,
            membersCount: artistType === "GROUP" ? membersCount : 1,
            description,
            experienceYears,
            eventTypes,
            gods,
            price: normalizedPrice,
            videoLinks: normalizedVideoLinks,
            isApproved: false, // admin approval
        });

        return res.status(201).json({
            success: true,
            message: "Artist profile created successfully (awaiting approval)",
            artist,
        });
    }
    catch(error){
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to create artist profile",
        });
    }
}

exports.updateArtist=async(req,res)=>{
    try{
        const userId = req.user.id;
        const updates = req.body;

        const artist = await Artist.findOne({ user: userId });
        if (!artist) {
        return res.status(404).json({
            success: false,
            message: "Artist profile not found",
        });
        }

        // GROUP validation
        if (updates.artistType === "GROUP" && !updates.groupName && !artist.groupName) {
            return res.status(400).json({
                success: false,
                message: "Group name required for group artist",
            });
        }

        // Prevent admin-only fields update
        delete updates.isApproved;
        delete updates.averageRating;
        delete updates.totalReviews;
        delete updates.totalEvents;

        if (updates.videoLinks !== undefined) {
            const normalizedVideoLinks = normalizeVideoLinks(updates.videoLinks);
            if (normalizedVideoLinks === null) {
                return res.status(400).json({
                    success: false,
                    message: "Only valid YouTube video URLs are allowed",
                });
            }
            updates.videoLinks = normalizedVideoLinks;
        }

        if (updates.price !== undefined) {
            const normalizedPrice = normalizePositivePrice(updates.price);
            if (normalizedPrice === null) {
                return res.status(400).json({
                    success: false,
                    message: "Price must be greater than 0",
                });
            }
            updates.price = normalizedPrice;
        }

        const updatedArtist = await Artist.findByIdAndUpdate(artist._id,updates,{ new: true, runValidators: true, context: "query" });

        return res.status(200).json({
        success: true,
        message: "Artist profile updated successfully",
        artist: updatedArtist,
        });

    }
    catch(error){
        console.error(error);
        return res.status(500).json({
        success: false,
        message: "Failed to update artist profile",
        });
    }
}

exports.getMyArtistProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const artist = await Artist.findOne({ user: userId });
    if (!artist) {
      return res.status(404).json({
        success: false,
        message: "Artist profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      artist,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch artist profile",
    });
  }
};

exports.pauseAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const artist = await Artist.findOne({ user: userId });

    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist profile not found" });
    }

    if (!artist.isActive) {
      return res.status(400).json({ success: false, message: "Account is already paused" });
    }

    artist.isActive = false;
    await artist.save();

    return res.status(200).json({
      success: true,
      message: "Account paused successfully. You will not appear in search or receive new bookings.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to pause account" });
  }
};

exports.resumeAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const artist = await Artist.findOne({ user: userId });

    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist profile not found" });
    }

    if (artist.isActive) {
      return res.status(400).json({ success: false, message: "Account is already active" });
    }

    artist.isActive = true;
    await artist.save();

    return res.status(200).json({
      success: true,
      message: "Account resumed successfully. You are now visible in search.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to resume account" });
  }
};

exports.getArtistProfile = async (req, res) => {
  try {
    const { artistId } = req.params;

    const artist = await Artist.findById(artistId).populate("user", "firstName lastName city image");

    if (!artist || !artist.isApproved || artist.isSuspended || !artist.isActive) {
      return res.status(404).json({
        success: false,
        message: "Artist not found",
      });
    }

    return res.status(200).json({
      success: true,
      artist,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch artist profile",
    });
  }
};

exports.getAllArtists = async (req,res) => {
  try{
    const artists = await Artist.find({
      isApproved: true,
      isSuspended: false,
      isActive: true
    }).populate("user");

    return res.status(200).json({
      success: true,
      count: artists.length,
      artists,
    });
  }
  catch(error){
    return res.status(500).json({
      success: false,
      message: "Failed to fetch all artist",
    });
  }
}

exports.searchArtists = async (req, res) => {
  try {
    const { city, god, eventType, minRating, maxPrice, name, search } = req.query;
    const searchText = (name || search || "").trim();

    const artistFilter = { isApproved: true, isSuspended: false, isActive: true };

    if (god) artistFilter.gods = { $regex: new RegExp(god, "i") };
    if (eventType) {
      const spaceFlexiblePattern = escapeRegExp(eventType.trim()).replace(/\s+/g, "\\s*");
      artistFilter.eventTypes = { $regex: new RegExp(spaceFlexiblePattern, "i") };
    }
    if (minRating && !Number.isNaN(Number(minRating))) {
      artistFilter.averageRating = { $gte: Number(minRating) };
    }
    if (maxPrice && !Number.isNaN(Number(maxPrice))) {
      artistFilter.price = { $lte: Number(maxPrice) };
    }

    let artists = await Artist.find(artistFilter)
      .populate("user", "firstName lastName city image");

    // City filter (case-insensitive)
    if (city) {
      const cityRegex = new RegExp(city, "i");
      artists = artists.filter(a => a.user && cityRegex.test(a.user.city));
    }

    // Name search
    if (searchText) {
      const nameRegex = new RegExp(searchText, "i");

      artists = artists.filter(artist => {
        if (artist.artistType === "GROUP") {
          return nameRegex.test(artist.groupName);
        }

        if (artist.artistType === "SOLO" && artist.user) {
          const fullName = `${artist.user.firstName} ${artist.user.lastName}`;
          return nameRegex.test(fullName);
        }

        return false;
      });
    }

    return res.status(200).json({
      success: true,
      count: artists.length,
      artists,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Artist search failed",
    });
  }
};
