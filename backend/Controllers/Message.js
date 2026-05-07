const Message = require("../models/Message");
const Chat = require("../models/Chat");
const { getIO } = require("../socket/Socket");
const User = require("../models/User");


// ================= MARK MESSAGES READ =================
exports.markAsRead = async (req, res) => {
    try {
        const { chatId } = req.body;
        const userId = req.user.id;

        await Message.updateMany(
            { chat: chatId, readBy: { $ne: userId } },
            { $push: { readBy: userId } }
        );

        getIO().to(chatId).emit("readReceipt", {
            chatId,
            userId,
        });

        res.json({ success: true });

    } catch (error) {
        res.status(500).json({ success: false });
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        if (req.chatReadOnly) {
            return res.status(403).json({
                success: false,
                message: "Chat is read-only for completed booking",
            });
        }

        const { messageId } = req.body;
        const userId = req.user.id;

        const msg = await Message.findById(messageId);

        if (!msg) return res.status(404).json({ message: "Message not found" });

        if (msg.sender.toString() !== userId)
            return res.status(403).json({ message: "Not allowed" });

        msg.content = "This message was deleted";
        msg.isDeleted = true;
        await msg.save();

        getIO().to(msg.chat.toString()).emit("messageDeleted", {
            messageId,
        });

        res.json({ success: true });

    } catch (err) {
        res.status(500).json({ success: false });
    }
};

exports.getUserStatus = async (req, res) => {
    try {
        const requestedUserId = req.params.userId;
        const viewerId = req.user.id;

        const user = await User.findById(requestedUserId)
            .select("isOnline lastSeen");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        let unreadCount = 0;
        if (viewerId === requestedUserId) {
            const chatIds = await Chat.find({ members: viewerId }).distinct("_id");
            unreadCount = await Message.countDocuments({
                chat: { $in: chatIds },
                sender: { $ne: viewerId },
                readBy: { $ne: viewerId },
                isDeleted: false,
            });
        }

        res.json({
            success: true,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen,
            unreadCount,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch user status",
        });
    }
};

// // ================= SEND MESSAGE =================
// exports.sendMessage = async (req, res) => {
//   try {
//     const { chatId, content, type } = req.body;
//     const senderId = req.user.id;

//     if (!chatId || !content) {
//       return res.status(400).json({
//         success: false,
//         message: "chatId and content required",
//       });
//     }

//     const chat = await Chat.findById(chatId);
//     if (!chat) {
//       return res.status(404).json({ message: "Chat not found" });
//     }

//     // Sender must be a chat member
//     if (!chat.members.includes(senderId)) {
//       return res.status(403).json({ message: "Not allowed in this chat" });
//     }

//     // Create message
//     const message = await Message.create({
//       chat: chatId,
//       sender: senderId,
//       content,
//       type: type || "text",
//       readBy: [senderId],
//     });

//     // Update lastMessage in chat
//     chat.lastMessage = content;
//     await chat.save();

//     // Emit real-time message
//     getIO().to(chatId).emit("newMessage", {
//       _id: message._id,
//       chat: chatId,
//       sender: senderId,
//       content,
//       type,
//       createdAt: message.createdAt,
//     });

//     return res.status(201).json({
//       success: true,
//       message,
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "Message send failed",
//     });
//   }
// };
