const express = require("express")
const router = express.Router()
const { auth, isInstructor } = require("../middlewares/auth")
const {
  deleteAccount,
  updateProfile,
  updateLocation,
  getUserDetails,
  updateDisplayPicture,
} = require("../Controllers/Profile")

// ********************************************************************************************************
//                                      Profile routes
// ********************************************************************************************************
// Delet User Account
router.delete("/deleteProfile", auth, deleteAccount)
router.put("/updateProfile", auth, updateProfile)
router.post("/update-location", auth, updateLocation)
router.get("/getUserDetails", auth, getUserDetails)
router.put("/updateDisplayPicture", auth, updateDisplayPicture)

module.exports = router
