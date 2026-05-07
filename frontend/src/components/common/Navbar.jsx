import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import useLang from "../../hooks/useLang";
import { initials } from "../../utils/helpers";
import { notificationAPI, messageAPI } from "../../services/api";
import { getSocket } from "../../services/socket";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, resolved, logout } = useAuth();
  const { t, toggle } = useLang();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const ref = useRef(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const canRunProtectedEffects = Boolean(user && resolved);

  const refreshNotifCount = useCallback(() => {
    if (!canRunProtectedEffects) return;
    notificationAPI
      .getAll()
      .then((res) => {
        const notifs = res.notifications || [];
        setUnreadNotifs(notifs.filter((n) => !n.isRead).length);
      })
      .catch(() => {});
  }, [canRunProtectedEffects]);

  useEffect(() => {
    if (!canRunProtectedEffects) return;
    refreshNotifCount();
    messageAPI
      .getStatus(user._id)
      .then((res) => {
        setUnreadMsgs(res.unreadCount || 0);
      })
      .catch(() => {});
  }, [canRunProtectedEffects, location.pathname, refreshNotifCount, user?._id]);

  useEffect(() => {
    const handler = () => {
      if (!canRunProtectedEffects) return;
      messageAPI
        .getStatus(user._id)
        .then((res) => {
          setUnreadMsgs(res.unreadCount || 0);
        })
        .catch(() => {});
    };
    window.addEventListener("chat-updated", handler);
    return () => window.removeEventListener("chat-updated", handler);
  }, [canRunProtectedEffects, user?._id]);

  useEffect(() => {
    if (!canRunProtectedEffects || !user?._id) return;

    const socket = getSocket();
    if (!socket) return;

    const refreshUnread = () => {
      messageAPI
        .getStatus(user._id)
        .then((res) => {
          setUnreadMsgs(res.unreadCount || 0);
        })
        .catch(() => {});
    };

    socket.emit("join", user._id);
    socket.emit("userOnline", user._id);
    socket.on("newMessage", refreshUnread);
    socket.on("readReceipt", refreshUnread);
    socket.on("messageDeleted", refreshUnread);

    return () => {
      socket.off("newMessage", refreshUnread);
      socket.off("readReceipt", refreshUnread);
      socket.off("messageDeleted", refreshUnread);
    };
  }, [canRunProtectedEffects, user?._id]);

  useEffect(() => {
    const handler = () => refreshNotifCount();
    window.addEventListener("notif-read", handler);
    return () => window.removeEventListener("notif-read", handler);
  }, [refreshNotifCount]);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const go = (path) => {
    navigate(path);
    setOpen(false);
    setMobileOpen(false);
  };

  return (
    <nav className="navbar" style={{ position: "sticky" }}>
      <button
        className="navbar-brand"
        onClick={() => navigate("/")}
        aria-label={t("nav_home_aria")}
      >
        <span className="om">ॐ</span> KirtanSarthi
      </button>

      <button
        className="nav-hamburger"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label={mobileOpen ? t("nav_close_menu") : t("nav_open_menu")}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? "✕" : "☰"}
      </button>

      <div className={`navbar-links${mobileOpen ? " open" : ""}`}>
        <button className="nav-link" onClick={() => go("/artists")}>
          {t("find_artists")}
        </button>
        <button className="nav-link" onClick={() => go("/events")}>
          {t("events")}
        </button>
        <button className="nav-link" onClick={() => go("/about")}>
          {t("about")}
        </button>
        <button className="nav-link" onClick={() => go("/contact")}>
          {t("contact")}
        </button>

        <button
          onClick={toggle}
          style={{
            padding: "4px 11px",
            borderRadius: 999,
            border: "1.5px solid var(--border)",
            background: "var(--cream)",
            fontSize: ".82rem",
            fontWeight: 600,
            cursor: "pointer",
            color: "var(--brown)",
            fontFamily: "'DM Sans',sans-serif",
            transition: "all .2s",
            lineHeight: 1.6,
          }}
          title={t("nav_switch_language")}
        >
          {t("lang_toggle_label")}
        </button>

        {!user ? (
          <>
            <button className="nav-link" onClick={() => go("/login")}>
              {t("login")}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => go("/signup")}
            >
              {t("sign_up")}
            </button>
          </>
        ) : (
          <>
            {user.accountType === "USER" && (
              <button
                className="nav-link"
                style={{ fontSize: "1.1rem", padding: "6px 8px" }}
                title={t("ai_assistant")}
                onClick={() => go("/ai-chat")}
              >
                🤖
              </button>
            )}
            <div className="badge-icon">
              <button
                className="nav-link"
                style={{ fontSize: "1.2rem", padding: "6px 10px" }}
                aria-label={t("nav_notifications")}
                onClick={() =>
                  go(
                    user.accountType === "ADMIN"
                      ? "/admin/notifications"
                      : "/notifications"
                  )
                }
              >
                🔔
              </button>
              {unreadNotifs > 0 && (
                <span className="badge-count pulse" aria-label={`${unreadNotifs} unread`}>
                  {unreadNotifs}
                </span>
              )}
            </div>
            <div className="badge-icon">
              <button
                className="nav-link"
                style={{ fontSize: "1.2rem", padding: "6px 10px" }}
                aria-label={t("nav_messages")}
                onClick={() => go("/chat")}
              >
                💬
              </button>
              {unreadMsgs > 0 && (
                <span
                  className="badge-count pulse"
                  aria-label={`${unreadMsgs} unread messages`}
                >
                  {unreadMsgs}
                </span>
              )}
            </div>
            <div style={{ position: "relative" }} ref={ref}>
              <button
                className="nav-avatar"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="true"
                aria-expanded={open}
                aria-label={t("nav_account_menu")}
                style={user?.image ? { padding: 0, overflow: "hidden" } : {}}
              >
                {user?.image ? (
                  <img
                    src={user.image}
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  initials(user)
                )}
              </button>
              {open && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    background: "var(--white)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    boxShadow: "0 8px 30px var(--shadow)",
                    minWidth: 230,
                    zIndex: 600,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: ".88rem" }}>
                      {user.firstName} {user.lastName}
                    </div>
                    <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>
                      {user.email}
                    </div>
                    <span className="badge badge-saffron" style={{ marginTop: 4 }}>
                      {user.accountType}
                    </span>
                  </div>

                  {user.accountType === "USER" && (
                    <>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/dashboard")}>
                        🏠 {t("dashboard")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/bookings")}>
                        📖 {t("my_bookings")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/profile/edit")}>
                        ✏️ {t("update_profile")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/ai-chat")}>
                        🤖 {t("ai_assistant")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/events")}>
                        🪔 {t("events")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/chat")}>
                        💬 {t("messages")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/notifications")}>
                        🔔 {t("notifications")}
                      </button>
                    </>
                  )}

                  {user.accountType === "ARTIST" && (
                    <>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/artist/dashboard")}>
                        🏠 {t("dashboard")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/artist/requests")}>
                        📨 {t("requests")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/artist/availability")}>
                        📆 {t("availability")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/artist/performance")}>
                        📊 {t("performance")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/events")}>
                        🪔 {t("events")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/events/create")}>
                        ✨ {t("create_event")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/chat")}>
                        💬 {t("messages")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/artist/profile/edit")}>
                        ✏️ {t("update_profile")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/notifications")}>
                        🔔 {t("notifications")}
                      </button>
                    </>
                  )}

                  {user.accountType === "ADMIN" && (
                    <>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/admin/dashboard")}>
                        🏠 {t("admin_dashboard")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/admin/approvals")}>
                        ✅ {t("approvals")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/admin/users")}>
                        👥 {t("users")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/admin/bookings")}>
                        📖 {t("all_bookings")}
                      </button>
                      <button
                        role="menuitem"
                        className="sidebar-item"
                        onClick={() => go("/admin/moderation")}
                        style={{ color: "#b91c1c", fontWeight: 600 }}
                      >
                        🛡️ {t("moderation")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/events")}>
                        🪔 {t("events")}
                      </button>
                      <button role="menuitem" className="sidebar-item" onClick={() => go("/events/create")}>
                        ✨ {t("create_event")}
                      </button>
                      <button
                        role="menuitem"
                        className="sidebar-item"
                        onClick={() => go("/admin/notifications")}
                      >
                        🔔 {t("notifications")}
                      </button>
                    </>
                  )}

                  <div style={{ borderTop: "1px solid var(--border)" }}>
                    <button
                      role="menuitem"
                      className="sidebar-item"
                      style={{ color: "#e53e3e" }}
                      onClick={() => {
                        logout();
                        go("/");
                      }}
                    >
                      🚪 {t("logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
