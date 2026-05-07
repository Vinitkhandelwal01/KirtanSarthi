const { Server } = require("socket.io");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");
const Booking = require("../models/Booking");
const jwt = require("jsonwebtoken");

let io;

const normalizeOrigin = (origin = "") => String(origin).trim().replace(/\/$/, "");

const parseOriginList = (value = "") =>
  String(value)
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

const allowedOrigins = new Set([
  ...parseOriginList(process.env.CORS_ORIGINS),
  ...parseOriginList(process.env.FRONTEND_URL),
  ...parseOriginList(process.env.CLIENT_URL),
]);

// Local dev convenience to match backend API behavior.
if (process.env.NODE_ENV !== "production") {
  [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
  ].forEach((origin) => allowedOrigins.add(origin));
}

const getChatPreviewText = (type, content) => {
  if (type === "image") return "Photo";
  if (type === "audio") return "Voice message";
  return content;
};

const parseCookieToken = (cookieHeader = "") => {
  const cookies = String(cookieHeader)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const entry of cookies) {
    const [key, ...rest] = entry.split("=");
    if (key === "token") {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
};

module.exports = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalized = normalizeOrigin(origin);
        if (allowedOrigins.has(normalized)) return callback(null, true);
        return callback(new Error("Not allowed by Socket.IO CORS"));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });
  // for authentication 
  io.use((socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token || null;
      const cookieToken = parseCookieToken(socket.handshake.headers?.cookie || "");
      const token = cookieToken || authToken;
      if (!token) {
        return next(new Error("Unauthorized"));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {

    // Join personal room (for notifications)
    socket.on("join", () => {
      const userId = socket.userId;
      if (!userId) return;
      socket.join(userId);
      console.log(`User joined personal room: ${userId}`);
    });

    //  Join chat room
    socket.on("joinChat", async (chatId) => {
      if (!chatId) return;
      const chat = await Chat.findById(chatId).select("members");
      if (!chat) return;

      const isMember = chat.members.some((memberId) => memberId.toString() === socket.userId);
      if (!isMember) return;

      socket.join(chatId);
      console.log(`Joined chat room: ${chatId}`);
    });

    //  Send message
    socket.on("sendMessage", async (data) => {
      try {
        const { chatId, content, type, clientId } = data;
        const senderId = socket.userId;
        const trimmedContent = typeof content === "string" ? content.trim() : "";

        if (!chatId || !trimmedContent) {
          socket.emit("messageError", {
            chatId,
            clientId,
            message: "chatId and content are required",
          });
          return;
        }

        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit("messageError", {
            chatId,
            clientId,
            message: "Chat not found",
          });
          return;
        }

        const isMember = chat.members.some((memberId) => memberId.toString() === senderId);
        if (!isMember) {
          socket.emit("messageError", {
            chatId,
            clientId,
            message: "Not allowed in this chat",
          });
          return;
        }

        if (chat.type === "PRIVATE") {
          const booking = await Booking.findOne({ chat: chatId }).sort({ createdAt: -1 });
          if (!booking || !["PENDING", "COUNTERED", "ACCEPTED"].includes(booking.status)) {
            socket.emit("messageError", {
              chatId,
              clientId,
              message: "Chat is disabled or read-only for this booking status",
            });
            return;
          }
        }

        const message = await Message.create({
          chat: chatId,
          sender: senderId,
          content: trimmedContent,
          type: type || "text",
          readBy: [senderId],
        });

        const previewText = getChatPreviewText(type, trimmedContent);

        await Chat.findByIdAndUpdate(chatId, { // left list m preview show krne k liye 
          lastMessage: previewText,
        });

        const populatedMessage = await Message.findById(message._id)
          .populate("sender", "firstName lastName image");

        const payload = populatedMessage.toObject();
        payload.clientId = clientId || null;

        io.to(chatId).emit("newMessage", payload);
      } catch (error) {
        console.error("Message send error:", error);
        socket.emit("messageError", {
          chatId: data?.chatId,
          clientId: data?.clientId || null,
          message: "Message send failed",
        });
      }
    });

    socket.on("userOnline", async () => {
      const userId = socket.userId;
      if (!userId) return;
      socket.join(userId);

      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: null,
      });

      io.emit("userStatus", {
        userId,
        isOnline: true,
      });
    });

    socket.on("typing", ({ chatId, userId }) => {
      socket.to(chatId).emit("typing", { chatId, userId });
    });

    socket.on("stopTyping", ({ chatId, userId }) => {
      socket.to(chatId).emit("stopTyping", { chatId, userId });
    });

    socket.on("disconnect", async () => {
      const userId = socket.userId;
      if (!userId) return;

      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
      });

      io.emit("userStatus", {
        userId,
        isOnline: false,
      });
    });

  });
};

// Export io for controllers
module.exports.getIO = () => io;
