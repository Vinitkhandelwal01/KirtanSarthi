import { useNavigate } from "react-router-dom";
import { artistDisplayName } from "../../utils/helpers";
import useLang from "../../hooks/useLang";

const formatDateTime = (value) => {
  const date = new Date(value);
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function EventCard({ event, showDistance = false }) {
  const navigate = useNavigate();
  const { t } = useLang();
  const artistName = event.artist
    ? artistDisplayName(event.artist)
    : t("artist_details_unavailable");

  return (
    <div
      className="event-card"
      style={{
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        boxShadow: "0 4px 20px var(--shadow)",
        transition: "transform 0.2s, box-shadow 0.2s",
        background: "var(--white)",
        border: "1px solid var(--border)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 30px var(--shadow)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 20px var(--shadow)";
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg,var(--brown),var(--saffron-deep))",
          padding: "1.2rem 1.2rem 2rem",
          color: "white",
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "6px" }}>🪔</div>
        <div style={{ fontFamily: "'Yatra One',cursive", fontSize: "1.1rem", lineHeight: 1.3 }}>
          {event.title}
        </div>
        <div
          style={{
            fontFamily: "'Crimson Pro',serif",
            fontSize: ".92rem",
            opacity: 0.88,
            marginTop: "4px",
            fontStyle: "italic",
          }}
        >
          {event.eventType} · {event.god}
        </div>
      </div>

      <div
        style={{
          background: "var(--white)",
          padding: "1.2rem",
          display: "flex",
          flexDirection: "column",
          gap: ".55rem",
        }}
      >
        <div style={{ fontSize: ".86rem", color: "var(--text)" }}>📍 {event.city?.toUpperCase()}</div>
        <div style={{ fontSize: ".86rem", color: "var(--text)" }}>🗓️ {formatDateTime(event.dateTime)}</div>
        <div style={{ fontSize: ".86rem", color: "var(--text)" }}>🎵 {artistName}</div>
        {showDistance && event.distance !== null && event.distance !== undefined ? (
          <div style={{ fontSize: ".83rem", color: "var(--text-muted)" }}>
            {t("distance_away", { distance: (event.distance / 1000).toFixed(1) })}
          </div>
        ) : null}
        <button
          type="button"
          className="btn btn-outline"
          style={{ marginTop: ".35rem", width: "100%" }}
          onClick={() => navigate(`/events/${event._id}`)}
        >
          {t("view_details")}
        </button>
      </div>
    </div>
  );
}
