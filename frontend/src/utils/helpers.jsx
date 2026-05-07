export const Stars = ({ rating = 0, className = "" }) => (
  <div className={`stars ${className}`.trim()}>
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} className={`star ${i <= Math.round(rating) ? "" : "empty"}`}>
        ★
      </span>
    ))}
  </div>
);

export const statusBadge = (s) => {
  const m = {
    PENDING: "badge-gold",
    ACCEPTED: "badge-green",
    REJECTED: "badge-red",
    COUNTERED: "badge-blue",
    CANCELLED: "badge-gray",
    COMPLETED: "badge-green",
  };
  return <span className={`badge ${m[s] || "badge-gray"}`}>{s}</span>;
};

export const notifIcon = (t) =>
  ({
    BOOKING_REQUEST: "📩",
    BOOKING_ACCEPTED: "✅",
    BOOKING_REJECTED: "❌",
    BOOKING_COUNTERED: "💬",
    ARTIST_APPROVED: "🎉",
    ARTIST_REJECTED: "⚠️",
    NEARBY_EVENT: "📍",
    MEMBER_ADDED: "👋",
    MEMBER_REMOVED: "🚪",
  })[t] || "🔔";

export const initials = (u) =>
  u ? `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase() : "?";

export const fmtDate = (s) => {
  if (!s) return "Date not available";
  let date = new Date(s);

  if (Number.isNaN(date.getTime()) && typeof s === "string" && /^[a-f\d]{24}$/i.test(s)) {
    const timestamp = parseInt(s.slice(0, 8), 16) * 1000;
    date = new Date(timestamp);
  }

  if (Number.isNaN(date.getTime())) return "Date not available";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const fmtTime = (s) =>
  new Date(s).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

/** Resolve the display name for an artist (works with artist objects or booking.artist) */
export const artistDisplayName = (artist) => {
  if (!artist) return "Unknown Artist";
  if (artist.artistType === "GROUP" && artist.groupName) return artist.groupName;
  const first = artist.user?.firstName || artist.firstName || "";
  const last = artist.user?.lastName || artist.lastName || "";
  return `${first} ${last}`.trim() || "Unknown Artist";
};

/** Small badge for artist type (GROUP / SOLO) */
export const ArtistTypeBadge = ({ type, style }) => (
  <span
    style={{
      fontSize: ".68rem",
      fontWeight: 700,
      letterSpacing: ".5px",
      padding: "2px 8px",
      borderRadius: 4,
      background: type === "GROUP" ? "rgba(99,102,241,.1)" : "rgba(245,158,11,.1)",
      color: type === "GROUP" ? "#4338ca" : "#b45309",
      border: `1px solid ${type === "GROUP" ? "rgba(99,102,241,.25)" : "rgba(245,158,11,.25)"}`,
      ...style,
    }}
  >
    {type === "GROUP" ? "GROUP" : "SOLO"}
  </span>
);
