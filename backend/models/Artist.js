const mongoose=require("mongoose");

const artistSchema=new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"User"
    },
    artistType:{
        type:String,
        enum:["SOLO","GROUP"],
        required:true,
    },
    groupName:{
        type:String,
        trim:true,
    },
    membersCount:{
        type:Number,
        default:1,
    },
    description:{
        type:String,
        trim:true
    },
    experienceYears: {
        type: Number,
        required: true,
        min: 0,
    },
    eventTypes:[
        {
            type:String, // Kirtan/Bhajan/Jagran/Ram Katha/SundarKand
            required:true,
        } 
    ],
    gods:[
        {
            type:String,
            required:true,
        }
    ],
    price:{
        type:Number,
        required:true,
        min: 1,
    },
    videoLinks:[
        {
            type:String,
        }
    ],
    averageRating: {
        type: Number,
        default: 0
    },
    totalReviews: {
        type: Number,
        default: 0
    },
    totalEvents:{
        type:Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isApproved: { // admin krega
      type: Boolean,
      default: false
    },
    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },
    suspensionReason: {
      type: String,
      trim: true,
      default: null,
    },
    suspendedAt: {
      type: Date,
      default: null,
    }
},
{ timestamps: true }
);

artistSchema.index({ user: 1 });
artistSchema.index({ isApproved: 1, isSuspended: 1, isActive: 1, price: 1 });
artistSchema.index({ gods: 1 });
artistSchema.index({ eventTypes: 1 });

module.exports = mongoose.model("Artist",artistSchema);


