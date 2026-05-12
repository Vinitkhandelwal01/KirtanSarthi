const nodemailer = require("nodemailer");
require("dotenv").config();

const mailSender = async (email,title,body) => {
    try{
        if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASS) {
            throw new Error("Missing MAIL_HOST/MAIL_USER/MAIL_PASS environment variables");
        }

        const mailPort = Number(process.env.MAIL_PORT || 587);
        const mailSecure = String(process.env.MAIL_SECURE || "false").toLowerCase() === "true";
        const mailFrom = process.env.MAIL_FROM || `"KirtanSarthi" <${process.env.MAIL_USER}>`;

        let transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: mailPort,
            secure: mailSecure,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
            tls: {
                // Keeps compatibility with SMTP providers that use STARTTLS on shared hosts.
                rejectUnauthorized: String(process.env.MAIL_TLS_REJECT_UNAUTHORIZED || "true").toLowerCase() !== "false",
            },
        });

        let info = await transporter.sendMail({
            from: mailFrom,
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