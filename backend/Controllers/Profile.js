const User=require("../models/User");
const Artist=require("../models/Artist");
const {uploadImageToCloudinary}=require("../utills/imageUploader");
const { normalizePhone, isValidPhone, isValidCity } = require("../utills/validation");
const { reverseGeocodeCity } = require("../utills/geocodeAddress");

exports.updateProfile=async(req,res)=>{
    try{
        const {phone,city,gender} =req.body;
        const userId=req.user.id;
        if (!phone && !city && !gender) {
            return res.status(400).json({
                success: false,
                message: "Provide at least one field to update",
            });
        }
        const userDetails = await User.findById(userId);
        if (!userDetails) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if (phone !== undefined && phone !== "" && !isValidPhone(phone)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid 10-digit phone number",
            });
        }

        if (city !== undefined && !isValidCity(city)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid city name",
            });
        }

        if (phone !== undefined) userDetails.phone = phone ? normalizePhone(phone) : "";
        if (city !== undefined) userDetails.city = String(city).trim().toLowerCase();
        if (gender !== undefined) userDetails.gender = gender;

        await userDetails.save();

        return res.status(200).json({
            success:true,
            message:"Profile updated Successfully!",
            userDetails,
        });
    }
    catch(error){
        console.log(error)
        return res.status(500).json({
            success:false,
            message:"Failed to Update Section!",
        });
    }
}

exports.updateLocation = async (req, res) => {
    try {
        const { lat, lng, accuracy } = req.body;
        const userId = req.user.id;

        const latitude = Number(lat);
        const longitude = Number(lng);
        const accuracyMeters = accuracy === undefined ? null : Number(accuracy);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return res.status(400).json({
                success: false,
                message: "lat and lng must be valid numbers",
            });
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return res.status(400).json({
                success: false,
                message: "lat/lng out of range",
            });
        }

        // Desktop browsers can sometimes return very coarse network-based location.
        // Do not overwrite a user's stored coordinates when the reported accuracy is too poor.
        if (accuracyMeters !== null && (!Number.isFinite(accuracyMeters) || accuracyMeters < 0)) {
            return res.status(400).json({
                success: false,
                message: "accuracy must be a valid non-negative number",
            });
        }

        if (accuracyMeters !== null && accuracyMeters > 5000) {
            return res.status(400).json({
                success: false,
                message: "Location accuracy too low to update. Please enable precise location and try again.",
            });
        }

        console.log("Saving user location:", latitude, longitude);

        let derivedCity = null;
        try {
            derivedCity = await reverseGeocodeCity({ lat: latitude, lng: longitude });
        } catch (error) {
            console.warn("Reverse geocoding user city failed:", error.message);
        }

        const nextUpdate = {
            location: {
                type: "Point",
                coordinates: [longitude, latitude],
            },
        };

        if (derivedCity) {
            nextUpdate.city = derivedCity;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            nextUpdate,
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Location updated successfully",
            userDetails: updatedUser,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to update location",
        });
    }
}

exports.deleteAccount=async(req,res)=>{
    try{
        const userId =req.user.id;

        const userDetails = await User.findById(userId);
        if(!userDetails){
            return res.status(400).json({
                success:false,
                message:"User not found!",
            });
        }
        // delete user
        await User.findByIdAndDelete({_id:userId});

        return res.status(200).json({
            success:true,
            message:"User Account deleted Successfully!",
        });
    }
    catch(error){
        console.log(error)
        return res.status(500).json({
            success:false,
            message:"Failed to delete User!",
        });
    }
}

exports.getUserDetails=async(req,res)=>{
    try{
        const userId = req.user.id;

        //validation and get User details
        const userDetails = await User.findById(userId);

        if(!userDetails){
            return res.status(400).json({
                success:false,
                message:"User not found!",
            });
        }

        //return response
        return res.status(200).json({
            success:true,
            message:"User Details fetched Successfully!",
            userDetails,
        });
    }
    catch(error){
        console.log(error)
        return res.status(500).json({
            success:false,
            message:"Failed to fetch User Details!",
        });
    }
}

exports.updateDisplayPicture = async (req, res) => {
  try {
    if (!req.files || !req.files.displayPicture) {
        return res.status(400).json({
            success: false,
            message: "Display picture is required",
        });
    }
    const displayPicture = req.files.displayPicture
    const userId = req.user.id

    const image = await uploadImageToCloudinary(
      displayPicture,
      process.env.FOLDER_NAME,
      500,
      80
    )
    const updatedProfile = await User.findByIdAndUpdate(
      { _id: userId },
      { image: image.secure_url },
      { new: true }
    )
    res.send({
      success: true,
      message: `Image Updated successfully`,
      data: updatedProfile,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update display picture",
    })
  }
}

