import { useState, useEffect } from "react";
import { notificationAPI } from "../services/api";
import { notifIcon, fmtDate, fmtTime } from "../utils/helpers";
import toast from "react-hot-toast";

export default function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = () => {
    notificationAPI
      .getAll()
      .then((res) => setNotifs(res.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(fetchNotifs, []);

  const markRead = async (id) => {
    try {
      await notificationAPI.markRead({ notificationId: id });
      setNotifs((p) => p.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      window.dispatchEvent(new Event("notif-read"));
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const markAll = () => {
    notifs
      .filter((n) => !n.isRead)
      .forEach((n) => notificationAPI.markRead({ notificationId: n._id }).catch(() => {}));
    setNotifs((p) => p.map((n) => ({ ...n, isRead: true })));
    window.dispatchEvent(new Event("notif-read"));
  };

  const unread = notifs.filter((n) => !n.isRead).length;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-content">
          <h1>Notifications 🔔</h1>
          <p>
            {unread} unread notification{unread !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <div className="main-content">
        <div style={{ maxWidth: 700 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "1rem",
            }}
          >
            {unread > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={markAll}>
                Mark all as read
              </button>
            )}
          </div>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {loading ? (
              <div className="text-center" style={{ padding: "3rem" }}>
                <span className="spinner" /> Loading…
              </div>
            ) : notifs.length === 0 ? (
              <div className="empty-state">
                <span className="emoji">🔔</span>
                <h3>All caught up!</h3>
              </div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n._id}
                  className={`notif-item ${!n.isRead ? "unread" : ""}`}
                  onClick={() => markRead(n._id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <div className="notif-icon">{notifIcon(n.type)}</div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: ".85rem",
                        fontWeight: !n.isRead ? 600 : 400,
                        lineHeight: 1.4,
                      }}
                    >
                      {n.message}
                    </div>
                    <div
                      style={{
                        fontSize: ".75rem",
                        color: "var(--text-muted)",
                        marginTop: 3,
                      }}
                    >
                      {fmtDate(n.createdAt)} · {fmtTime(n.createdAt)}
                    </div>
                  </div>
                  {!n.isRead && (
                    <div className="notif-dot" style={{ marginTop: 8 }}></div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
