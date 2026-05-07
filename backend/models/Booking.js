const mongoose=require("mongoose");

const bookingSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    artist:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Artist",
        required:true,
    },
    availability:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Availability",
        required:true,
    },
    // Index of slot inside availability.slots[]
    slotIndex: {
      type: Number,
      required: true
    },
    artistPrice:{
        type:Number,
        required:true,
    },
    userBudget:{
        type:Number,
        required:true,
    },
    finalPrice:{
        type:Number,
    },
    status:{
        type:String,
        enum:["PENDING","COUNTERED","ACCEPTED","REJECTED","CANCELLED","COMPLETED"],
        default:"PENDING"
    },
    counterPrice:{
        type:Number,
    },
    counterBy:{
        type:String,
        enum: ["ARTIST", "USER"]
    },
    counterCount: {
        type: Number,
        default: 0,
        min: 0,
    },
    notes:{
        type:String,
        trim:true
    },
    eventVisibility: {
        type: String,
        enum: ["PUBLIC", "PRIVATE"],
        default: "PRIVATE",
    },
    eventDetails: {
        title: { type: String, trim: true },
        eventType: { type: String, trim: true },
        god: { type: String, trim: true },
        city: { type: String, trim: true },
        address: { type: String, trim: true },
        date: { type: Date },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number], // [lng, lat]
            },
        },
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
    },
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
    },
    eventCreated: {
        type: Boolean,
        default: false,
    },

},
{ timestamps: true }
);

bookingSchema.index({ user: 1, availability: 1, slotIndex: 1, status: 1 });
bookingSchema.index({ availability: 1, slotIndex: 1, status: 1 });
bookingSchema.index({ artist: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Booking",bookingSchema);
