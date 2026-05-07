// Run with: mongosh "<your-mongodb-uri>/<db-name>" backend/scripts/cleanupGeoData.mongodb.js
// Cleans malformed GeoJSON location values from users/events collections.

print("Starting GeoJSON cleanup...");

// Remove locations where coordinates are stored as strings.
db.users.updateMany(
  { "location.coordinates": { $type: "string" } },
  { $unset: { location: "" } }
);

db.events.updateMany(
  { "location.coordinates": { $type: "string" } },
  { $unset: { location: "" } }
);

// Remove invalid coordinate arrays (missing values or out-of-range values).
db.users.updateMany(
  {
    $or: [
      { "location.coordinates.0": { $exists: false } },
      { "location.coordinates.1": { $exists: false } },
      { "location.coordinates.0": { $lt: -180 } },
      { "location.coordinates.0": { $gt: 180 } },
      { "location.coordinates.1": { $lt: -90 } },
      { "location.coordinates.1": { $gt: 90 } },
    ],
  },
  { $unset: { location: "" } }
);

db.events.updateMany(
  {
    $or: [
      { "location.coordinates.0": { $exists: false } },
      { "location.coordinates.1": { $exists: false } },
      { "location.coordinates.0": { $lt: -180 } },
      { "location.coordinates.0": { $gt: 180 } },
      { "location.coordinates.1": { $lt: -90 } },
      { "location.coordinates.1": { $gt: 90 } },
    ],
  },
  { $unset: { location: "" } }
);

// Ensure 2dsphere indexes exist.
db.events.createIndex({ location: "2dsphere" });
db.users.createIndex({ location: "2dsphere" });

print("GeoJSON cleanup completed.");
