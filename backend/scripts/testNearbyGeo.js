/*
  Run:
    cd backend
    node scripts/testNearbyGeo.js

  This validates the sample case:
    User  [lng, lat] = [76.8571, 27.3634]
    Event [lng, lat] = [76.8858, 27.3780]
  Expected: ~3 km, inside 10 km radius.
*/

require("dotenv").config();
const mongoose = require("mongoose");
const Event = require("../models/Event");

const TEST_USER_LNG = 76.8571;
const TEST_USER_LAT = 27.3634;
const MAX_DISTANCE_METERS = 10000;

const toRad = (deg) => (deg * Math.PI) / 180;
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

async function main() {
  await mongoose.connect(process.env.DATABASE_URL);

  const now = new Date();
  const results = await Event.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [TEST_USER_LNG, TEST_USER_LAT], // [lng, lat]
        },
        distanceField: "distance",
        maxDistance: MAX_DISTANCE_METERS,
        spherical: true,
        query: {
          visibility: "PUBLIC",
          dateTime: { $gte: now },
        },
      },
    },
    { $sort: { distance: 1, dateTime: 1 } },
    { $limit: 10 },
  ]);

  const expectedKm = haversineKm(27.3634, 76.8571, 27.3780, 76.8858);

  console.log("Expected reference distance (sample points):", expectedKm.toFixed(3), "km");
  console.log("Nearby results count:", results.length);
  if (results[0]) {
    console.log("Closest event:");
    console.log({
      id: results[0]._id,
      title: results[0].title,
      city: results[0].city,
      distanceKm: (results[0].distance / 1000).toFixed(3),
      coordinates: results[0].location?.coordinates,
    });
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
