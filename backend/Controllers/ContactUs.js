const { contactUsEmail } = require("../mail/templates/contactFormRes")
const mailSender = require("../utills/mailSender")
const { normalizeEmail, normalizePhone, isValidEmail, isValidPhone, isValidName } = require("../utills/validation")

exports.contactUsController = async (req, res) => {
  const firstName = String(req.body.firstName || "").trim()
  const lastName = String(req.body.lastName || "").trim()
  const email = normalizeEmail(req.body.email)
  const phone = String(req.body.phone || "").trim()
  const message = String(req.body.message || "").trim()
  try {
    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      })
    }

    if (!isValidName(firstName) || !isValidName(lastName)) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid first and last names",
      })
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      })
    }

    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 10-digit phone number",
      })
    }

    if (message.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Message should be at least 10 characters long",
      })
    }

    const emailRes = await mailSender(
      email,
      "Your Data send successfully",
      contactUsEmail(email, firstName, lastName, message, phone ? normalizePhone(phone) : ""),
      { replyTo: email }
    )
    console.log("Email Res ", emailRes)
    return res.json({
      success: true,
      message: "Email send successfully",
    })
  } catch (error) {
    console.error("ContactUs Error:", error)
    console.error("Error stack:", error.stack)
    console.error("Error message:", error.message)
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while sending contact message...",
    })
  }
}
