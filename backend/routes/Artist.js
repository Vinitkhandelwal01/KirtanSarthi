const express=require("express");
const router=express.Router();
const { auth, isArtist, isArtistNotSuspended } = require("../middlewares/auth");
const {
    createArtist,
    updateArtist,
    getMyArtistProfile,
    getArtistProfile,
    getAllArtists,
    searchArtists,
    pauseAccount,
    resumeAccount,
} = require("../Controllers/Artist");

router.post("/create", auth, createArtist);
router.put("/update", auth, isArtist, updateArtist);
router.get("/me", auth, isArtist, getMyArtistProfile);
router.get("/artistProfile/:artistId",getArtistProfile);
router.get("/all", getAllArtists);
router.get("/search", searchArtists);
router.post("/pause-account", auth, isArtist, isArtistNotSuspended, pauseAccount);
router.post("/resume-account", auth, isArtist, isArtistNotSuspended, resumeAccount);

module.exports = router;
