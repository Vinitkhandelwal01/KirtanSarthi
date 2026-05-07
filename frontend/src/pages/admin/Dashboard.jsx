import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { dashboardAPI } from "../../services/api";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI
      .admin()
      .then((res) => setData(res.data || res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = data?.stats || {};

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
          <h1>Admin Dashboard 🛡️</h1>
          <p>Welcome, {user?.firstName}! Manage the KirtanSarthi platform.</p>
        </div>
      </div>
      <div className="main-content">
        <div className="grid-4 mb-3">
          {[
            ["👥", stats.totalUsers ?? 0, "Total Users", "/admin/users"],
            ["🎵", stats.activeArtists ?? 0, "Active Artists", "/admin/moderation?status=active"],
            ["📅", stats.totalBookings ?? 0, "Total Bookings", "/admin/bookings"],
            ["⏳", stats.pendingApprovals ?? 0, "Pending Approvals", "/admin/approvals"],
          ].map(([icon, val, label, path]) => (
            <button
              type="button"
              key={label}
              className="stat-card clickable"
              data-icon={icon}
              onClick={() => navigate(path)}
            >
              <div className="stat-label">{label}</div>
              <div className="stat-value">{val}</div>
              <div className="stat-sub">{icon}</div>
            </button>
          ))}
        </div>

        <div className="grid-2">
          <div className="card">
            <h3 style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", marginBottom: "1rem" }}>
              Platform Overview
            </h3>
            {[
              ["New Users (this month)", stats.newUsersThisMonth ?? 0, "👤"],
              ["Bookings Completed", stats.completedBookings ?? 0, "✅"],
              ["Revenue (this month)", stats.revenueThisMonth ? `Rs.${Number(stats.revenueThisMonth).toLocaleString("en-IN")}` : "Rs.0", "💰"],
              ["Avg Artist Rating", stats.avgRating ? `${stats.avgRating} ⭐` : "— ⭐", "📊"],
              ["Pending Approvals", stats.pendingApprovals ?? 0, "⏳"],
            ].map(([label, val, icon]) => (
              <div
                key={label}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}
              >
                <span style={{ fontSize: ".88rem", color: "var(--text-muted)" }}>{icon} {label}</span>
                <strong style={{ color: "var(--saffron-deep)", fontFamily: "'Yatra One',cursive" }}>{val}</strong>
              </div>
            ))}
          </div>

          <div>
            <h3 style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", marginBottom: "1rem", fontSize: "1.2rem" }}>
              Admin Actions
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["✅", "Artist Approvals", "Review pending applications", "/admin/approvals", true],
                ["👥", "User Management", "View and manage all users", "/admin/users", false],
                ["📅", "All Bookings", "View platform-wide bookings", "/admin/bookings", false],
                ["🛡️", "Moderation", "Manage artist suspensions", "/admin/moderation", false],
                ["🔔", "Notifications", "Admin notification center", "/admin/notifications", false],
              ].map(([icon, title, desc, path, hasBadge]) => (
                <button
                  type="button"
                  key={title}
                  className="card card-hover"
                  style={{ cursor: "pointer", padding: "1rem", width: "100%", textAlign: "left", background: "none", border: "1px solid var(--border)" }}
                  onClick={() => navigate(path)}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ fontSize: "1.4rem" }}>{icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{title}</div>
                      <div style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>{desc}</div>
                    </div>
                    {hasBadge && (stats.pendingApprovals ?? 0) > 0 && (
                      <span className="badge badge-red">{stats.pendingApprovals}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
