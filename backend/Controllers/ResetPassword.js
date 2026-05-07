const User = require("../models/User");
const mailSender = require("../utills/mailSender");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { normalizeEmail, isValidEmail } = require("../utills/validation");

const getResetBaseUrl = () => {
    const rawUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL;
    if (!rawUrl) return null;

  return rawUrl.replace(/\/+$/, "");
};

//resetPassword Token --> yha hm ek link generate krenge using of token(uuid wala) and then mail send krenge
exports.resetPasswordToken = async (req,res) => {
   try{
        // get email from req body
        const email = normalizeEmail(req.body.email);

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success:false,
                message:"Please provide a valid email address",
            })
        }

        //check user for this email,email validation
        const user = await User.findOne({email:email});
        if(!user){
            return res.status(401).json({
                success:false,
                message:"Your Email is not registered!!",
            })
        }
    
        // generate token  
        const token = crypto.randomBytes(20).toString("hex");
    
        // update user by adding token and expiration time
        await User.findOneAndUpdate({email},
                                        {
                                            token:token,
                                            resetPasswordExpires:Date.now() + 5*60*1000,
                                        },
                                        {new:true}); // new:true s updated document return ho jayega

        const resetBaseUrl = getResetBaseUrl();
        if (!resetBaseUrl) {
            return res.status(500).json({
                success: false,
                message: "Reset password URL is not configured",
            });
        }
        // create url
        const url = `${resetBaseUrl}/update-password/${token}`;
    
        // send mail containig the url
        await mailSender(email,"Password Reset Link",`Click on this link: ${url}`);
    
        //return response
        return res.status(200).json({
            success:true,
            message:"Email sent successfully!",
        });
        // hmara frontend 3000 port pr chlega and backend 4000 port pr
    } catch(error){
        console.log(error);
            return res.status(500).json({
                success:false,
                message:"Reset Password failure while sendind mail, Please try again!!",
            }); 
   }
}

// resetPassword --> isme jo link k through new password aaya use db m password m update krna
exports.resetPassword = async (req,res) => {
    try{
        // get data 
      // yha frontend n token ko request m dala h
      const {password,confirmPassword,token} = req.body;

      // validation
      if(password !== confirmPassword) {
          return res.status(403).json({
              success:false,
              message:'Password is not match with confirm password!',
          });
      }
  
      // hm token use krke user ki entry find krenge DB m , isliye mne token ko DB m store kiya tha phele
      const userDetails = await User.findOne({token}); // isse userDetails aa jayengi
  
      // if no token - invalid token 
      if(!userDetails) {
          return res.status(403).json({
              success:false,
              message:'Invalid Token!',
          });
      }
  
      // if token's time is expired then token is invalid token
      if(userDetails.resetPasswordExpires < Date.now()) {
          return res.status(403).json({
              success:false,
              message:'Token is expired,please regenerate it !',
          });
      }
  
      // hashed the password
      const hashedPassword= await bcrypt.hash(password,10);
  
      // update password
            await User.findOneAndUpdate(
                { token },
                {
                    $set: { password: hashedPassword },
                    $unset: { token: 1, resetPasswordExpires: 1 },
                },
                { new: true }
            );
  
      // return response
      return res.status(200).json({
          success:true,
          message:'Your Password reset Successfully!',
      });
    } catch(error) {
        console.log(error);
            return res.status(500).json({
                success:false,
                message:"Reset Password failure, Please try again!!",
            }); 
    }
}
