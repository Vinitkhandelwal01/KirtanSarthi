const nodemailer = require("nodemailer");
require("dotenv").config();

const mailSender = async (email,title,body) => {
    try{
        if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
            throw new Error("Missing MAIL_HOST/MAIL_USER/MAIL_PASS environment variables");
        }

        let transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: 587,
            secure: false,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });

        let info = await transporter.sendMail({
            from: `"KirtanSarthi" <${process.env.MAIL_USER}>`,
            to: `${email}`,
            subject: `${title}`,
            html:`${body}`
        });
        console.log(info);
        return info;
    } catch(error){
        console.error("mailSender error:", error.message);
        throw error;
    }
}

module.exports = mailSender;