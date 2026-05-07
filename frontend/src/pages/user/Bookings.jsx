import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { bookingAPI, ratingAPI, chatAPI } from "../../services/api";
import { statusBadge, fmtDate, artistDisplayName, ArtistTypeBadge } from "../../utils/helpers";
import { MAX_COUNTERS } from "../../utils/constants";
import BookingDetailModal from "../../components/common/BookingDetailModal";
import toast from "react-hot-toast";
import useLang from "../../hooks/useLang";

const ICONS = {
  bookings: "\u{1F4C5}",
  location: "\u{1F4CD}",
  counter: "\u{1F4AC}",
  star: "\u2B50",
};

const RUPEE = "\u20B9";

export default function UserBookings() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [tab, setTab] = useState("all");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: "" });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [counterModal, setCounterModal] = useState(null);
  const [counterPrice, setCounterPrice] = useState("");
  const [detailBooking, setDetailBooking] = useState(null);
  const [msgLoading, setMsgLoading] = useState(null);

  useEffect(() => {
    bookingAPI
      .getMyBookings()
      .then((res) => {
        setBookings(res.bookings || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === "all" ? bookings : bookings.filter((b) => b.status === tab.toUpperCase());

  const tabLabels = {
    all: t("user_bookings_tab_all"),
    pending: t("user_bookings_tab_pending"),
    countered: t("user_bookings_tab_countered"),
    accepted: t("user_bookings_tab_accepted"),
    completed: t("user_bookings_tab_completed"),
    rejected: t("user_bookings_tab_rejected"),
  };

  const submitReview = async () => {
    if (!reviewForm.comment.trim()) {
      toast.error(t("user_bookings_write_review_error"));
      return;
    }

    setReviewLoading(true);
    try {
      await ratingAPI.create({
        artistId: reviewModal.artist._id,
        rating: reviewForm.rating,
        review: reviewForm.comment.trim(),
      });
      toast.success(t("user_bookings_review_submitted"));
    } catch (err) {
      toast.error(err.response?.data?.message || t("user_bookings_review_failed"));
      setReviewLoading(false);
      return;
    }

    setBookings((prev) => prev.map((b) => (b._id === reviewModal._id ? { ...b, reviewed: true } : b)));
    setReviewLoading(false);
    setReviewModal(null);
    setReviewForm({ rating: 0, comment: "" });
  };

  const messageArtist = async (booking) => {
    const artistUserId = booking.artist?.user?._id || booking.artist?.user;
    if (!artistUserId) {
      toast.error(t("user_bookings_artist_info_missing"));
      return;
    }

    setMsgLoading(booking._id);
    try {
      const res = await chatAPI.createPrivate({ artistUserId });
      const chatId = res.chat?._id || res.chatId;
      navigate(`/chat${chatId ? `?open=${chatId}` : ""}`);
    } catch (err) {
      toast.error(err.response?.data?.message || t("user_bookings_chat_failed"));
    } finally {
      setMsgLoading(null);
    }
  };

  const handleCounter = async (bookingId, action, counterValue) => {
    const booking = bookings.find((b) => b._id === bookingId);
    if (action === "COUNTER" && (booking?.counterCount || 0) >= MAX_COUNTERS) {
      toast.error(t("user_bookings_counter_limit", { count: MAX_COUNTERS }));
      return;
    }

    try {
      await bookingAPI.counter({
        bookingId,
        action,
        ...(counterValue ? { counterPrice: Number(counterValue) } : {}),
      });
    } catch {}

    setBookings((prev) =>
      prev.map((b) =>
        b._id !== bookingId
          ? b
          : {
              ...b,
              status: action === "ACCEPT" ? "ACCEPTED" : action === "REJECT" ? "REJECTED" : "COUNTERED",
              counterCount: action === "COUNTER" ? (b.counterCount || 0) + 1 : b.counterCount,
              ...(counterValue ? { counterPrice: Number(counterValue) } : {}),
            }
      )
    );

    toast.success(
      action === "ACCEPT"
        ? t("user_bookings_counter_accepted")
        : action === "REJECT"
          ? t("user_bookings_booking_cancelled")
          : t("user_bookings_counter_sent")
    );
    setCounterModal(null);
    setCounterPrice("");
  };

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
          <h1>{t("my_bookings")}</h1>
          <p>{t("user_bookings_subtitle")}</p>
        </div>
      </div>
      <div className="main-content">
        <div className="tabs mb-3" style={{ maxWidth: 600 }}>
          {["all", "pending", "countered", "accepted", "completed", "rejected"].map((tabKey) => (
            <button
              key={tabKey}
              className={`tab ${tab === tabKey ? "active" : ""}`}
              onClick={() => setTab(tabKey)}
              style={{ position: "relative" }}
            >
              {tabLabels[tabKey]}
              {tabKey === "countered" && bookings.filter((b) => b.status === "COUNTERED").length > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    minWidth: 14,
                    height: 14,
                    background: "var(--danger)",
                    color: "white",
                    borderRadius: "50%",
                    fontSize: ".55rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {bookings.filter((b) => b.status === "COUNTERED").length}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <span className="emoji">{ICONS.bookings}</span>
            <h3>{t("user_bookings_empty_title")}</h3>
            <button className="btn btn-primary mt-2" onClick={() => navigate("/artists")}>
              {t("find_artists")}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {filtered.map((b) => {
              const name = artistDisplayName(b.artist);
              return (
                <div
                  key={b._id}
                  className={`card ${b.status === "COUNTERED" ? "pending-highlight" : ""}`}
                  style={{ padding: "1.5rem", cursor: "pointer" }}
                  onClick={() => setDetailBooking(b)}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg,var(--saffron),var(--gold))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontFamily: "'Yatra One',cursive",
                        fontSize: "1.5rem",
                        flexShrink: 0,
                      }}
                    >
                      {name?.[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "'Crimson Pro',serif", fontSize: "1.2rem", fontWeight: 600 }}>
                          {name}
                        </span>
                        {b.artist?.artistType && <ArtistTypeBadge type={b.artist.artistType} />}
                      </div>
                      <div style={{ fontSize: ".82rem", color: "var(--text-muted)", margin: "4px 0" }}>
                        {[b.artist?.eventTypes?.filter(Boolean)?.join(", "), b.artist?.user?.city?.toUpperCase() ? `${ICONS.location} ${b.artist.user.city.toUpperCase()}` : ""].filter(Boolean).join(" | ")}
                      </div>
                      <div style={{ fontSize: ".85rem", color: "var(--text-muted)" }}>
                        {ICONS.bookings} {fmtDate(b.availability?.date || b.eventDetails?.date || b.createdAt)}
                      </div>
                      {b.status === "COUNTERED" && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: "10px 12px",
                            background: b.counterBy === "USER" ? "rgba(34,197,94,.08)" : "rgba(59,130,246,.08)",
                            borderRadius: 8,
                            border: `1px solid ${b.counterBy === "USER" ? "rgba(34,197,94,.25)" : "rgba(59,130,246,.25)"}`,
                            fontSize: ".85rem",
                          }}
                        >
                          <strong style={{ color: b.counterBy === "USER" ? "#166534" : "#1d4ed8" }}>
                            {b.counterBy === "USER" ? t("user_bookings_your_counter_offer") : t("user_bookings_artist_counter_offer")}
                          </strong>
                          <strong style={{ color: b.counterBy === "USER" ? "#166534" : "#1d4ed8", fontSize: "1rem" }}>
                            {RUPEE}{b.counterPrice?.toLocaleString()}
                          </strong>
                          <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>
                            {t("user_bookings_your_budget_value", { amount: b.userBudget?.toLocaleString() })}
                          </span>
                          {(b.counterCount || 0) > 0 && (
                            <div style={{ fontSize: ".75rem", color: "var(--text-muted)", marginTop: 3 }}>
                              {t("user_bookings_exchange_count", { current: b.counterCount, max: MAX_COUNTERS })}
                              {b.counterBy === "USER" ? ` ${t("user_bookings_awaiting_artist")}` : ""}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {statusBadge(b.status)}
                      <div
                        style={{
                          fontFamily: "'Yatra One',cursive",
                          color: "var(--saffron-deep)",
                          fontSize: "1.2rem",
                          marginTop: 6,
                        }}
                      >
                        {RUPEE}{(b.counterPrice || b.artistPrice)?.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {(b.status === "PENDING" || b.status === "ACCEPTED" || b.status === "COUNTERED") && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: "1rem",
                        paddingTop: "1rem",
                        borderTop: "1px solid var(--border)",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      {b.status === "COUNTERED" && b.counterBy === "ARTIST" && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => handleCounter(b._id, "ACCEPT")}>
                            {t("user_bookings_accept")}
                          </button>
                          {(b.counterCount || 0) < MAX_COUNTERS ? (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => {
                                setCounterModal(b);
                                setCounterPrice(String(b.counterPrice || b.userBudget || ""));
                              }}
                            >
                              {t("user_bookings_counter_back")}
                            </button>
                          ) : (
                            <span
                              style={{
                                fontSize: ".75rem",
                                color: "#b91c1c",
                                padding: "4px 8px",
                                background: "rgba(239,68,68,.08)",
                                borderRadius: 6,
                              }}
                            >
                              {t("user_bookings_max_counters_reached")}
                            </span>
                          )}
                          <button className="btn btn-danger btn-sm" onClick={() => handleCounter(b._id, "REJECT")}>
                            {t("user_bookings_decline")}
                          </button>
                        </>
                      )}
                      {b.status === "COUNTERED" && b.counterBy === "USER" && (
                        <span style={{ fontSize: ".82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                          {t("user_bookings_waiting_artist")}
                        </span>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => messageArtist(b)} disabled={msgLoading === b._id}>
                        {msgLoading === b._id ? (
                          <>
                            <span className="spinner" style={{ width: 14, height: 14 }} /> {t("user_bookings_opening")}
                          </>
                        ) : (
                          t("user_bookings_message_artist")
                        )}
                      </button>
                      {b.status === "PENDING" && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleCounter(b._id, "REJECT")}>
                          {t("cancel")}
                        </button>
                      )}
                    </div>
                  )}

                  {b.status === "COMPLETED" && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: "1rem",
                        paddingTop: "1rem",
                        borderTop: "1px solid var(--border)",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      {b.reviewed ? (
                        <span className="badge badge-green" style={{ padding: "6px 12px" }}>
                          {t("user_bookings_review_submitted_badge")}
                        </span>
                      ) : (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setReviewModal(b);
                            setReviewForm({ rating: 0, comment: "" });
                          }}
                        >
                          {t("user_bookings_leave_review")}
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => messageArtist(b)} disabled={msgLoading === b._id}>
                        {msgLoading === b._id ? (
                          <>
                            <span className="spinner" style={{ width: 14, height: 14 }} /> {t("user_bookings_opening")}
                          </>
                        ) : (
                          t("user_bookings_view_chat")
                        )}
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/artist/${b.artist?._id}`)}>
                        {t("user_bookings_book_again")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {counterModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={t("user_bookings_counter_offer_aria")}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setCounterModal(null)}>x</button>
            <h2
              style={{
                fontFamily: "'Yatra One',cursive",
                color: "var(--saffron-deep)",
                marginBottom: "1.5rem",
              }}
            >
              {t("user_bookings_send_counter_offer")}
            </h2>
            <div
              style={{
                background: "var(--cream)",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: "1rem",
                fontSize: ".85rem",
              }}
            >
              <div>
                {t("user_bookings_artist_counter_label")} <strong style={{ color: "#1d4ed8" }}>{RUPEE}{counterModal.counterPrice?.toLocaleString()}</strong>
              </div>
              <div>
                {t("user_bookings_original_budget_label")} <strong>{RUPEE}{counterModal.userBudget?.toLocaleString()}</strong>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: "1rem" }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    background: (counterModal.counterCount || 0) > i ? "var(--saffron)" : "var(--cream-dark)",
                  }}
                />
              ))}
              <span
                style={{
                  fontSize: ".75rem",
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                  marginLeft: 4,
                }}
              >
                {t("user_bookings_counters_left", { count: MAX_COUNTERS - (counterModal.counterCount || 0) })}
              </span>
            </div>
            <div className="form-group mb-3">
              <label className="form-label">{t("user_bookings_your_counter_price")}</label>
              <input
                className="form-input"
                type="number"
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value)}
                placeholder={t("user_bookings_enter_price")}
                autoFocus
              />
              <div style={{ fontSize: ".75rem", color: "var(--text-muted)", marginTop: 4 }}>
                {t("user_bookings_counter_help")}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={() => handleCounter(counterModal._id, "COUNTER", counterPrice)}
                disabled={!counterPrice}
              >
                {t("user_bookings_send_counter")}
              </button>
              <button className="btn btn-success btn-sm" onClick={() => handleCounter(counterModal._id, "ACCEPT")}>
                {t("user_bookings_accept")}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setCounterModal(null)}>
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={t("user_bookings_leave_review_aria")}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <button className="modal-close" onClick={() => setReviewModal(null)}>x</button>
            <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: ".4rem" }}>{ICONS.star}</div>
              <h2
                style={{
                  fontFamily: "'Yatra One',cursive",
                  color: "var(--saffron-deep)",
                  marginBottom: ".2rem",
                }}
              >
                {t("user_bookings_leave_review_title")}
              </h2>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: ".88rem",
                  fontFamily: "'Crimson Pro',serif",
                  fontStyle: "italic",
                }}
              >
                {reviewModal.artist?.artistType === "GROUP"
                  ? reviewModal.artist.groupName
                  : `${reviewModal.artist?.user?.firstName || ""} ${reviewModal.artist?.user?.lastName || ""}`}
              </p>
            </div>
            <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
              <div style={{ fontSize: ".82rem", color: "var(--text-muted)", marginBottom: 8 }}>
                {t("user_bookings_tap_star")}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setReviewForm((f) => ({ ...f, rating: n }))}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "2.4rem",
                      lineHeight: 1,
                      color: reviewForm.rating >= n ? "var(--gold)" : "#d1d5db",
                      transform: reviewForm.rating === n ? "scale(1.2)" : "scale(1)",
                      transition: "color .15s, transform .15s",
                      padding: "0 3px",
                    }}
                  >
                    {ICONS.star}
                  </button>
                ))}
              </div>
              <div
                style={{
                  fontSize: ".82rem",
                  color: "var(--saffron-deep)",
                  marginTop: 6,
                  fontWeight: 600,
                  minHeight: "1.2em",
                }}
              >
                {reviewForm.rating === 0
                  ? t("user_bookings_select_rating")
                  : [
                      "",
                      t("user_bookings_rating_1"),
                      t("user_bookings_rating_2"),
                      t("user_bookings_rating_3"),
                      t("user_bookings_rating_4"),
                      t("user_bookings_rating_5"),
                    ][reviewForm.rating]}
              </div>
            </div>
            <div className="form-group mb-3">
              <label className="form-label">{t("user_bookings_your_review")}</label>
              <textarea
                className="form-input"
                rows={4}
                placeholder={t("user_bookings_review_placeholder")}
                value={reviewForm.comment}
                onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                style={{ resize: "none" }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={submitReview}
                disabled={reviewLoading || reviewForm.rating === 0}
              >
                {reviewLoading ? (
                  <>
                    <span className="spinner" /> {t("user_bookings_submitting")}
                  </>
                ) : (
                  t("user_bookings_submit_review")
                )}
              </button>
              <button className="btn btn-ghost" onClick={() => setReviewModal(null)}>
                {t("cancel")}
              </button>
            </div>
            {reviewForm.rating === 0 && (
              <div style={{ textAlign: "center", fontSize: ".75rem", color: "#b91c1c", marginTop: 6 }}>
                {t("user_bookings_select_star_first")}
              </div>
            )}
          </div>
        </div>
      )}

      {detailBooking && <BookingDetailModal booking={detailBooking} role="USER" onClose={() => setDetailBooking(null)} />}
    </div>
  );
}
