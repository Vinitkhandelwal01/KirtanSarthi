import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import { fmtDate, initials } from "../../utils/helpers";
import toast from "react-hot-toast";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [viewUser, setViewUser] = useState(null);

  useEffect(() => {
    adminAPI
      .getUsers()
      .then((res) => setUsers(res.users || []))
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const n = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase();
    return n.includes(search.toLowerCase()) && (roleFilter === "ALL" || u.accountType === roleFilter);
  });

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
          <h1>User Management 👥</h1>
          <p>View and manage all registered users</p>
        </div>
      </div>
      <div className="main-content">
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <input className="form-input" style={{ maxWidth: 320 }} placeholder="🔍 Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="tabs" style={{ maxWidth: 340 }}>
            {["ALL", "USER", "ARTIST", "ADMIN"].map((r) => (
              <button key={r} className={`tab ${roleFilter === r ? "active" : ""}`} onClick={() => setRoleFilter(r)}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem" }}>
              <thead>
                <tr style={{ background: "var(--cream-dark)", borderBottom: "1px solid var(--border)" }}>
                  {["User", "Email", "Phone", "City", "Role", "Joined", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: ".8rem", color: "var(--brown)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u._id || i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "var(--white)" : "rgba(253,246,236,.5)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,var(--saffron),var(--gold))", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: ".8rem", fontWeight: 600, flexShrink: 0 }}>
                          {initials(u)}
                        </div>
                        <strong>{u.firstName} {u.lastName}</strong>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{u.email}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{u.phone || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{u.city?.toUpperCase() || "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span className={`badge ${u.accountType === "ADMIN" ? "badge-maroon" : u.accountType === "ARTIST" ? "badge-saffron" : "badge-blue"}`}>
                        {u.accountType}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{fmtDate(u.createdAt)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setViewUser(u)}>👁 View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="empty-state">
              <span className="emoji">👥</span>
              <h3>No users found</h3>
            </div>
          )}
        </div>
      </div>

      {/* Full Profile Modal */}
      {viewUser && (
        <div className="modal-overlay" onClick={() => setViewUser(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
            <button className="modal-close" onClick={() => setViewUser(null)}>×</button>
            <div style={{ background: "linear-gradient(135deg,#1a0a4e,#7B1B1B)", margin: "-1.5rem -1.5rem 1.5rem", padding: "2rem", color: "white", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0", textAlign: "center" }}>
              <div style={{ width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontFamily: "'Yatra One',cursive", fontSize: "2rem" }}>
                {initials(viewUser)}
              </div>
              <div style={{ fontFamily: "'Yatra One',cursive", fontSize: "1.4rem" }}>{viewUser.firstName} {viewUser.lastName}</div>
              <span className={`badge ${viewUser.accountType === "ADMIN" ? "badge-maroon" : viewUser.accountType === "ARTIST" ? "badge-saffron" : "badge-blue"}`} style={{ marginTop: 6, display: "inline-block" }}>
                {viewUser.accountType}
              </span>
            </div>
            <div className="grid-2" style={{ gap: 0, marginBottom: "1.2rem" }}>
              {[
                ["📧", "Email", viewUser.email],
                ["📞", "Phone", viewUser.phone || "—"],
                ["📍", "City", viewUser.city?.toUpperCase() || "—"],
                ["🆔", "User ID", viewUser._id],
                ["📅", "Joined", fmtDate(viewUser.createdAt)],
                ["👤", "Account Type", viewUser.accountType],
              ].map(([icon, label, val]) => (
                <div key={label} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontSize: ".72rem", color: "var(--text-muted)", fontWeight: 500, marginBottom: 2 }}>{icon} {label}</div>
                  <div style={{ fontWeight: 500, fontSize: ".88rem", wordBreak: "break-all" }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: "8px 12px", background: "rgba(107,114,128,.06)", borderRadius: 8, fontSize: ".76rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              🔒 Password is not displayed for security reasons.
            </div>
            <button className="btn btn-outline w-full" onClick={() => setViewUser(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
