const User = require("../models/User");
const OTP = require("../models/OTP");
const bcrypt = require("bcrypt");
const otpGenerator = require("otp-generator");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const mailSender = require("../utills/mailSender");
const { passwordUpdated } = require("../mail/templates/passwordUpdate")
const { normalizeEmail, isValidEmail, normalizePhone, isValidPhone, isValidName, isValidCity } = require("../utills/validation");
const isProduction = process.env.NODE_ENV === "production";
const authCookieOptions = {
    expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
};

//sendotp
exports.sendOTP = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address",
            });
        }

        //check user already exist or not
        const userexist = await User.findOne({ email });
        if (userexist) {
            return res.status(401).json({
                success: false,
                message: "User already exist!"
            });
        }

        // generate otp
        let otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });

        // for unique otp
        let isUnique = false;
        let attempts = 0; // To prevent infinite loops
        const maxAttempts = 10; // Limit OTP generation attempts

        // Generate a unique OTP                                               
        while (!isUnique && attempts < maxAttempts) {
            otp = otpGenerator.generate(6, {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false,
            });

            // Check if OTP already exists in DB
            const existingOtp = await OTP.findOne({ otp });

            if (!existingOtp) {
                isUnique = true;
            }
            attempts++;
        }

        // If unique OTP not found after multiple attempts, return error
        if (!isUnique) {
            return res.status(500).json({
                success: false,
                message: "Failed to generate a unique OTP. Please try again.",
            });
        }

        // ab is unique otp ki entry db m save krni h
        const otpPayLoad = { email, otp }; // hmne createdAt ko default set kr rakha h

        const otpBody = await OTP.create(otpPayLoad);
        console.log("OTP created for email verification flow");

        return res.status(200).json({
            success: true,
            message: "Otp sent successfully!!"
        })
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
// signup
exports.signUp = async (req, res) => {
    try {
        const { firstName, lastName, password, confirmPassword, accountType, otp } = req.body;
        const email = normalizeEmail(req.body.email);
        const phone = normalizePhone(req.body.phone);
        const city = String(req.body.city || "").trim();
        if (!firstName || !lastName || !email || !password || !accountType || !otp) {
            return res.status(400).json({
                success: false,
                message: "All fields are required!!",
            });
        }

        if (!isValidName(firstName) || !isValidName(lastName)) {
            return res.status(400).json({
                success: false,
                message: "Please provide valid first and last names",
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address",
            });
        }

        if (!phone || !isValidPhone(phone)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid 10-digit phone number",
            });
        }

        if (!isValidCity(city)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid city name",
            });
        }

        if (confirmPassword !== password) {
            return res.status(403).json({
                success: false,
                message: "Password and Confirm Password does not match!!"
            });
        }

        // check user already exist or not
        const userexist = await User.findOne({ email });
        if (userexist) {
            return res.status(403).json({
                success: false,
                message: "User already registered!!"
            });
        }

        // find most recent OTP stored in db for the user
        const recentOtp = await OTP.find({ email }).sort({ createdAt: -1 }).limit(1); // return an array // sort the results by createdAt field, here -1 means descending order(newest first), limits the results to only one document
        // OR   
        // const recentOtp = await OTP.findOne({ email }).sort({ createdAt: -1 });
        console.log("RecentOTP: ", recentOtp);

        //validate OTP
        if (recentOtp.length == 0) {
            //OTP not found
            return res.status(401).json({
                success: false,
                message: "OTP not found!!",
            });
        } else if (otp !== recentOtp[0].otp) {
            // Invalid OTP
            return res.status(400).json({
                success: false,
                message: "Invalid Otp!!",
            });
        }

        //Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the user
        const normalizedCity = city ? city.toLowerCase() : "";

        const user = await User.create({
            firstName, lastName, email, password: hashedPassword,
            accountType, isVerified: true, phone, city: normalizedCity,
            image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`,
        });

        // below steps is for auto login after signup
        const payload = {
            email: user.email,
            id: user._id,
            accountType: user.accountType
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "2h"
        });

        user.token = token;
        user.password = undefined;

        // send response
        return res.cookie("token", token, authCookieOptions).status(200).json({
            success: true,
            message: "User registered Successfully!!",
            token,
            user,
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "User cannot be registered. Please try again!!",
        });
    }
}

// login
exports.login = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const { password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Filled All Details!"
            });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address",
            });
        }

        //check user exist or not 
        const user = await User.findOne({ email }).select("+password"); // becoz mne model m select:false kr rakha h

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not registered, Please Signup!"
            });
        }
        if(user.isSuspended){
            return res.status(403).json({
                success:false,
                message:"Account suspended by admin"
            })
        }
        // check password
        if (await bcrypt.compare(password, user.password)) {
            const payload = {
                email: user.email,
                id: user._id,
                accountType: user.accountType
            }
            //generate token
            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: "2h"
            });
            user.token = token;
            user.password = undefined;

            //create cookie & send response
            res.cookie("token", token, authCookieOptions).status(200).json({
                success: true,
                token,
                user,
                message: "Logged in successfully!!",
            });
        } else {
            // password not match
            return res.status(401).json({
                success: false,
                message: "Wrong Password!!"
            });
        }
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Login failure, Please try again!!",
        });
    }
}

//change Password
exports.changePassword = async (req, res) => {
    try {
        // get oldPassword, newPassword, confirmPassword from req body
        const { oldPassword, newPassword } = req.body;

        // validation
        if (!oldPassword || !newPassword) {
            return res.status(403).json({
                success: false,
                message: "All fields are required!!",
            });
        }
        const user = await User.findById(req.user.id).select("+password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordMatch) {
            return res.status(403).json({
                success: false,
                message: "Old password is incorrect",
            });
        }

        // hashed the password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // update password
        user.password = hashedPassword;
        await user.save();


        // send mail - Password updated
        // await mailSender(user.email,"Password Updated","Your Password Updated Successfully!!");
        // Send notification email
        try {
            const emailResponse = await mailSender(
                user.email,
                "Password for your account has been updated",
                passwordUpdated(
                    user.email,
                    `Password updated successfully for ${user.firstName} ${user.lastName}`
                )
            )
            console.log("Email sent successfully:", emailResponse.response)
        } catch (error) {
            // If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
            console.error("Error occurred while sending email:", error)
            return res.status(500).json({
                success: false,
                message: "Error occurred while sending email",
                error: error.message,
            })
        }

        //return response
        return res.status(200).json({
            success: true,
            message: "Email sent successfully!",
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failure in Change Password, Please try again!!",
        });
    }

}
