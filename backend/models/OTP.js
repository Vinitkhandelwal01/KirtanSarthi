const mongoose=require("mongoose");
const mailSender = require("../utills/mailSender");
const emailTemplate = require("../mail/templates/emailVerificationTemplate");

const otpSchema =new mongoose.Schema({
    email:{
        type:String,
        required:true
    },
    otp:{
        type:String,
        required:true
    },
    createdAt:{
        type:Date,
        default:Date.now,
        expires: 5*60,
    }
});

//OTP mailsender -> to send email
async function sendVerificationEmail(email,otp){
    try{
        const mailResponse = await mailSender(email,"Verification Email from KirtanSarthi",emailTemplate(otp));
        console.log("Email Sent Successfully:",mailResponse);
    } catch(error){
        console.log("Error occured while sending mails: ",error);
        throw error;
    }
}
 // entry save hone k just phele
otpSchema.pre("save",async function(next){
    // Only send an email when a new document is created
	if (this.isNew) {
		await sendVerificationEmail(this.email, this.otp);
	}
    next();
});

module.exports=mongoose.model("OTP",otpSchema);