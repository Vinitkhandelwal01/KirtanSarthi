const nodemailer = require("nodemailer");
require("dotenv").config();

const normalizeMailFrom = (fallbackFrom) => String(process.env.MAIL_FROM || fallbackFrom);

const sendViaResend = async (email, title, body) => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error("Missing RESEND_API_KEY environment variable");
    }

    const from = normalizeMailFrom(`KirtanSarthi <${process.env.MAIL_USER}>`);
    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from,
            to: [email],
            subject: title,
            html: body,
        }),
    });

    const responseText = await response.text();
    if (!response.ok) {
        throw new Error(`Resend API error: ${response.status} ${responseText}`);
    }

    return {
        messageId: `resend:${Date.now()}`,
        response: responseText,
        envelope: { from, to: [email] },
    };
};

const buildTransportConfig = () => {
    if (process.env.MAIL_SERVICE) {
        return {
            service: process.env.MAIL_SERVICE,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
            family: 4,
            connectionTimeout: Number(process.env.MAIL_CONNECTION_TIMEOUT || 20000),
            greetingTimeout: Number(process.env.MAIL_GREETING_TIMEOUT || 20000),
            socketTimeout: Number(process.env.MAIL_SOCKET_TIMEOUT || 30000),
        };
    }

    const mailPort = Number(process.env.MAIL_PORT || 587);
    const mailSecure = String(process.env.MAIL_SECURE || "false").toLowerCase() === "true";

    return {
        host: process.env.MAIL_HOST,
        port: mailPort,
        secure: mailSecure,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
        family: 4,
        requireTLS: !mailSecure,
        connectionTimeout: Number(process.env.MAIL_CONNECTION_TIMEOUT || 20000),
        greetingTimeout: Number(process.env.MAIL_GREETING_TIMEOUT || 20000),
        socketTimeout: Number(process.env.MAIL_SOCKET_TIMEOUT || 30000),
        tls: {
            // Keeps compatibility with SMTP providers that use STARTTLS on shared hosts.
            rejectUnauthorized: String(process.env.MAIL_TLS_REJECT_UNAUTHORIZED || "true").toLowerCase() !== "false",
        },
    };
};

const mailSender = async (email, title, body) => {
    try {
        const mailProvider = String(process.env.MAIL_PROVIDER || "smtp").toLowerCase();

        if (mailProvider === "resend" || process.env.RESEND_API_KEY) {
            const info = await sendViaResend(email, title, body);
            console.log("mailSender success:", {
                provider: "resend",
                messageId: info?.messageId,
                response: info?.response,
                envelope: info?.envelope,
            });
            return info;
        }

        if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
            throw new Error("Missing MAIL_USER/MAIL_PASS environment variables");
        }

        if (!process.env.MAIL_SERVICE && !process.env.MAIL_HOST) {
            throw new Error("Missing MAIL_HOST or MAIL_SERVICE environment variable");
        }

        const mailFrom = normalizeMailFrom(`"KirtanSarthi" <${process.env.MAIL_USER}>`);
        const transporter = nodemailer.createTransport(buildTransportConfig());

        console.log("mailSender transport config:", {
            service: process.env.MAIL_SERVICE || null,
            host: process.env.MAIL_HOST || null,
            port: process.env.MAIL_SERVICE ? null : Number(process.env.MAIL_PORT || 587),
            secure: process.env.MAIL_SERVICE ? null : String(process.env.MAIL_SECURE || "false").toLowerCase() === "true",
            from: mailFrom,
        });

        const info = await transporter.sendMail({
            from: mailFrom,
            to: `${email}`,
            subject: `${title}`,
            html: `${body}`,
        });

        console.log("mailSender success:", {
            provider: "smtp",
            messageId: info?.messageId,
            response: info?.response,
            envelope: info?.envelope,
        });
        return info;
    } catch (error) {
        console.error("mailSender error:", {
            message: error.message,
            code: error.code,
            command: error.command,
        });
        throw error;
    }
}

module.exports = mailSender;