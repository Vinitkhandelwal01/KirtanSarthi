import { useState, useEffect } from "react";
import { notificationAPI } from "../../services/api";
import { notifIcon, fmtDate } from "../../utils/helpers";
import toast from "react-hot-toast";

export default function AdminNotifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationAPI
      .getAll()
      .then((res) => setNotifs(res.notifications || []))
      .catch(() => toast.error("Failed to load notifications"))
      .finally(() => setLoading(false));
  }, []);

  const unread = notifs.filter((n) => !n.read).length;

  const markAll = async () => {
    try {
      await notificationAPI.markRead();
    } catch {}
    setNotifs((p) => p.map((n) => ({ ...n, read: true })));
  };

  const markOne = async (id) => {
    try {
      await notificationAPI.markRead(id);
    } catch {}
    setNotifs((p) => p.map((n) => (n._id === id ? { ...n, read: true } : n)));
  };

  if (loading)
    return (
      <div className="text-center" style={{ padding: "4rem" }}>
        <span className="spinner" /> Loading…
      </div>
    );

  return (
    <div>
      <div className="page-header" style={{ background: "linear-gradient(135deg,#1a0a4e 0%,#7B1B1B 100%)" }}>
        <div className="page-header-content">
          <h1>Admin Notifications 🔔</h1>
          <p>{unread} unread notification{unread !== 1 ? "s" : ""}</p>
        </div>
      </div>
      <div className="main-content" style={{ maxWidth: 700 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
          {unread > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={markAll}>Mark all read</button>
          )}
        </div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {notifs.length > 0 ? (
            notifs.map((n) => (
              <button
                key={n._id}
                className={`notif-item ${!n.read ? "unread" : ""}`}
                onClick={() => markOne(n._id)}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
              >
                <div className="notif-icon">{notifIcon(n.type)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: ".85rem", fontWeight: !n.read ? 600 : 400 }}>{n.message}</div>
                  <div style={{ fontSize: ".75rem", color: "var(--text-muted)", marginTop: 3 }}>{fmtDate(n.createdAt)}</div>
                </div>
                {!n.read && <div className="notif-dot" style={{ marginTop: 8 }} />}
              </button>
            ))
          ) : (
            <div className="empty-state" style={{ padding: "2rem" }}>
              <span className="emoji">🔔</span>
              <h3>No notifications</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
