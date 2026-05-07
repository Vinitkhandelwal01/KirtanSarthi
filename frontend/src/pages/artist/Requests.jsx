import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { bookingAPI } from "../../services/api";
import { statusBadge, fmtDate, initials } from "../../utils/helpers";
import { MAX_COUNTERS } from "../../utils/constants";
import BookingDetailModal from "../../components/common/BookingDetailModal";
import toast from "react-hot-toast";
import useLang from "../../hooks/useLang";

const ICONS = {
  inbox: "\u{1F4E9}",
  location: "\u{1F4CD}",
  calendar: "\u{1F4C5}",
  money: "\u20B9",
  accept: "\u2705",
  reject: "\u274C",
  counter: "\u{1F4AC}",
  waiting: "\u23F3",
  download: "\u{1F4E5}",
};

export default function ArtistRequests() {
  const location = useLocation();
  const { t } = useLang();
  const [searchParams] = useSearchParams();
  const initialTab = (location.state?.tab || searchParams.get("tab") || "ALL").toUpperCase();
  const [tab, setTab] = useState(initialTab);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counterModal, setCounterModal] = useState(null);
  const [counterPrice, setCounterPrice] = useState("");
  const [acting, setActing] = useState(false);
  const [detailBooking, setDetailBooking] = useState(null);

  useEffect(() => {
    bookingAPI
      .getArtistBookings()
      .then((res) => {
        setRequests(res.bookings || []);
      })
      .catch(() => toast.error(t("artist_requests_load_failed")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    const nextTab = (location.state?.tab || searchParams.get("tab") || "ALL").toUpperCase();
    setTab(nextTab);
  }, [location.state, searchParams]);

  const act = async (id, action, cPrice) => {
    const req = requests.find((r) => r._id === id);
    if (action === "COUNTER" && (req?.counterCount || 0) >= MAX_COUNTERS) {
      toast.error(t("artist_requests_counter_limit", { count: MAX_COUNTERS }));
      return;
    }

    setActing(true);
    try {
      const res = await bookingAPI.respond({
        bookingId: id,
        action,
        ...(cPrice ? { counterPrice: Number(cPrice) } : {}),
      });
      const updated = res.booking;
      if (updated) {
        setRequests((prev) => prev.map((r) => (r._id !== id ? r : { ...r, ...updated, user: r.user })));
      }
      toast.success(
        action === "ACCEPT"
          ? t("artist_requests_booking_accepted")
          : action === "REJECT"
            ? t("artist_requests_booking_rejected")
            : t("artist_requests_counter_sent")
      );
    } catch (err) {
      toast.error(err.response?.data?.message || t("artist_requests_action_failed"));
    }
    setCounterModal(null);
    setActing(false);
  };

  const filtered = tab === "ALL" ? requests : requests.filter((r) => r.status === tab);

  const tabs = [
    { key: "ALL", label: t("artist_requests_tab_all"), count: 0 },
    { key: "PENDING", label: t("artist_requests_tab_pending"), count: requests.filter((r) => r.status === "PENDING").length },
    { key: "COUNTERED", label: t("artist_requests_tab_countered"), count: requests.filter((r) => r.status === "COUNTERED").length },
    { key: "ACCEPTED", label: t("artist_requests_tab_accepted"), count: 0 },
    { key: "COMPLETED", label: t("artist_requests_tab_completed"), count: 0 },
    { key: "REJECTED", label: t("artist_requests_tab_rejected"), count: 0 },
  ];

  if (loading) {
    return (
      <div className="text-center" style={{ padding: "4rem" }}>
        <span className="spinner" /> {t("loading")}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-content">
          <h1>{t("artist_requests_title")} {ICONS.inbox}</h1>
          <p>{t("artist_requests_subtitle")}</p>
        </div>
      </div>
      <div className="main-content">
        <div style={{ display: "flex", gap: 4, background: "var(--cream-dark)", padding: 4, borderRadius: "var(--radius)", marginBottom: "1.5rem", maxWidth: 560, overflowX: "auto" }}>
          {tabs.map((item) => (
            <button key={item.key} className={`tab ${tab === item.key ? "active" : ""}`} onClick={() => setTab(item.key)} style={{ position: "relative" }}>
              {item.label}
              {item.count > 0 && (
                <span style={{ position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, background: "var(--danger)", color: "white", borderRadius: "50%", fontSize: ".6rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filtered.map((b) => {
            const eventLocation = (b.eventDetails?.address || b.eventDetails?.city || b.user?.city || "").toString().trim();
            return (
            <div key={b._id} className={`card ${b.status === "PENDING" || b.status === "COUNTERED" ? "pending-highlight" : ""}`} style={{ padding: "1.5rem", cursor: "pointer" }} onClick={() => setDetailBooking(b)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div className="nav-avatar" style={{ width: 52, height: 52, fontSize: "1.2rem", flexShrink: 0 }}>
                    {initials(b.user)}
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Crimson Pro',serif", fontSize: "1.1rem", fontWeight: 600 }}>
                      {b.user?.firstName} {b.user?.lastName}
                    </div>
                    <div style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>
                      {ICONS.location} {eventLocation || "-"} | {ICONS.calendar} {fmtDate(b.availability?.date || b.eventDetails?.date || b.createdAt)}
                    </div>
                    {b.note && <p style={{ fontSize: ".82rem", color: "var(--text-muted)", marginTop: 4, fontStyle: "italic" }}>&quot;{b.note}&quot;</p>}
                    {b.status === "COUNTERED" && (
                      <div style={{ marginTop: 4, fontSize: ".82rem", color: b.counterBy === "ARTIST" ? "#166534" : "#1d4ed8" }}>
                        {b.counterBy === "ARTIST" ? `${t("artist_requests_your_counter")} ` : `${t("artist_requests_user_counter")} `}
                        <strong>{ICONS.money}{b.counterPrice?.toLocaleString()}</strong>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {statusBadge(b.status)}
                  {b.finalPrice ? (
                    <div style={{ marginTop: 4, fontSize: ".85rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>{t("artist_requests_final_price")} </span>
                      <strong style={{ fontFamily: "'Yatra One',cursive", color: "#166534", fontSize: "1.05rem" }}>
                        {ICONS.money}{b.finalPrice?.toLocaleString()}
                      </strong>
                    </div>
                  ) : null}
                  <div style={{ marginTop: 4, fontSize: ".82rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>{t("artist_requests_budget")} </span>
                    <strong style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)" }}>
                      {ICONS.money}{b.userBudget?.toLocaleString()}
                    </strong>
                  </div>
                  <div style={{ fontSize: ".78rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>{t("artist_requests_your_price")} </span>
                    <strong>{ICONS.money}{b.artistPrice?.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {b.status === "PENDING" && (
                <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8, marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                  <button className="btn btn-primary btn-sm" onClick={() => act(b._id, "ACCEPT")} disabled={acting}>{ICONS.accept} {t("artist_requests_accept")}</button>
                  {b.userBudget !== b.artistPrice && (
                    <button className="btn btn-outline btn-sm" onClick={() => { setCounterModal(b); setCounterPrice(b.artistPrice || ""); }} disabled={acting}>{ICONS.counter} {t("artist_requests_counter_offer")}</button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => act(b._id, "REJECT")} disabled={acting}>{ICONS.reject} {t("artist_requests_reject")}</button>
                </div>
              )}

              {b.status === "COUNTERED" && (
                <div onClick={(e) => e.stopPropagation()} style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                  <div style={{ padding: "8px 12px", background: b.counterBy === "USER" ? "rgba(59,130,246,.08)" : "rgba(34,197,94,.08)", border: `1px solid ${b.counterBy === "USER" ? "rgba(59,130,246,.25)" : "rgba(34,197,94,.25)"}`, borderRadius: 8, fontSize: ".85rem", marginBottom: 10 }}>
                    {b.counterBy === "USER" ? (
                      <>
                        <strong style={{ color: "#1d4ed8" }}>{ICONS.download} {t("artist_requests_user_counter_label")} {ICONS.money}{b.counterPrice?.toLocaleString()}</strong>
                        <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>({t("artist_requests_user_budget")} {ICONS.money}{b.userBudget?.toLocaleString()})</span>
                      </>
                    ) : (
                      <>
                        <strong style={{ color: "#166534" }}>{ICONS.waiting} {t("artist_requests_awaiting_user")}</strong>
                        <span style={{ color: "var(--text-muted)", marginLeft: 8 }}>{t("artist_requests_your_counter")} <strong>{ICONS.money}{b.counterPrice?.toLocaleString()}</strong></span>
                      </>
                    )}
                    {(b.counterCount || 0) > 0 && <span style={{ color: "var(--text-muted)", marginLeft: 8, fontSize: ".75rem" }}>{t("artist_requests_exchange_count", { current: b.counterCount, max: MAX_COUNTERS })}</span>}
                  </div>
                  {b.counterBy === "USER" ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="btn btn-primary btn-sm" onClick={() => act(b._id, "ACCEPT")} disabled={acting}>{ICONS.accept} {t("artist_requests_accept_user_offer")}</button>
                      {(b.counterCount || 0) < MAX_COUNTERS ? (
                        <button className="btn btn-outline btn-sm" onClick={() => { setCounterModal(b); setCounterPrice(b.artistPrice || ""); }} disabled={acting}>{ICONS.counter} {t("artist_requests_recounter")}</button>
                      ) : (
                        <span style={{ fontSize: ".75rem", color: "#b91c1c", padding: "4px 8px", background: "rgba(239,68,68,.08)", borderRadius: 6 }}>{t("artist_requests_max_counters")}</span>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => act(b._id, "REJECT")} disabled={acting}>{ICONS.reject} {t("artist_requests_reject")}</button>
                    </div>
                  ) : (
                    <span style={{ fontSize: ".82rem", color: "var(--text-muted)", fontStyle: "italic" }}>{ICONS.waiting} {t("artist_requests_waiting_user")}</span>
                  )}
                </div>
              )}

              {b.status === "ACCEPTED" && (
                <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8, marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)", alignItems: "center" }}>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={async () => {
                      setActing(true);
                      try {
                        await bookingAPI.complete({ bookingId: b._id });
                        setRequests((prev) => prev.map((r) => (r._id === b._id ? { ...r, status: "COMPLETED" } : r)));
                        toast.success(t("artist_requests_mark_complete_success"));
                      } catch (err) {
                        toast.error(err.response?.data?.message || t("artist_requests_mark_complete_failed"));
                      } finally {
                        setActing(false);
                      }
                    }}
                    disabled={acting}
                  >
                    {ICONS.accept} {t("artist_requests_mark_complete")}
                  </button>
                  <span style={{ fontSize: ".78rem", color: "var(--text-muted)", fontStyle: "italic" }}>{t("artist_requests_mark_complete_help")}</span>
                </div>
              )}
            </div>
          )})}

          {filtered.length === 0 && (
            <div className="empty-state">
              <span className="emoji">{ICONS.inbox}</span>
              <h3>{t("artist_requests_empty", { tab: tab.toLowerCase() })}</h3>
            </div>
          )}
        </div>
      </div>

      {counterModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={t("artist_requests_counter_offer_title")}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setCounterModal(null)}>x</button>
            <h2 style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", marginBottom: "1.5rem" }}>{t("artist_requests_counter_offer_title")}</h2>
            <div style={{ background: "var(--cream)", borderRadius: 8, padding: "10px 14px", marginBottom: "1rem", fontSize: ".85rem" }}>
              <div>{t("artist_requests_user_budget_label")} <strong>{ICONS.money}{counterModal.userBudget?.toLocaleString()}</strong></div>
              <div>{t("artist_requests_listed_price")} <strong>{ICONS.money}{counterModal.artistPrice?.toLocaleString()}</strong></div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: "1rem" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: (counterModal.counterCount || 0) > i ? "var(--saffron)" : "var(--cream-dark)" }} />
              ))}
              <span style={{ fontSize: ".75rem", color: "var(--text-muted)", whiteSpace: "nowrap", marginLeft: 4 }}>
                {t("artist_requests_counters_left", { count: MAX_COUNTERS - (counterModal.counterCount || 0) })}
              </span>
            </div>
            {(counterModal.counterCount || 0) >= MAX_COUNTERS ? (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, fontSize: ".85rem", color: "#b91c1c", marginBottom: "1rem" }}>
                {t("artist_requests_counter_limit_reached")}
              </div>
            ) : (
              <div className="form-group mb-3">
                <label className="form-label">{t("artist_requests_counter_price")} ({ICONS.money})</label>
                <input className="form-input" type="number" value={counterPrice} onChange={(e) => setCounterPrice(e.target.value)} />
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              {(counterModal.counterCount || 0) < MAX_COUNTERS && (
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => act(counterModal._id, "COUNTER", counterPrice)} disabled={acting}>
                  {acting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> {t("sending")}</> : t("artist_requests_send_counter")}
                </button>
              )}
              <button className="btn btn-success btn-sm" onClick={() => act(counterModal._id, "ACCEPT")} disabled={acting}>{ICONS.accept} {t("artist_requests_accept")}</button>
              <button className="btn btn-danger btn-sm" onClick={() => act(counterModal._id, "REJECT")} disabled={acting}>{ICONS.reject} {t("artist_requests_reject")}</button>
            </div>
          </div>
        </div>
      )}

      {detailBooking && <BookingDetailModal booking={detailBooking} role="ARTIST" onClose={() => setDetailBooking(null)} />}
    </div>
  );
}

