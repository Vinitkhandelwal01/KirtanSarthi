const mongoose=require("mongoose");
require('dotenv').config();
const User = require("../models/User");
const Event = require("../models/Event");
const Artist = require("../models/Artist");

const dbConnect = () => {
    mongoose.connect(process.env.DATABASE_URL)
    .then(async()=>{
        console.log("DB connection is sucessfull");
        await Promise.allSettled([
            User.syncIndexes(),
            Event.syncIndexes(),
            Artist.syncIndexes(),
        ]);
        await Promise.allSettled([
            Event.collection.createIndex({ location: "2dsphere" }),
            User.collection.createIndex({ location: "2dsphere" }, { sparse: true }),
        ]);
        console.log("Mongo indexes synced");
    })
    .catch((error)=>{
        console.log("Error received");
        console.error(error);
        process.exit(1);
    });
}

module.exports=dbConnect;
