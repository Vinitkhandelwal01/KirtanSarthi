const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const http = require("http");
const cookieParser = require("cookie-parser");
const aiRoutes=require("./routes/AI");
const userRoutes = require("./routes/User");
const profileRoutes = require("./routes/Profile");
const contactUsRoute = require("./routes/ContactUs");
const notificationRoutes = require("./routes/Notification");
const artistRoutes = require("./routes/Artist");
const availabilityRoutes=require("./routes/Availability");
const bookingRoutes=require("./routes/Booking");
const chatRoutes=require("./routes/Chat");
const ratingRoutes = require("./routes/Rating");
const adminRoutes = require("./routes/Admin");
const messageRoutes = require("./routes/Message");
const eventRoutes = require("./routes/Event");
const dashboardRoutes = require("./routes/Dashboard");

const { cloudinaryConnect } = require("./config/cloudinary");
const fileUpload = require("express-fileupload");
const app = express();
const PORT = process.env.PORT || 4000;

const normalizeOrigin = (origin = "") => origin.trim().replace(/\/$/, "");

const parseOriginList = (value = "") =>
  String(value)
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

const allowlistedOrigins = new Set([
  ...parseOriginList(process.env.CORS_ORIGINS),
  ...parseOriginList(process.env.FRONTEND_URL),
  ...parseOriginList(process.env.CLIENT_URL),
]);

// Local dev convenience: allow standard localhost origins unless running in production.
if (process.env.NODE_ENV !== "production") {
  [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
  ].forEach((origin) => allowlistedOrigins.add(origin));
}

const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    // Allow non-browser requests (no Origin header).
    if (!origin) return callback(null, true);
    const normalizedOrigin = normalizeOrigin(origin);
    if (allowlistedOrigins.has(normalizedOrigin)) return callback(null, true);
    // Deny disallowed origins without throwing a server-side exception stack.
    return callback(null, false);
  },
};

const swaggerUi = require("swagger-ui-express");
const swaggerFile = require("./swagger-output.json");

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));

// middleware
app.use(express.json());
app.use(cookieParser());

app.use(
  cors(corsOptions)
);

// DB
const dbConnect = require("./config/database");
dbConnect();

app.use(
	fileUpload({
		useTempFiles: true,
		tempFileDir: "/tmp/",
	})
); 
// Connecting to cloudinary
cloudinaryConnect();
// ROUTES
app.use("/api/v1/auth", userRoutes); //checked by postman
app.use("/api/v1/profile", profileRoutes); //checked by postman
app.use("/api/v1/notify", notificationRoutes); //checked
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/reach", contactUsRoute); //checked by postman
app.use("/api/v1/admin",adminRoutes); // checked by postman
app.use("/api/v1/ai",aiRoutes); // checked by postman 
app.use("/api/v1/artist", artistRoutes); //checked by postman
app.use("/api/v1/availability",availabilityRoutes); // checked by postman
app.use("/api/v1/booking", bookingRoutes); // checked by postman
app.use("/api/v1/rating", ratingRoutes); //checked by postman
app.use("/api/v1/chat", chatRoutes); // partial checked
app.use("/api/v1/message", messageRoutes); // partial checked
app.use("/api/v1/event", eventRoutes); // checked by postman
app.use("/api/v1/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
  });
});

// HTTP server
const server = http.createServer(app);

// Socket init (important)
require("./socket/Socket")(server);

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
  } else {
    console.error("Server startup error:", error);
  }
  process.exit(1);
});

// start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


