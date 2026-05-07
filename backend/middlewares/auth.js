const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../models/User");
const Artist = require("../models/Artist");

//auth
exports.auth = async (req,res,next) => {
    try{
        const authHeader = req.headers.authorization;
        const bearerToken =
            authHeader && authHeader.startsWith("Bearer ")
                ? authHeader.split(" ")[1]
                : null;
        const cookieToken = req.cookies?.token || null;
        const token = bearerToken || cookieToken;

        // if token missing, then return response
        if(!token) {
            return res.status(403).json({
                success:false,
                message:"Token is missing",
            });
        }

        // verify the token
        try{
            const decode = jwt.verify(token,process.env.JWT_SECRET); // returns the decoded payload of the token. // here decode is object
            // console.log(decode);
            
            req.user = decode; // req k andar user object m is decode payload ko dal de
            // console.log("req.user (after decode):", req.user);
        } catch(error){
            return res.status(401).json({
                success:false,
                message:"Token is invalid"
            });
        }
        next(); // for going to next middleware

    } catch(error) {
        return res.status(401).json({
            success:false,
            message:"Something went wrong"
        });
    }
}

exports.authOptional = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const bearerToken =
            authHeader && authHeader.startsWith("Bearer ")
                ? authHeader.split(" ")[1]
                : null;
        const cookieToken = req.cookies?.token || null;
        const token = bearerToken || cookieToken;
        if (!token) return next();

        try {
            const decode = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decode;
        } catch (error) {
            // Optional auth: ignore invalid token and continue as guest.
        }

        return next();
    } catch (error) {
        return next();
    }
}

// is middleware -- to mujhe role s pta lgega ki user student h ya nhi
exports.isUser = async (req,res,next) => {
    try{
        if(req.user.accountType !=="USER"){
            return res.status(401).json({
                success:false,
                message:"This is a protected route for User"
            });
        }
        next();

    } catch(error){
        return res.status(401).json({
            success:false,
            message:"User role is not matching"
        });
    }
}

// isAdmin middleware -- to mujhe role s pta lgega ki user Admin h ya nhi
exports.isAdmin = (req,res,next) => {
    try{
        if(req.user.accountType !=="ADMIN"){
            return res.status(401).json({
                success:false,
                message:"This is a protected route for Admin"
            });
        }
        next();

    } catch(error){
        return res.status(401).json({
            success:false,
            message:"User role is not matching"
        });
    }
}

// isInstructor
exports.isArtist = (req,res,next) => {
    try{
        if(req.user.accountType !=="ARTIST"){
            return res.status(401).json({
                success:false,
                message:"This is a protected route for Artist"
            });
        }
        next();

    } catch(error){
        return res.status(401).json({
            success:false,
            message:"User role is not matching"
        });
    }
}

exports.isArtistNotSuspended = async (req, res, next) => {
    try {
        if (req.user.accountType !== "ARTIST") {
            return res.status(401).json({
                success: false,
                message: "This is a protected route for Artist",
            });
        }

        const artist = await Artist.findOne({ user: req.user.id });
        if (!artist) {
            return res.status(404).json({
                success: false,
                message: "Artist profile not found",
            });
        }

        if (artist.isSuspended) {
            return res.status(403).json({
                success: false,
                message: "Artist account suspended by admin",
            });
        }

        req.artistProfile = artist;
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Artist suspension check failed",
        });
    }
}

exports.isActiveArtist = async (req, res, next) => {
    try {
        if (req.user.accountType !== "ARTIST") {
            return res.status(401).json({
                success: false,
                message: "This is a protected route for Artist",
            });
        }

        const artist = req.artistProfile || await Artist.findOne({ user: req.user.id });
        if (!artist) {
            return res.status(404).json({
                success: false,
                message: "Artist profile not found",
            });
        }

        if (artist.isSuspended) {
            return res.status(403).json({
                success: false,
                message: "Artist account suspended by admin",
            });
        }

        if (!artist.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account is currently paused",
            });
        }

        req.artistProfile = artist;
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Artist active check failed",
        });
    }
}
