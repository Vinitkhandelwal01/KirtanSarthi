const mongoose = require("mongoose");

const ratingAndReviewSchema = new mongoose.Schema({
    user: {
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
    },
    rating: {
        type:Number,
        required:true,
    },
    review: {
        type:String,
        required:true,
    },
    artist: {
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        index:true,
        ref:"Artist",
    },

});

ratingAndReviewSchema.set("timestamps", true);

module.exports = mongoose.model("RatingAndReview",ratingAndReviewSchema);