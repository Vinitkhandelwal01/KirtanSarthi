import { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import { fmtDate, artistDisplayName, ArtistTypeBadge } from "../../utils/helpers";
import toast from "react-hot-toast";

export default function AdminApprovals() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actLoading, setActLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [profileModal, setProfileModal] = useState(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    adminAPI
      .getPendingArtists()
      .then((res) => setArtists(res.artists || []))
      .catch(() => toast.error("Failed to load pending artists"))
      .finally(() => setLoading(false));
  }, []);

  const approve = async (id) => {
    setActLoading(id);
    try {
      await adminAPI.reviewArtist({ artistId: id, action: "APPROVE" });
      setArtists((p) => p.filter((a) => (a._id || a.id) !== id));
      toast.success("Artist approved and notified! ✅");
    } catch {
      toast.error("Failed to approve");
    } finally {
      setActLoading(null);
    }
  };

  const reject = async () => {
    const id = rejectModal._id || rejectModal.id;
    setActLoading(id);
    try {
      await adminAPI.reviewArtist({ artistId: id, action: "REJECT", reason });
      setArtists((p) => p.filter((a) => (a._id || a.id) !== id));
      toast("Artist rejected and notified", { icon: "ℹ️" });
    } catch {
      toast.error("Failed to reject");
    } finally {
      setActLoading(null);
      setRejectModal(null);
      setReason("");
    }
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
          <h1>Artist Approvals ✅</h1>
          <p>Review and approve artist profile applications</p>
        </div>
      </div>
      <div className="main-content">
        {artists.length === 0 ? (
          <div className="empty-state">
            <span className="emoji">🎉</span>
            <h3>All caught up!</h3>
            <p>No pending artist approvals.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {artists.map((a) => {
              const u = a.user || a;
              const id = a._id || a.id;
              const displayName = artistDisplayName(a);
              return (
                <div key={id} className="card" style={{ padding: "2rem" }}>
                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                    <div
                      style={{
                        width: 72, height: 72, borderRadius: "50%",
                        background: "linear-gradient(135deg,var(--saffron),var(--gold))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "white", fontFamily: "'Yatra One',cursive", fontSize: "2rem", flexShrink: 0,
                      }}
                    >
                      {displayName?.[0] || "?"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: ".8rem" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontFamily: "'Crimson Pro',serif", fontSize: "1.3rem", fontWeight: 600 }}>
                              {displayName}
                            </span>
                            <ArtistTypeBadge type={a.artistType} />
                          </div>
                          {a.artistType === "GROUP" && u.firstName && (
                            <div style={{ fontSize: ".8rem", color: "var(--text-muted)", fontStyle: "italic", marginBottom: 2 }}>
                              Led by {u.firstName} {u.lastName}
                            </div>
                          )}
                          <div style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>
                            {u.email} · 📍 {u.city?.toUpperCase()}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span className="badge badge-gold">⏳ Pending</span>
                          <div style={{ fontSize: ".75rem", color: "var(--text-muted)", marginTop: 4 }}>
                            Applied {fmtDate(a.createdAt)}
                          </div>
                        </div>
                      </div>
                      <p style={{ fontFamily: "'Crimson Pro',serif", fontSize: "1rem", lineHeight: 1.7, marginBottom: "1rem" }}>
                        {a.description}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", marginBottom: "1rem" }}>
                        {a.eventTypes?.map((e) => (
                          <span key={e} className="badge badge-saffron">{e}</span>
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                        <div style={{ fontSize: ".88rem" }}>
                          <span style={{ color: "var(--text-muted)" }}>Type: </span>
                          <strong>{a.artistType}</strong>
                          <span style={{ margin: "0 1rem", color: "var(--text-muted)" }}>Price: </span>
                          <strong style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)" }}>
                            ₹{a.price?.toLocaleString()}/event
                          </strong>
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button className="btn btn-outline btn-sm" onClick={() => setProfileModal(a)}>👁 View Full Profile</button>
                          <button className="btn btn-primary" onClick={() => approve(id)} disabled={actLoading === id}>
                            {actLoading === id ? <><span className="spinner" /> Approving...</> : "✅ Approve"}
                          </button>
                          <button className="btn btn-danger" onClick={() => setRejectModal(a)}>❌ Reject</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Profile Modal */}
      {profileModal && (() => {
        const u = profileModal.user || profileModal;
        const modalDisplayName = artistDisplayName(profileModal);
        return (
          <div className="modal-overlay" onClick={() => setProfileModal(null)}>
            <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
              <button className="modal-close" onClick={() => setProfileModal(null)}>×</button>
              <div style={{ background: "linear-gradient(135deg,var(--brown),var(--saffron-deep))", margin: "-1.5rem -1.5rem 1.5rem", padding: "2rem", color: "white", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0", textAlign: "center" }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", fontSize: "2.2rem", fontFamily: "'Yatra One',cursive" }}>
                  {modalDisplayName?.[0]}
                </div>
                <div style={{ fontFamily: "'Yatra One',cursive", fontSize: "1.6rem" }}>{modalDisplayName}</div>
                <div style={{ marginTop: 4 }}>
                  <ArtistTypeBadge type={profileModal.artistType} style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.3)", color: "white" }} />
                </div>
                {profileModal.artistType === "GROUP" && u.firstName && (
                  <div style={{ fontSize: ".85rem", color: "rgba(255,255,255,.7)", fontStyle: "italic", marginTop: 6 }}>
                    Led by {u.firstName} {u.lastName}
                  </div>
                )}
              </div>
              <div className="grid-2" style={{ marginBottom: "1.2rem" }}>
                {[
                  ["📧", "Email", u.email],
                  ["📍", "City", u.city?.toUpperCase()],
                  ["🎭", "Artist Type", profileModal.artistType],
                  ["💰", "Price / Event", `₹${profileModal.price?.toLocaleString()}`],
                  ["📅", "Applied On", fmtDate(profileModal.createdAt)],
                  ["📞", "Phone", u.phone || "—"],
                ].map(([icon, label, val]) => (
                  <div key={label} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ fontSize: ".72rem", color: "var(--text-muted)", fontWeight: 500, marginBottom: 2 }}>{icon} {label}</div>
                    <div style={{ fontWeight: 500, fontSize: ".88rem" }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: "1.2rem" }}>
                <div style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", marginBottom: ".5rem" }}>About</div>
                <p style={{ fontFamily: "'Crimson Pro',serif", fontSize: "1rem", lineHeight: 1.8, color: "var(--text-muted)" }}>
                  {profileModal.description}
                </p>
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", marginBottom: ".5rem" }}>Specializations</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {profileModal.eventTypes?.map((e) => <span key={e} className="badge badge-saffron">{e}</span>)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setProfileModal(null); approve(profileModal._id || profileModal.id); }}>
                  ✅ Approve
                </button>
                <button className="btn btn-danger" onClick={() => { setProfileModal(null); setRejectModal(profileModal); }}>❌ Reject</button>
                <button className="btn btn-ghost" onClick={() => setProfileModal(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reject Modal */}
      {rejectModal && (() => {
        const id = rejectModal._id || rejectModal.id;
        return (
          <div className="modal-overlay" onClick={() => setRejectModal(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setRejectModal(null)}>×</button>
              <h2 style={{ fontFamily: "'Yatra One',cursive", color: "var(--maroon)", marginBottom: ".5rem" }}>Reject Application</h2>
              <p style={{ color: "var(--text-muted)", fontSize: ".88rem", marginBottom: "1.5rem" }}>
                Provide a reason for rejecting <strong>{artistDisplayName(rejectModal)}</strong>'s application.
              </p>
              <div className="form-group mb-3">
                <label className="form-label">Reason for Rejection</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="e.g. Insufficient profile information..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ resize: "none" }}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={reject} disabled={actLoading === id}>
                  {actLoading === id ? <><span className="spinner" /> Rejecting...</> : "Confirm Rejection"}
                </button>
                <button className="btn btn-ghost" onClick={() => setRejectModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
