import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { chatAPI, messageAPI } from "../services/api";
import { getSocket } from "../services/socket";
import { fmtDate, fmtTime, initials } from "../utils/helpers";
import GroupMembersPanel from "../components/common/GroupMembersPanel";
import useLang from "../hooks/useLang";

const PAGE_SIZE = 30;

export default function Chat() {
  const { t } = useLang();
  const { user } = useSelector((s) => s.auth);
  const [searchParams] = useSearchParams();  
  const openChatId = searchParams.get("open");

  const messagesRef = useRef(null);
  const bottomRef = useRef(null);
  const activeChatRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const normalizeId = useCallback((value) => { // convert different ID formats to a consistent string format
    if (!value) return null;
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      return value._id?.toString?.() || value.id?.toString?.() || null;
    }
    return String(value);
  }, []);

  const currentUserId = normalizeId(user);

  const [chatList, setChatList] = useState([]);// list of user's chats with metadata (last message, unread count, etc.)
  const [activeChat, setActiveChat] = useState(null);// chatId of currently open chat
  const [input, setInput] = useState("");// current value of the message input field
  const [search, setSearch] = useState("");// search query for filtering chats in the sidebar
  const [msgs, setMsgs] = useState({});//store messages for each chat, keyed by chatId, to allow caching and instant updates without refetching the entire list
//   {
//   chat123: [message1, message2],
//   chat456: [message1]
// }
  const [pagination, setPagination] = useState({});//store pagination metadata for each chat's messages, keyed by chatId, to manage infinite scrolling and loading more messages
//   {
//  chat123: {
//    hasMore: true,
//    nextBefore: "2025-03-01"
//  }
// }
  const [presence, setPresence] = useState({}); //track online/offline status and last seen time of other users, keyed by userId, to display accurate presence information in the UI
  const [typingUsers, setTypingUsers] = useState({});//track which users are currently typing in each chat, keyed by chatId, to show "typing..." indicators in the UI
  const [showMembers, setShowMembers] = useState(false);//for group chats, whether to show the members panel on the right side
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);//whether we are currently loading more messages for infinite scroll
  const [uploading, setUploading] = useState(false);// whether we are currently uploading an attachment, to disable inputs and show appropriate UI feedback
  const [mobileListOpen, setMobileListOpen] = useState(true);// on smaller screens, whether the chat list sidebar is open (true) or we are showing the active chat (false)
  const MOBILE_BREAKPOINT = 860;
  const [isMobileView, setIsMobileView] = useState(typeof window !== "undefined" ? window.innerWidth <= MOBILE_BREAKPOINT : false);
  const [previewImage, setPreviewImage] = useState(null);// when a user clicks on an image message, store the URL here to show it in a larger preview modal

  const refreshUnreadCount = useCallback(() => { // after marking messages as read or receiving new messages,
  //  we need to refresh the unread count in the chat list and notify other components (like a header badge) that the count has changed
    window.dispatchEvent(new Event("chat-updated"));
  }, []);

  const getChatPreviewLabel = useCallback((value) => {
    if (!value) return "No messages yet";
    if (/^https?:\/\/.+\/upload\//i.test(value)) return "Photo";
    return value;
  }, []);

  const getMessagePreview = useCallback((message) => {
    if (!message) return "No messages yet";
    if ("lastMessage" in message) return getChatPreviewLabel(message.lastMessage);
    if (message.type === "image") return "Photo";
    if (message.type === "audio") return "Voice message";
    return message.content || "No messages yet";
  }, [getChatPreviewLabel]);

  const getOtherMember = useCallback((chat) => {
    if (!chat || chat.type === "GROUP") return null;
    return chat.members?.find((member) => normalizeId(member) !== currentUserId) || null;
  }, [currentUserId, normalizeId]);

  const getChatSearchName = useCallback((chat) => {
    if (!chat) return "";
    if (chat.type === "GROUP") return chat.name || "Group";
    const other = getOtherMember(chat) || {};
    return `${other.firstName || ""} ${other.lastName || ""}`.trim() || "Chat";
  }, [getOtherMember]);

  const refreshChats = useCallback(async () => {
    const res = await chatAPI.getMyChats(openChatId ? { includeChatId: openChatId } : undefined);
    const chats = res.chats || [];

    setChatList((prev) => {
      const previous = new Map(prev.map((chat) => [chat._id, chat]));
      return chats.map((chat) => ({
        ...chat,
        chatStatus: previous.get(chat._id)?.chatStatus || null,
      }));
    });

    setActiveChat((currentActiveChat) => {
      if (openChatId && chats.some((chat) => chat._id === openChatId)) return openChatId;
      if (currentActiveChat && chats.some((chat) => chat._id === currentActiveChat)) return currentActiveChat;
      // On small screens, don't auto-open the first chat — show chat list like WhatsApp
      try {
        if (typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT) return null;
      } catch (e) {
        // ignore
      }
      return chats[0]?._id || null;
    });
  }, [openChatId]);

  const filteredChats = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return chatList;
    return chatList.filter((chat) => {
      const name = getChatSearchName(chat).toLowerCase();
      const preview = (chat.lastMessage || "").toLowerCase();
      return name.includes(q) || preview.includes(q);
    });
  }, [chatList, getChatSearchName, search]);

  const mergeMessages = useCallback((existing, incoming, { prepend = false } = {}) => {
    const map = new Map();
    const source = prepend ? [...incoming, ...existing] : [...existing, ...incoming];
    source.forEach((message) => {
      const key = message._id || message.clientId;
      if (key) map.set(key, message);
    });
    return Array.from(map.values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, []);

  const loadMessages = useCallback(async (chatId, options = {}) => {
    if (!chatId) return;

    const { before = null, prepend = false } = options;
    const res = await chatAPI.getMessages(chatId, {
      limit: PAGE_SIZE,
      ...(before ? { before } : {}),
    });

    const messages = res.messages || [];
    const paginationMeta = res.pagination || {};

    setMsgs((prev) => ({
      ...prev,
      [chatId]: prepend
        ? mergeMessages(prev[chatId] || [], messages, { prepend: true })
        : mergeMessages([], messages),
    }));

    setPagination((prev) => ({
      ...prev,
      [chatId]: paginationMeta,
    }));
  }, [mergeMessages]);

  const loadChatMode = useCallback(async (chatId) => {
    if (!chatId) return;
    const res = await chatAPI.getChatMode(chatId);
    const mode = res.chatMode;
    setChatList((prev) =>
      prev.map((chat) => (
        chat._id === chatId
          ? { ...chat, chatStatus: mode === "active" ? null : mode }
          : chat
      ))
    );
  }, []);

  const markActiveChatRead = useCallback(async (chatId) => {
    if (!chatId || !currentUserId) return;

    try {
      await messageAPI.markRead({ chatId });
      setMsgs((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map((message) => {
          const readBy = Array.isArray(message.readBy) ? message.readBy : [];
          const alreadyRead = readBy.some((entry) => normalizeId(entry) === currentUserId);
          return alreadyRead ? message : { ...message, readBy: [...readBy, currentUserId] };
        }),
      }));
      setChatList((prev) => prev.map((chat) => (
        chat._id === chatId ? { ...chat, unreadCount: 0 } : chat
      )));
      refreshUnreadCount();
    } catch {
      // Ignore read sync errors.
    }
  }, [currentUserId, normalizeId, refreshUnreadCount]);

  useEffect(() => {
    let cancelled = false;
    refreshChats()
      .catch(() => {
        if (!cancelled) toast.error("Failed to load chats");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshChats]);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    if (!activeChat) return;

    loadMessages(activeChat).catch(() => toast.error("Failed to load messages"));
    loadChatMode(activeChat).catch(() => toast.error("Failed to fetch chat status"));
  }, [activeChat, loadChatMode, loadMessages]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !currentUserId) return;

    socket.emit("join", currentUserId);
    socket.emit("userOnline", currentUserId);

    const handleNewMessage = (message) => {
      const chatId = normalizeId(message.chat);
      if (!chatId) return;
      const senderId = normalizeId(message.sender);

      setMsgs((prev) => {
        const currentMessages = prev[chatId] || [];
        const reconciled = message.clientId
          ? currentMessages.map((entry) => (
            entry.clientId && entry.clientId === message.clientId
              ? { ...message, status: "sent" }
              : entry
          ))
          : currentMessages;

        const exists = reconciled.some((entry) => entry._id === message._id);
        const nextMessages = exists ? reconciled : [...reconciled, { ...message, status: "sent" }];
        return {
          ...prev,
          [chatId]: nextMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
        };
      });

      setChatList((prev) => {
        const updated = prev.map((chat) =>
          chat._id === chatId
            ? {
              ...chat,
              lastMessage: getMessagePreview(message),
              unreadCount:
                chatId === activeChatRef.current || senderId === currentUserId
                  ? 0
                  : (chat.unreadCount || 0) + 1,
            }
            : chat
        );
        const changed = updated.find((chat) => chat._id === chatId);
        return changed ? [changed, ...updated.filter((chat) => chat._id !== chatId)] : updated;
      });

      if (chatId === activeChatRef.current) {
        markActiveChatRead(chatId);
      } else if (senderId !== currentUserId) {
        refreshUnreadCount();
      }
    };

    const handleReadReceipt = ({ chatId, userId }) => {
      setMsgs((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map((message) => {
          const readBy = Array.isArray(message.readBy) ? message.readBy : [];
          const alreadyRead = readBy.some((entry) => normalizeId(entry) === normalizeId(userId));
          return alreadyRead ? message : { ...message, readBy: [...readBy, userId] };
        }),
      }));
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMsgs((prev) => {
        const next = {};
        Object.entries(prev).forEach(([chatId, chatMessages]) => {
          next[chatId] = chatMessages.map((message) => (
            message._id === messageId
              ? { ...message, content: "This message was deleted", isDeleted: true }
              : message
          ));
        });
        return next;
      });
    };

    const handleMessageError = ({ clientId, message }) => {
      if (!clientId) {
        toast.error(message || "Message send failed");
        return;
      }
      setMsgs((prev) => {
        const next = {};
        Object.entries(prev).forEach(([chatId, chatMessages]) => {
          next[chatId] = chatMessages.map((entry) => (
            entry.clientId === clientId
              ? { ...entry, status: "failed", errorMessage: message || "Failed to send" }
              : entry
          ));
        });
        return next;
      });
      toast.error(message || "Message send failed");
    };

    const handleTyping = ({ userId, chatId }) => {
      if (!chatId || normalizeId(userId) === currentUserId) return;
      setTypingUsers((prev) => ({ ...prev, [chatId]: userId }));
    };

    const handleStopTyping = ({ userId, chatId }) => {
      if (!chatId || normalizeId(userId) === currentUserId) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (normalizeId(next[chatId]) === normalizeId(userId)) delete next[chatId];
        return next;
      });
    };

    const handleUserStatus = ({ userId, isOnline }) => {
      setPresence((prev) => ({
        ...prev,
        [normalizeId(userId)]: {
          ...(prev[normalizeId(userId)] || {}),
          isOnline,
          lastSeen: isOnline ? null : new Date().toISOString(),
        },
      }));
    };

    const handleGroupUpdated = () => {
      refreshChats().catch(() => {});
      if (activeChatRef.current) loadMessages(activeChatRef.current).catch(() => {});
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("readReceipt", handleReadReceipt);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("messageError", handleMessageError);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    socket.on("userStatus", handleUserStatus);
    socket.on("groupUpdated", handleGroupUpdated);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("readReceipt", handleReadReceipt);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("messageError", handleMessageError);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.off("userStatus", handleUserStatus);
      socket.off("groupUpdated", handleGroupUpdated);
    };
  }, [currentUserId, getMessagePreview, loadMessages, markActiveChatRead, normalizeId, refreshChats, refreshUnreadCount]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !activeChat) return;
    socket.emit("joinChat", activeChat);
    markActiveChatRead(activeChat);
  }, [activeChat, markActiveChatRead]);

  const current = chatList.find((chat) => chat._id === activeChat);
  const isGroup = current?.type === "GROUP";
  const otherMember = useMemo(() => getOtherMember(current), [current, getOtherMember]);
  const otherMemberId = normalizeId(otherMember);
  const currentMsgs = useMemo(() => msgs[activeChat] || [], [activeChat, msgs]);
  const currentPagination = pagination[activeChat] || {};
  const hasPendingMessage = useMemo(
    () => currentMsgs.some((message) => message.status === "pending"),
    [currentMsgs]
  );

  useEffect(() => {
    if (!otherMemberId || isGroup) return;

    messageAPI.getStatus(otherMemberId)
      .then((res) => {
        setPresence((prev) => ({
          ...prev,
          [otherMemberId]: {
            isOnline: !!res.isOnline,
            lastSeen: res.lastSeen || null,
          },
        }));
      })
      .catch(() => {});
  }, [isGroup, otherMemberId]);

  useEffect(() => {
    if (!activeChat) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;

    if (!input.trim()) {
      socket.emit("stopTyping", { chatId: activeChat, userId: currentUserId });
      return undefined;
    }

    socket.emit("typing", { chatId: activeChat, userId: currentUserId });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", { chatId: activeChat, userId: currentUserId });
    }, 1200);

    return () => clearTimeout(typingTimeoutRef.current);
  }, [activeChat, currentUserId, input]);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobileView(mobile);
      if (!mobile) setMobileListOpen(true);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat, currentMsgs.length]);

  const handleLoadOlder = async () => {
    if (!activeChat || !currentPagination.hasMore || loadingMore) return;
    const container = messagesRef.current;
    const previousHeight = container?.scrollHeight || 0;
    setLoadingMore(true);
    try {
      await loadMessages(activeChat, {
        before: currentPagination.nextBefore,
        prepend: true,
      });
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - previousHeight + container.scrollTop;
        }
      });
    } catch {
      toast.error("Failed to load older messages");
    } finally {
      setLoadingMore(false);
    }
  };

  const onMessagesScroll = (e) => {
    if (e.currentTarget.scrollTop <= 40) {
      handleLoadOlder();
    }
  };

  const emitMessage = useCallback((payload, retryMessage = null) => {
    if (!activeChat) return null;
    const content = retryMessage ? retryMessage.content : payload.content;
    if (!content) return null;

    const selectedChat = chatList.find((chat) => chat._id === activeChat);
    if (selectedChat?.chatStatus) return null;

    const socket = getSocket();
    if (!socket) {
      toast.error("Socket connection not available");
      return null;
    }

    const clientId = retryMessage?.clientId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage = {
      _id: retryMessage?._id || clientId,
      clientId,
      chat: activeChat,
      sender: user,
      content,
      type: payload.type || retryMessage?.type || "text",
      createdAt: retryMessage?.createdAt || new Date().toISOString(),
      readBy: [currentUserId],
      status: "pending",
      isOptimistic: true,
    };

    setMsgs((prev) => ({
      ...prev,
      [activeChat]: retryMessage
        ? (prev[activeChat] || []).map((message) => (
          message.clientId === clientId
            ? optimisticMessage
            : message
        ))
        : mergeMessages(prev[activeChat] || [], [optimisticMessage]),
    }));
    setChatList((prev) => prev.map((chat) => (
      chat._id === activeChat
        ? { ...chat, lastMessage: getMessagePreview(optimisticMessage), unreadCount: 0 }
        : chat
    )));

    socket.emit("sendMessage", {
      chatId: activeChat,
      content,
      type: payload.type || retryMessage?.type || "text",
      clientId,
    });

    return clientId;
  }, [activeChat, chatList, currentUserId, getMessagePreview, mergeMessages, user]);

  const send = (retryMessage = null) => {
    const content = retryMessage ? retryMessage.content : input.trim();
    const clientId = emitMessage({ content, type: retryMessage?.type || "text" }, retryMessage);
    if (clientId && !retryMessage) setInput("");
  };

  const sendAttachment = async (file, fallbackType = "image") => {
    if (!activeChat || !file) return;

    const formData = new FormData();
    formData.append("chatId", activeChat);
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await chatAPI.upload(formData);
      emitMessage({
        content: res.fileUrl,
        type: res.fileType === "audio" ? "audio" : fallbackType,
      });
    } catch (error) {
      toast.error(error.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAttachmentSelection = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const fallbackType = file.type.startsWith("audio/") ? "audio" : "image";
    await sendAttachment(file, fallbackType);
  };

  const switchChat = (id) => {
    const socket = getSocket();
    if (socket && activeChatRef.current && currentUserId) {
      socket.emit("stopTyping", { chatId: activeChatRef.current, userId: currentUserId });
    }
    setActiveChat(id);
    setShowMembers(false);
    setTypingUsers((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      setMobileListOpen(false);
    }
  };

  const getOtherName = (chat) => {
    if (!chat) return "Chat";
    if (chat.type === "GROUP") return chat.name || "Group";
    const other = getOtherMember(chat) || {};
    return `${other.firstName || ""} ${other.lastName || ""}`.trim() || "Chat";
  };

  const getOtherInitials = (chat) => {
    if (!chat) return "?";
    if (chat.type === "GROUP") return "GP";
    return initials(getOtherMember(chat));
  };

  const formatLastSeen = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const timeLabel = fmtTime(date);

    if (date >= startOfToday) return `last seen today at ${timeLabel}`;
    if (date >= startOfYesterday) return `last seen yesterday at ${timeLabel}`;

    const sameYear = date.getFullYear() === now.getFullYear();
    const dateLabel = date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      ...(sameYear ? {} : { year: "numeric" }),
    });

    return `last seen on ${dateLabel} at ${timeLabel}`;
  };

  const formatPresence = () => {
    if (isGroup) return `${current?.members?.length || 0} members`;
    if (!otherMemberId) return "Active conversation";
    if (typingUsers[activeChat]) return "typing...";

    const state = presence[otherMemberId];
    if (!state) return "Offline";
    if (state.isOnline) return "online";
    if (state.lastSeen) return formatLastSeen(state.lastSeen) || "offline";
    return "offline";
  };

  const getMessageStatus = (message) => {
    if (message.status === "pending") return { icon: "...", className: "pending" };
    if (message.status === "failed") return { icon: "!", className: "failed" };
    if (!isGroup && normalizeId(message.sender) === currentUserId) {
      const readBy = (message.readBy || []).map(normalizeId).filter(Boolean);
      const recipientHasRead = otherMemberId && readBy.includes(otherMemberId);
      if (recipientHasRead) return { icon: "\u2713\u2713", className: "read" };
      if (presence[otherMemberId]?.isOnline) return { icon: "\u2713\u2713", className: "delivered" };
      return { icon: "\u2713", className: "sent" };
    }
    if (isGroup && normalizeId(message.sender) === currentUserId) {
      const readCount = (message.readBy || []).map(normalizeId).filter(Boolean).length;
      return readCount > 1 ? { icon: "\u2713\u2713", className: "read" } : { icon: "\u2713", className: "sent" };
    }
    return null;
  };

  const decoratedMessages = useMemo(() => {
    const items = [];
    let previousDate = null;
    currentMsgs.forEach((message) => {
      const dayKey = new Date(message.createdAt).toDateString();
      if (dayKey !== previousDate) {
        items.push({
          kind: "separator",
          id: `sep-${dayKey}`,
          label: fmtDate(message.createdAt),
        });
        previousDate = dayKey;
      }
      items.push({ kind: "message", data: message });
    });
    return items;
  }, [currentMsgs]);

  if (loading) {
    return (
      <div className="text-center" style={{ padding: "4rem" }}>
        <span className="spinner" /> Loading...
      </div>
    );
  }

  return (
    <div className="main-content chat-page-shell" style={{ paddingTop: "1.25rem" }}>
      <div className="chat-page-head">
        <h2 className="section-title mb-1">{t("messages")}</h2>
        <p className="section-sub mb-2">Chat with your artists and groups</p>
      </div>

      <div className={`chat-layout${isGroup && showMembers ? " has-members" : ""} ${isMobileView && !mobileListOpen ? "mobile-show-main" : ""}`}>
        <div className={`chat-list${mobileListOpen ? " open" : ""}`}>
          <div className="chat-list-title">{t("messages")}</div>
          <div className="chat-search-wrap">
            <input
              className="form-input chat-search-input"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {filteredChats.length === 0 && <div className="chat-empty-list">No conversations found</div>}
          {filteredChats.map((chat) => (
            <button
              key={chat._id}
              className={`chat-item ${activeChat === chat._id ? "active" : ""}`}
              onClick={() => switchChat(chat._id)}
              style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: 0 }}
            >
              <div className="chat-item-inner">
                <div
                  className="nav-avatar"
                  style={{
                    width: 44,
                    height: 44,
                    fontSize: ".95rem",
                    flexShrink: 0,
                    background: chat.type === "GROUP"
                      ? "linear-gradient(135deg,#1a0a4e,var(--saffron-deep))"
                      : "linear-gradient(135deg,var(--saffron),var(--gold))",
                  }}
                >
                  {getOtherInitials(chat)}
                </div>
                <div className="chat-item-copy">
                  <div className="chat-item-topline">
                    <div className="chat-name">{getOtherName(chat)}</div>
                    <div className="chat-item-trailing">
                      <div className="chat-item-time">
                        {chat.updatedAt ? fmtTime(chat.updatedAt) : ""}
                      </div>
                      {!!chat.unreadCount && (
                        <span className="chat-unread-badge">
                          {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="chat-item-subline">
                    <div className="chat-preview">{getMessagePreview(chat)}</div>
                    {chat.type === "GROUP" && (
                      <span className="badge badge-blue chat-type-badge">GROUP</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className={`chat-main${mobileListOpen ? " mobile-hidden" : ""}`}>
          {current && (
            <div className="chat-header">
              <button
                className="chat-mobile-back"
                onClick={() => setMobileListOpen(true)}
                type="button"
              >
                Back
              </button>
              <div
                className="nav-avatar"
                style={{
                  width: 42,
                  height: 42,
                  fontSize: ".95rem",
                  background: isGroup
                    ? "linear-gradient(135deg,#1a0a4e,var(--saffron-deep))"
                    : "linear-gradient(135deg,var(--saffron),var(--gold))",
                }}
              >
                {getOtherInitials(current)}
              </div>
              <div className="chat-header-copy">
                <div className="chat-header-name">{getOtherName(current)}</div>
                <div className={`chat-header-meta${typingUsers[activeChat] ? " typing" : ""}`}>{formatPresence()}</div>
              </div>
              {isGroup && (
                <button
                  className={`btn btn-sm ${showMembers ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setShowMembers((state) => !state)}
                >
                  {showMembers ? "Hide" : t("group_members")}
                </button>
              )}
            </div>
          )}

          <div className="chat-messages" ref={messagesRef} onScroll={onMessagesScroll}>
            {loadingMore && <div className="chat-loader-chip">Loading older messages...</div>}
            {!current && <div className="chat-empty-state">Select a conversation to start chatting</div>}
            {decoratedMessages.length === 0 && current && (
              <div className="chat-empty-state chat-empty-thread">No messages yet. Say Namaste!</div>
            )}
            {decoratedMessages.map((entry) => {
              if (entry.kind === "separator") {
                return (
                  <div key={entry.id} className="chat-date-separator">
                    <span>{entry.label}</span>
                  </div>
                );
              }

              const message = entry.data;
              const senderId = normalizeId(message.sender);
              const isMine = senderId === currentUserId;
              const status = getMessageStatus(message);

              return (
                <div key={message._id || message.clientId} className={`message-row ${isMine ? "mine" : "theirs"}`}>
                  <div className={`message ${isMine ? "mine" : "theirs"}${message.status === "failed" ? " failed" : ""}`}>
                    <div className="message-bubble">
                      {message.type === "image" ? (
                        <button
                          type="button"
                          className="chat-image-button"
                          onClick={() => setPreviewImage(message.content)}
                        >
                          <img className="chat-image" src={message.content} alt="Shared media" />
                        </button>
                      ) : null}
                      {message.type === "audio" ? (
                        <audio className="chat-audio" controls src={message.content} />
                      ) : null}
                      {message.type === "text" || !message.type ? (
                        <span>{message.content}</span>
                      ) : null}
                      {message.status === "failed" && (
                        <button className="message-retry" onClick={() => send(message)}>
                          Retry
                        </button>
                      )}
                    </div>
                    <div className="message-meta">
                      <div className="message-time">{fmtTime(message.createdAt)}</div>
                      {isMine && status && (
                        <div className={`message-status ${status.className}`}>{status.icon}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {current?.chatStatus === "readonly" && (
            <div className="chat-status-banner readonly">This booking is completed. Chat is read-only.</div>
          )}
          {current?.chatStatus === "blocked" && (
            <div className="chat-status-banner blocked">Chat unavailable. Booking was cancelled or rejected.</div>
          )}

          {current && (
            <div className={`chat-input-bar${current?.chatStatus ? " is-" + current.chatStatus : ""}`}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,audio/*"
                hidden
                onChange={handleAttachmentSelection}
              />
              <button
                className="btn btn-outline chat-attach-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!!current?.chatStatus || uploading || hasPendingMessage}
              >
                +
              </button>
              <input
                className="form-input chat-input-field"
                style={{ flex: 1 }}
                placeholder={
                  current?.chatStatus === "blocked"
                    ? "Chat blocked"
                    : current?.chatStatus === "readonly"
                      ? "Chat is read-only"
                      : "Type a message..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !current?.chatStatus && send()}
                disabled={!!current?.chatStatus || hasPendingMessage || uploading}
                readOnly={!!current?.chatStatus}
              />
              <button
                className="btn btn-primary chat-send-btn"
                onClick={() => send()}
                disabled={!!current?.chatStatus || hasPendingMessage || uploading}
              >
                {uploading ? "Uploading..." : hasPendingMessage ? "Sending..." : "Send"}
              </button>
            </div>
          )}
        </div>

        {isGroup && showMembers && current && (
          <GroupMembersPanel
            className="group-members-panel"
            chatId={current._id}
            members={current.members || []}
            onUpdate={() => refreshChats().catch(() => {})}
          />
        )}
      </div>

      {previewImage && (
        <div className="chat-image-modal" onClick={() => setPreviewImage(null)} role="presentation">
          <button
            type="button"
            className="chat-image-close"
            onClick={() => setPreviewImage(null)}
          >
            Close
          </button>
          <img
            className="chat-image-modal-img"
            src={previewImage}
            alt="Shared media full view"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
