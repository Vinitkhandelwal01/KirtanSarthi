import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { adminAPI } from "../../services/api";
import { artistDisplayName, ArtistTypeBadge } from "../../utils/helpers";
import toast from "react-hot-toast";

export default function AdminModeration() {
  const { user } = useSelector((s) => s.auth);
  const [searchParams] = useSearchParams();
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actLoading, setActLoading] = useState(null);
  const [search, setSearch] = useState("");
  const [suspendModal, setSuspendModal] = useState(null);
  const [reasonModal, setReasonModal] = useState(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const statusFilter = searchParams.get("status") || "all";

  useEffect(() => {
    const adminStatus =
      statusFilter === "active"
        ? "approved"
        : statusFilter === "suspended"
          ? "suspended"
          : statusFilter === "paused"
            ? "paused"
            : undefined;

    setLoading(true);
    adminAPI
      .getArtists(adminStatus ? { status: adminStatus, limit: 100 } : { limit: 100 })
      .then((res) => {
        setArtists(res.artists || []);
      })
      .catch(() => toast.error("Failed to load artists"))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  if (!user || user.accountType !== "ADMIN") {
    return (
      <div className="main-content">
        <div className="empty-state">
          <span className="emoji">🔒</span>
          <h3>Access Denied</h3>
          <p>Only Admins can access the Moderation panel.</p>
        </div>
      </div>
    );
  }

  const filtered = artists.filter((a) => {
    if (statusFilter === "active" && (a.isSuspended || a.isActive === false)) return false;
    if (statusFilter === "paused" && (a.isSuspended || a.isActive !== false)) return false;
    if (statusFilter === "suspended" && !a.isSuspended) return false;
    const n = `${a.user?.firstName || ""} ${a.user?.lastName || ""} ${a.user?.email || ""} ${a.groupName || ""} ${artistDisplayName(a)}`.toLowerCase();
    return n.includes(search.toLowerCase());
  });

  const handleSuspend = async () => {
    if (!reason.trim()) { setError("Reason is required."); return; }
    setActLoading(suspendModal._id); setError("");
    try {
      await adminAPI.suspendArtist({ artistId: suspendModal._id, reason: reason.trim() });
    } catch {}
    setArtists((p) => p.map((a) => a._id === suspendModal._id ? { ...a, isSuspended: true, suspensionReason: reason.trim() } : a));
    toast(`${artistDisplayName(suspendModal)} has been suspended.`, { icon: "🚫" });
    setActLoading(null); setSuspendModal(null); setReason(""); setError("");
  };

  const handleReactivate = async (artist) => {
    setActLoading(artist._id);
    try {
      await adminAPI.reactivateArtist({ artistId: artist._id });
    } catch {}
    setArtists((p) => p.map((a) => a._id === artist._id ? { ...a, isSuspended: false, suspensionReason: "" } : a));
    toast.success(`${artistDisplayName(artist)} has been reactivated. ✅`);
    setActLoading(null);
  };

  const suspendedCount = artists.filter((a) => a.isSuspended).length;
  const pausedCount = artists.filter((a) => !a.isSuspended && a.isActive === false).length;
  const activeCount = artists.filter((a) => !a.isSuspended && a.isActive !== false).length;

  if (loading)
    return (
      <div className="text-center" style={{ padding: "4rem" }}>
        <span className="spinner" /> Loading…
      </div>
    );

  return (
    <div>
      <div className="page-header" style={{ background: "linear-gradient(135deg,#2C0800,#7B1B1B)" }}>
        <div className="page-header-content">
          <h1>🛡️ Moderation Panel</h1>
          <p>
            {statusFilter === "active"
              ? "All active artists on the platform"
              : statusFilter === "paused"
                ? "All paused artists on the platform"
              : statusFilter === "suspended"
                ? "All suspended artists on the platform"
                : "Manage fraudulent or policy-violating artists"}
          </p>
        </div>
      </div>
      <div className="main-content">
        {/* Stats bar */}
        <div className="grid-4 mb-3" style={{ maxWidth: 820 }}>
          {[
            ["Total Artists", artists.length, "🎵", "var(--saffron-deep)"],
            ["Active", activeCount, "✅", "var(--success)"],
            ["Paused", pausedCount, "⏸", "#9a3412"],
            ["Suspended", suspendedCount, "🚫", "#b91c1c"],
          ].map(([label, val, icon, color]) => (
            <div key={label} className="stat-card" data-icon={icon}>
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color }}>{val}</div>
              <div className="stat-sub">{icon}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <input className="form-input" style={{ maxWidth: 340 }} placeholder="🔍 Search artists by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".88rem" }}>
              <thead>
                <tr style={{ background: "var(--cream-dark)", borderBottom: "1px solid var(--border)" }}>
                  {["Artist", "Email", "City", "Type", "Rating", "Status", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, fontSize: ".8rem", color: "var(--brown)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr
                    key={a._id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: a.isSuspended
                        ? "rgba(239,68,68,.06)"
                        : a.isActive === false
                          ? "rgba(249,115,22,.06)"
                          : i % 2 === 0
                            ? "var(--white)"
                            : "rgba(253,246,236,.5)",
                      transition: "background .2s",
                      borderLeft: a.isSuspended
                        ? "3px solid #ef4444"
                        : a.isActive === false
                          ? "3px solid #f97316"
                          : "3px solid transparent",
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%",
                          background: a.isSuspended
                            ? "linear-gradient(135deg,#ef4444,#b91c1c)"
                            : a.isActive === false
                              ? "linear-gradient(135deg,#fb923c,#ea580c)"
                              : "linear-gradient(135deg,var(--saffron),var(--gold))",
                          display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: ".8rem", fontWeight: 600, flexShrink: 0,
                        }}>
                          {artistDisplayName(a)?.[0] || "A"}
                        </div>
                        <div>
                          <strong style={{ color: a.isSuspended ? "#b91c1c" : a.isActive === false ? "#9a3412" : "inherit" }}>{artistDisplayName(a)}</strong>
                          {a.artistType === "GROUP" && a.user?.firstName && (
                            <div style={{ fontSize: ".73rem", color: "var(--text-muted)", fontStyle: "italic" }}>Led by {a.user.firstName} {a.user.lastName}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: ".82rem", whiteSpace: "nowrap" }}>{a.user?.email}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{a.user?.city?.toUpperCase() || "—"}</td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      <ArtistTypeBadge type={a.artistType} />
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>⭐ {a.averageRating ? Number(a.averageRating).toFixed(1) : "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {a.isSuspended ? (
                        <span className="badge badge-red" style={{ fontSize: ".72rem", cursor: "pointer" }} onClick={() => setReasonModal(a)} title="Click to view reason">
                          🚫 Suspended ⓘ
                        </span>
                      ) : a.isActive === false ? (
                        <span
                          className="badge"
                          style={{ fontSize: ".72rem", background: "rgba(249,115,22,.14)", color: "#9a3412", border: "1px solid rgba(249,115,22,.25)" }}
                        >
                          ⏸ Paused
                        </span>
                      ) : (
                        <span className="badge badge-green" style={{ fontSize: ".72rem" }}>✅ Active</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                      {a.isSuspended ? (
                        <button className="btn btn-success btn-sm" disabled={actLoading === a._id} onClick={() => handleReactivate(a)}>
                          {actLoading === a._id ? <><span className="spinner" /> …</> : "✅ Reactivate"}
                        </button>
                      ) : (
                        <button className="btn btn-danger btn-sm" disabled={actLoading === a._id} onClick={() => { setSuspendModal(a); setReason(""); setError(""); }}>
                          {actLoading === a._id ? <><span className="spinner" /> …</> : "🚫 Suspend"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="empty-state"><span className="emoji">🎵</span><h3>No artists found</h3></div>
          )}
        </div>
      </div>

      {/* Suspend Reason View Modal */}
      {reasonModal && (
        <div className="modal-overlay" onClick={() => setReasonModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <button className="modal-close" onClick={() => setReasonModal(null)}>×</button>
            <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: ".4rem" }}>🚫</div>
              <h2 style={{ fontFamily: "'Yatra One',cursive", color: "var(--maroon)", marginBottom: ".2rem" }}>Suspension Details</h2>
              <p style={{ color: "var(--text-muted)", fontSize: ".88rem" }}>
                {artistDisplayName(reasonModal)}
              </p>
            </div>
            <div style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 10, padding: "1rem 1.2rem", marginBottom: "1.2rem" }}>
              <div style={{ fontSize: ".75rem", fontWeight: 600, color: "#991b1b", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>
                Reason for Suspension
              </div>
              <p style={{ fontSize: ".9rem", color: "var(--text)", lineHeight: 1.6 }}>
                {reasonModal.suspensionReason || <em style={{ color: "var(--text-muted)" }}>No reason provided.</em>}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn btn-success btn-sm" onClick={() => { setReasonModal(null); handleReactivate(reasonModal); }}>
                ✅ Reactivate
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setReasonModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSuspendModal(null)}>×</button>
            <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: ".4rem" }}>🚫</div>
              <h2 style={{ fontFamily: "'Yatra One',cursive", color: "var(--maroon)", marginBottom: ".3rem" }}>Suspend Artist</h2>
              <p style={{ color: "var(--text-muted)", fontSize: ".88rem" }}>
                You are about to suspend <strong>{artistDisplayName(suspendModal)}</strong>.
                They will not be able to receive bookings while suspended.
              </p>
            </div>
            <div className="form-group mb-1">
              <label className="form-label">
                Reason for Suspension <span style={{ color: "var(--danger)" }}>*</span>
                <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 6 }}>(required)</span>
              </label>
              <textarea
                className="form-input"
                rows={4}
                placeholder="e.g. Multiple fraud reports, fake profile, policy violations…"
                value={reason}
                onChange={(e) => { if (e.target.value.length <= 300) { setReason(e.target.value); setError(""); } }}
                style={{ resize: "none" }}
                maxLength={300}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                {error ? <div className="form-error">{error}</div> : <span />}
                <span style={{ fontSize: ".72rem", color: reason.length > 250 ? "#b91c1c" : "var(--text-muted)" }}>{reason.length}/300</span>
              </div>
            </div>
            <div style={{ marginTop: ".5rem", padding: "8px 12px", background: "rgba(239,68,68,.06)", borderRadius: 8, fontSize: ".78rem", color: "#b91c1c", marginBottom: "1rem" }}>
              ⚠️ This action will be logged. The artist will be notified.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleSuspend} disabled={actLoading === suspendModal._id}>
                {actLoading === suspendModal._id ? <><span className="spinner" /> Suspending…</> : "🚫 Confirm Suspension"}
              </button>
              <button className="btn btn-ghost" onClick={() => setSuspendModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
