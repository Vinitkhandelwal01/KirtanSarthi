const Chat = require("../models/Chat");
const { getIO } = require("../socket/Socket");
const Message = require("../models/Message");
const Booking = require("../models/Booking");
const Artist = require("../models/Artist");
const Event = require("../models/Event");
const User = require("../models/User");
const { uploadImageToCloudinary } = require("../utills/imageUploader");

exports.uploadChatMedia = async (req, res) => {
  try {
    if (req.chatReadOnly) {
      return res.status(403).json({
        success: false,
        message: "Chat is read-only for completed booking",
      });
    }

    const file = req.files.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    if (!["image", "audio"].includes(file.mimetype.split("/")[0])) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type",
      });
    }

    const uploaded = await uploadImageToCloudinary(file, "chat-media");

    return res.status(200).json({
      success: true,
      fileUrl: uploaded.secure_url,
      fileType: uploaded.resource_type, // image / video 
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Upload failed",
    });
  }
};

exports.createPrivateChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { artistUserId } = req.body;

    // find artist
    const artist = await Artist.findOne({ user: artistUserId });
    if (!artist) {
      return res.status(404).json({ message: "Artist not found" });
    }

    // allow either user or artist to initiate chat if a valid booking exists
    const bookingFilter = {
      artist: artist._id,
      status: { $in: ["PENDING", "COUNTERED", "ACCEPTED", "COMPLETED"] },
    };

    if (req.user.accountType === "ARTIST") {
      if (artist.user?.toString() !== userId) {
        return res.status(403).json({
          message: "Not allowed to chat for this artist profile",
        });
      }
    } else {
      bookingFilter.user = userId;
    }

    const booking = await Booking.findOne(bookingFilter)
      .sort({ createdAt: -1 })
      .populate("user", "_id");

    if (!booking) {
      return res.status(403).json({
        message: "Chat is allowed only for booked users"
      });
    }

    let chat = await Chat.findOne({ booking: booking._id });

    if (!chat) {
      const bookingUserId = booking.user?._id?.toString() || booking.user?.toString();
      const artistMemberId = artist.user?.toString();
      chat = await Chat.create({
        type: "PRIVATE",
        members: [bookingUserId, artistMemberId],
        booking: booking._id
      });

      booking.chat = chat._id;
      await booking.save();
    }

    return res.json({ success: true, chat });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create chat"
    });
  }
};


exports.createGroupChat = async (req, res) => {
  try {
    const { eventId, members } = req.body;
    const creatorId = req.user.id;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "eventId is required",
      });
    }

    if (members !== undefined && !Array.isArray(members)) {
      return res.status(400).json({
        success: false,
        message: "members must be an array",
      });
    }

    const event = await Event.findById(eventId).select("host artist");
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const requesterRole = req.user.accountType;
    const isHost = event.host?.toString() === creatorId;
    let isEventArtist = false;

    if (event.artist) {
      const artist = await Artist.findById(event.artist).select("user");
      isEventArtist = artist?.user?.toString() === creatorId;
    }

    const canCreateGroup = requesterRole === "ADMIN" || isHost || isEventArtist;
    if (!canCreateGroup) {
      return res.status(403).json({
        success: false,
        message: "Only event host, assigned artist, or admin can create group chat",
      });
    }

    const incomingMembers = (members || []).map((id) => String(id));
    const uniqueMembers = [...new Set([creatorId, ...incomingMembers])]; // remove duplicate members

    const existingUsers = await User.find({ _id: { $in: uniqueMembers } }).select("_id");
    if (existingUsers.length !== uniqueMembers.length) {
      return res.status(400).json({
        success: false,
        message: "One or more members are invalid users",
      });
    }

    const existingGroup = await Chat.findOne({ type: "GROUP", event: eventId });
    if (existingGroup) {
      return res.status(200).json({
        success: true,
        chat: existingGroup,
      });
    }

    const chat = await Chat.create({
      type: "GROUP",
      members: uniqueMembers,
      admins: [creatorId],
      event: eventId,
    });

    return res.status(201).json({
      success: true,
      chat,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create group chat",
    });
  }
};

exports.getMyChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const includeChatId = req.query.includeChatId;
    const baseFilter = { members: userId };
    const chatVisibilityFilter = includeChatId
      ? {
          $or: [
            { lastMessage: { $exists: true, $ne: "" } },
            { _id: includeChatId },
          ],
        }
      : { lastMessage: { $exists: true, $ne: "" } };

    const chats = await Chat.find({
      ...baseFilter,
      ...chatVisibilityFilter,
    })
      .sort({ updatedAt: -1 })
      .populate("members", "firstName lastName image");

    const chatsWithUnread = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await Message.countDocuments({
          chat: chat._id,
          sender: { $ne: userId },
          readBy: { $ne: userId },
          isDeleted: false,
        });

        return {
          ...chat.toObject(),
          unreadCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      chats: chatsWithUnread,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch chats",
    });
  }
};

exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 50);
    const before = req.query.before;
    const filter = { chat: chatId };

    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(filter)
      .populate("sender", "firstName lastName image")
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = messages.length > limit;
    const pageItems = hasMore ? messages.slice(0, limit) : messages;
    const orderedMessages = pageItems.reverse();

    return res.status(200).json({
      success: true,
      messages: orderedMessages,
      pagination: {
        hasMore,
        nextBefore: orderedMessages[0]?.createdAt || null,
        limit,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
};

exports.getChatMode = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await Chat.findById(chatId).select("members type");
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    const isMember = chat.members.some((id) => id.toString() === userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Not allowed in this chat",
      });
    }

    if (chat.type === "GROUP") {
      return res.status(200).json({
        success: true,
        chatMode: "active",
        bookingStatus: null,
      });
    }

    const booking = await Booking.findOne({ chat: chatId }).sort({ createdAt: -1 });

    let chatMode = "blocked";
    if (booking) {
      if (["PENDING", "COUNTERED", "ACCEPTED"].includes(booking.status)) {
        chatMode = "active";
      } else if (booking.status === "COMPLETED") {
        chatMode = "readonly";
      }
    }

    return res.status(200).json({
      success: true,
      chatMode,
      bookingStatus: booking?.status || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch chat mode",
    });
  }
};

exports.addGroupMember = async (req, res) => {
  try {
    if (req.chatReadOnly) {
      return res.status(403).json({
        success: false,
        message: "Chat is read-only for completed booking",
      });
    }

    const { chatId } = req.body;
    const newMemberId = req.body.newMemberId || req.body.userId;
    const requesterId = req.user.id;

    const chat = await Chat.findById(chatId);
    if (!chat || chat.type !== "GROUP") {
      return res.status(404).json({
        success: false,
        message: "Group chat not found",
      });
    }

    // admin check
    const isAdmin = chat.admins.some((id) => id.toString() === requesterId);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only admin can add members",
      });
    }

    // already member
    if (chat.members.some((id) => id.toString() === newMemberId)) {
      return res.status(400).json({
        success: false,
        message: "User already in group",
      });
    }

    chat.members.push(newMemberId);
    await chat.save();
    getIO().to(chatId).emit("groupUpdated", {
      type: "MEMBER_ADDED",
      userId: newMemberId,
    });
    return res.status(200).json({
      success: true,
      message: "Member added to group",
      chat,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to add member",
    });
  }
};

exports.removeGroupMember = async (req, res) => {
  try {
    if (req.chatReadOnly) {
      return res.status(403).json({
        success: false,
        message: "Chat is read-only for completed booking",
      });
    }

    const { chatId } = req.body;
    const memberId = req.body.memberId || req.body.userId;
    const requesterId = req.user.id;

    const chat = await Chat.findById(chatId);
    if (!chat || chat.type !== "GROUP") {
      return res.status(404).json({
        success: false,
        message: "Group chat not found",
      });
    }

    // admin check
    const isAdmin = chat.admins.some((id) => id.toString() === requesterId);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only admin can remove members",
      });
    }

    // prevent removing admin
    if (chat.admins.some((id) => id.toString() === memberId)) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove admin from group",
      });
    }

    chat.members = chat.members.filter(
      (id) => id.toString() !== memberId
    );

    await chat.save();

    getIO().to(chatId).emit("groupUpdated", {
      type: "MEMBER_REMOVED",
      userId: memberId,
    });

    return res.status(200).json({
      success: true,
      message: "Member removed from group",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to remove member",
    });
  }
};
