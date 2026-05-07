import { useState, useEffect } from "react";
import { adminAPI, bookingAPI } from "../../services/api";
import { statusBadge, fmtDate, artistDisplayName } from "../../utils/helpers";
import BookingDetailModal from "../../components/common/BookingDetailModal";
import toast from "react-hot-toast";

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ALL");
  const [detailBooking, setDetailBooking] = useState(null);

  useEffect(() => {
    adminAPI
      .getBookings()
      .then((res) => setBookings(res.bookings || []))
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === "ALL" ? bookings : bookings.filter((b) => b.status === tab);

  const markComplete = async (id) => {
    try {
      await bookingAPI.complete({ bookingId: id });
      setBookings((prev) => prev.map((b) => (b._id === id ? { ...b, status: "COMPLETED" } : b)));
      toast.success("Booking marked as completed");
    } catch {
      toast.error("Failed to mark complete");
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
          <h1>All Bookings 📅</h1>
          <p>Platform-wide booking management</p>
        </div>
      </div>
      <div className="main-content">
        <div className="tabs mb-3" style={{ maxWidth: 520 }}>
          {["ALL", "PENDING", "ACCEPTED", "COMPLETED", "REJECTED"].map((t) => (
            <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filtered.map((b) => {
            const artistName = artistDisplayName(b.artist);
            const userName = b.user ? `${b.user.firstName} ${b.user.lastName}` : "Unknown User";
            return (
              <div key={b._id} className="card" style={{ padding: "1.2rem", cursor: "pointer" }} onClick={() => setDetailBooking(b)}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{userName} → {artistName || "Unknown Artist"}</div>
                    <div style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>📅 {fmtDate(b.availability?.date || b.eventDetails?.date || b.createdAt)}</div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    {statusBadge(b.status)}
                    <strong style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)" }}>
                      ₹{(b.userBudget || b.artistPrice || 0).toLocaleString()}
                    </strong>
                    {b.status === "ACCEPTED" && (
                      <button className="btn btn-success btn-sm" onClick={() => markComplete(b._id)}>
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="empty-state">
              <span className="emoji">📅</span>
              <h3>No bookings found</h3>
            </div>
          )}
        </div>
      </div>

      {detailBooking && (
        <BookingDetailModal
          booking={detailBooking}
          role="ADMIN"
          onClose={() => setDetailBooking(null)}
        />
      )}
    </div>
  );
}
