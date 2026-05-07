import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { dashboardAPI, artistAPI, notificationAPI } from "../../services/api";
import { notifIcon, fmtDate, initials } from "../../utils/helpers";
import toast from "react-hot-toast";
import useLang from "../../hooks/useLang";

const ICONS = {
  pause: "\u23F8",
  play: "\u25B6",
  target: "\u{1F3AF}",
  pending: "\u{1F4E9}",
  complete: "\u2705",
  star: "\u2B50",
  money: "\u{1F4B0}",
  location: "\u{1F4CD}",
  fire: "\u{1F525}",
  calendar: "\u{1F4C6}",
  chart: "\u{1F4CA}",
  edit: "\u270F\uFE0F",
  message: "\u{1F4AC}",
  warning: "\u26A0\uFE0F",
  music: "\u{1F3B5}",
  prayer: "\u{1F64F}",
};

export default function ArtistDashboard() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const { t } = useLang();

  const [data, setData] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseModal, setPauseModal] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [noProfile, setNoProfile] = useState(false);

  useEffect(() => {
    Promise.all([
      dashboardAPI.artist().catch((err) => {
        if (err?.response?.status === 404 || err?.status === 404) setNoProfile(true);
        return null;
      }),
      notificationAPI.getAll().catch(() => ({ notifications: [] })),
    ])
      .then(([res, nRes]) => {
        if (res) {
          const d = res.data || res;
          setData(d);
          setIsPaused(Boolean(d.stats?.isPaused || d.stats?.isActive === false || d.isPaused));
        }
        setNotifs(nRes?.notifications || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePause = async () => {
    setPauseLoading(true);
    try {
      await artistAPI.pause();
    } catch {}
    setIsPaused(true);
    setData((prev) => prev ? { ...prev, stats: { ...prev.stats, isActive: false, isPaused: true } } : prev);
    setPauseModal(false);
    setPauseLoading(false);
    toast(t("artist_dashboard_toast_paused"), { icon: ICONS.pause });
  };

  const handleResume = async () => {
    setPauseLoading(true);
    try {
      await artistAPI.resume();
    } catch {}
    setIsPaused(false);
    setData((prev) => prev ? { ...prev, stats: { ...prev.stats, isActive: true, isPaused: false } } : prev);
    setPauseLoading(false);
    toast.success(t("artist_dashboard_toast_resumed"));
  };

  const pending = data?.recentBookings?.filter((b) => b.status === "PENDING") || [];
  const stats = data?.stats || {};
  const pendingCount = stats.pendingBookings ?? pending.length;
  const unreadNotifs = notifs.filter((n) => !n.isRead).length;

  if (loading) {
    return <div className="text-center" style={{ padding: "4rem" }}><span className="spinner" /> {t("artist_dashboard_loading")}</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-content">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <h1 style={{ margin: 0 }}>{ICONS.prayer} {t("artist_dashboard_greeting", { name: user?.firstName || "" })}</h1>
            {isPaused && <span className="badge badge-red" style={{ fontSize: ".82rem", padding: "5px 12px", animation: "badgePulse 2.5s infinite" }}>{ICONS.pause} {t("artist_dashboard_paused")}</span>}
          </div>
          <p style={{ marginTop: ".3rem" }}>{t("artist_dashboard_subtitle")}</p>
        </div>
      </div>
      <div className="main-content">
        {(noProfile || (data && data.stats?.isApproved === false)) && (
          <div className="card mb-3" style={{ background: "linear-gradient(135deg, rgba(232,101,10,.06), rgba(212,150,10,.06))", border: "1.5px solid var(--saffron-light)", padding: "2rem", textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: ".8rem" }}>{ICONS.music}</div>
            <h2 style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", marginBottom: ".5rem" }}>{noProfile ? t("artist_dashboard_welcome_artist") : t("artist_dashboard_review_title")}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: ".92rem", maxWidth: 500, margin: "0 auto .8rem", lineHeight: 1.6 }}>{noProfile ? t("artist_dashboard_create_profile_help") : t("artist_dashboard_review_help")}</p>
            {noProfile ? <button className="btn btn-primary" onClick={() => navigate("/artist/profile/edit")}>{t("artist_dashboard_create_profile")}</button> : <span className="badge badge-gold" style={{ fontSize: ".82rem", padding: "6px 14px" }}>{t("artist_dashboard_pending_approval")}</span>}
          </div>
        )}

        {isPaused && !noProfile && data?.stats?.isApproved !== false && (
          <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: "var(--radius-lg)", padding: "1rem 1.4rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: "1.6rem" }}>{ICONS.pause}</span>
              <div>
                <div style={{ fontWeight: 600, color: "#991b1b", fontSize: ".95rem" }}>{t("artist_dashboard_paused_title")}</div>
                <div style={{ fontSize: ".82rem", color: "var(--text-muted)", marginTop: 2 }}>{t("artist_dashboard_paused_help")}</div>
              </div>
            </div>
            <button className="btn btn-success btn-sm" onClick={handleResume} disabled={pauseLoading} style={{ flexShrink: 0 }}>{pauseLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> {t("artist_dashboard_resuming")}</> : `${ICONS.play} ${t("artist_dashboard_resume_profile")}`}</button>
          </div>
        )}

        {!noProfile && data?.stats?.isApproved !== false && (
          <>
            <div className="card mb-3" style={{ padding: "1rem 1.4rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: "1.2rem" }}>{ICONS.target}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: ".92rem", color: "var(--brown)" }}>{t("artist_dashboard_profile_status")}</div>
                  <div style={{ fontSize: ".78rem", color: "var(--text-muted)", marginTop: 1 }}>{isPaused ? t("artist_dashboard_status_paused_help") : t("artist_dashboard_status_active_help")}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 999, fontSize: ".8rem", fontWeight: 600, background: isPaused ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)", color: isPaused ? "#991b1b" : "#166534", border: `1px solid ${isPaused ? "rgba(239,68,68,.25)" : "rgba(34,197,94,.25)"}` }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: isPaused ? "#ef4444" : "#22c55e", display: "inline-block" }} />
                  {isPaused ? t("artist_dashboard_status_paused") : t("artist_dashboard_status_active")}
                </span>
                {isPaused ? <button className="btn btn-success btn-sm" onClick={handleResume} disabled={pauseLoading}>{pauseLoading ? <><span className="spinner" style={{ width: 13, height: 13 }} /> ...</> : `${ICONS.play} ${t("artist_dashboard_resume")}`}</button> : <button className="btn btn-outline btn-sm" onClick={() => setPauseModal(true)} disabled={pauseLoading} style={{ borderColor: "rgba(239,68,68,.4)", color: "#991b1b" }}>{ICONS.pause} {t("artist_dashboard_pause")}</button>}
              </div>
            </div>

            <div className="grid-4 mb-3">
              {[
                [ICONS.pending, stats.pendingBookings ?? pendingCount, t("artist_dashboard_pending_requests"), "/artist/requests", "PENDING", "badge-red"],
                [ICONS.complete, stats.completedBookings ?? 0, t("artist_dashboard_completed_bookings"), null, "COMPLETED", ""],
                [ICONS.star, Number(stats.averageRating ?? 0).toFixed(1), t("artist_dashboard_avg_rating"), null, "", ""],
                [ICONS.money, stats.totalRevenue ? `Rs.${stats.totalRevenue.toLocaleString("en-IN")}` : "Rs.0", t("artist_dashboard_total_revenue"), null, "", ""],
              ].map(([icon, val, label, route, routeTab, badgeClass]) => {
                const isDisabled = isPaused && route === "/artist/requests";
                const inner = <><div className="stat-label">{label}</div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div className="stat-value">{val}</div>{badgeClass && pendingCount > 0 && <span className={`badge ${badgeClass}`} style={{ animation: "badgePulse 2s infinite" }}>!</span>}</div><div className="stat-sub">{icon}</div></>;
                return route ? <button type="button" key={label} className={`stat-card clickable${isDisabled ? " paused-card" : ""}`} data-icon={icon} onClick={() => !isDisabled && navigate(route, { state: { tab: routeTab } })} style={isDisabled ? { opacity: 0.5, cursor: "not-allowed", textAlign: "left" } : { textAlign: "left" }}>{inner}</button> : <div key={label} className="stat-card" data-icon={icon}>{inner}</div>;
              })}
            </div>

            <div className="grid-2">
              <div className="card" style={{ padding: "1.2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".3rem" }}>
                  <h2 className="section-title">{t("artist_dashboard_pending_requests")}</h2>
                  {pendingCount > 0 && !isPaused && <span className="badge badge-red" style={{ animation: "badgePulse 2s infinite" }}>{ICONS.fire} {t("artist_dashboard_urgent", { count: pendingCount })}</span>}
                </div>
                <div className="section-divider" />
                {isPaused ? (
                  <div className="card" style={{ padding: "1.5rem", textAlign: "center", background: "rgba(239,68,68,.03)", border: "1px dashed rgba(239,68,68,.2)" }}>
                    <div style={{ fontSize: "2rem", marginBottom: ".5rem" }}>{ICONS.pause}</div>
                    <div style={{ fontWeight: 600, color: "#991b1b", marginBottom: ".3rem", fontSize: ".9rem" }}>{t("artist_dashboard_requests_paused")}</div>
                    <div style={{ fontSize: ".82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>{t("artist_dashboard_requests_paused_help")}</div>
                    <button className="btn btn-success btn-sm" onClick={handleResume} disabled={pauseLoading}>{ICONS.play} {t("artist_dashboard_resume_profile")}</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {pending.slice(0, 3).map((b) => (
                      <button type="button" key={b._id} className="card pending-highlight card-hover" style={{ padding: "1.2rem", cursor: "pointer", textAlign: "left", width: "100%", background: "none", border: "inherit", position: "relative" }} onClick={() => navigate("/artist/requests", { state: { tab: "PENDING" } })}>
                        <div style={{ position: "absolute", top: 10, right: 10 }}><span className="badge badge-gold">{t("artist_dashboard_pending_badge")}</span></div>
                        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                          <div className="nav-avatar" style={{ width: 44, height: 44, fontSize: "1rem", flexShrink: 0 }}>{initials(b.user)}</div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{b.user?.firstName} {b.user?.lastName}</div>
                            <div style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>{ICONS.location} {b.user?.city?.toUpperCase()} | {fmtDate(b.createdAt)}</div>
                          </div>
                        </div>
                        {b.note && <p style={{ fontSize: ".82rem", color: "var(--text-muted)", fontStyle: "italic", marginBottom: 8 }}>&quot;{b.note}&quot;</p>}
                      </button>
                    ))}
                    {pendingCount === 0 && <div style={{ color: "var(--text-muted)", fontSize: ".88rem", padding: "1rem", textAlign: "center" }}>{t("artist_dashboard_no_pending")} {ICONS.prayer}</div>}
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate("/artist/requests", { state: { tab: "PENDING" } })}>{t("artist_dashboard_view_all_requests")}</button>
                  </div>
                )}
              </div>

              <div className="card" style={{ padding: "1.2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".3rem" }}>
                  <h2 className="section-title">{t("notifications")}</h2>
                  {unreadNotifs > 0 && <span className="badge badge-saffron">{t("user_dashboard_unread_badge", { count: unreadNotifs })}</span>}
                </div>
                <div className="section-divider" />
                <div style={{ padding: 0, overflow: "hidden", marginBottom: "1rem", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                  {notifs.slice(0, 3).map((n) => <div key={n._id} className={`notif-item ${!n.isRead ? "unread" : ""}`}><div className="notif-icon">{notifIcon(n.type)}</div><div style={{ flex: 1 }}><div style={{ fontSize: ".85rem", fontWeight: !n.isRead ? 600 : 400 }}>{n.message}</div><div style={{ fontSize: ".75rem", color: "var(--text-muted)", marginTop: 2 }}>{fmtDate(n.createdAt)}</div></div>{!n.isRead && <div className="notif-dot" />}</div>)}
                  {notifs.length === 0 && <div className="text-center" style={{ padding: "1rem", color: "var(--text-muted)" }}>{t("artist_dashboard_notifications_empty")}</div>}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate("/notifications")}>{t("artist_dashboard_all_notifications")}</button>

                <div className="section-title mt-3 mb-1" style={{ fontSize: "1.2rem" }}>{t("artist_dashboard_quick_actions")}</div>
                <div className="section-divider" />
                {[[ICONS.calendar, t("artist_dashboard_manage_availability"), "/artist/availability"],[ICONS.chart, t("artist_dashboard_performance_stats"), "/artist/performance"],[ICONS.edit, t("artist_dashboard_update_profile"), "/artist/profile/edit"],[ICONS.message, t("artist_dashboard_messages"), "/chat"]].map(([icon, label, route]) => <button type="button" key={label} className="card card-hover" style={{ cursor: "pointer", padding: ".9rem", marginBottom: 8, width: "100%", textAlign: "left", background: "none", border: "1px solid var(--border)" }} onClick={() => navigate(route)}><div style={{ display: "flex", gap: 12, alignItems: "center" }}><div style={{ fontSize: "1.3rem" }}>{icon}</div><div style={{ fontWeight: 500, fontSize: ".9rem" }}>{label}</div></div></button>)}
              </div>
            </div>
          </>
        )}
      </div>

      {pauseModal && <div className="modal-overlay" role="dialog" aria-modal="true"><div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, textAlign: "center" }}><button className="modal-close" onClick={() => setPauseModal(false)}>×</button><div style={{ fontSize: "2.5rem", marginBottom: ".6rem" }}>{ICONS.pause}</div><h2 style={{ fontFamily: "'Yatra One',cursive", color: "var(--maroon)", marginBottom: ".5rem" }}>{t("artist_dashboard_pause_confirm")}</h2><p style={{ color: "var(--text-muted)", fontSize: ".9rem", lineHeight: 1.6, marginBottom: ".8rem" }}>{t("artist_dashboard_pause_confirm_text")}</p><div style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.18)", borderRadius: 8, padding: ".8rem 1rem", marginBottom: "1.5rem", textAlign: "left" }}>{[t("artist_dashboard_pause_reason_1"), t("artist_dashboard_pause_reason_2"), t("artist_dashboard_pause_reason_3")].map((txt) => <div key={txt} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 0", fontSize: ".84rem", color: "#7f1d1d" }}><span style={{ marginTop: 2, flexShrink: 0 }}>{ICONS.warning}</span><span>{txt}</span></div>)}</div><div style={{ display: "flex", gap: 10, justifyContent: "center" }}><button className="btn btn-danger" onClick={handlePause} disabled={pauseLoading}>{pauseLoading ? <><span className="spinner" style={{ width: 15, height: 15 }} /> {t("artist_dashboard_pausing")}</> : `${ICONS.pause} ${t("artist_dashboard_pause_yes")}`}</button><button className="btn btn-ghost" onClick={() => setPauseModal(false)} disabled={pauseLoading}>{t("cancel")}</button></div></div></div>}
    </div>
  );
}

