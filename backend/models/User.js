const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false
    },
    isVerified: {
        type: Boolean,
        default: false   // ye user real h ya nhi 
    },
    accountType: {
        type: String,
        enum: ['USER', 'ARTIST', 'ADMIN'],
        default: 'USER'
    },
    phone: {
        type: String
    },
    city: {
        type: String
    },
    image: {
        type: String,
    },
    gender: {
        type: String,
    },
    // we create this for reset password
    token: {
        type: String,
    },
    // we create this for reset password
    resetPasswordExpires: {
        type: Date,
    },
    notifyNearbyEvents: { // for notify nearby event to the user
        type: Boolean,
        default: true
    },
    lastSeen: {
        type: Date,
    },
    isOnline: {
        type: Boolean,
        default: false,
    },
    isSuspended: {
        type: Boolean,
        default: false,
    },
    suspensionReason: {
        type: String,
        trim: true,
        default: null,
    },
    suspendedAt: {
        type: Date,
        default: null,
    },
    location: {
        type: {
            type: String,
            enum: ["Point"]
        },
        coordinates: {
            type: [Number] // [lng, lat]
        }
    }
},
    { timestamps: true }
);
userSchema.index({ location: "2dsphere", sparse: true });
userSchema.index({ city: 1 });

module.exports = mongoose.model("User", userSchema);
