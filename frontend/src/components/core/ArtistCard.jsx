import { Stars, initials, artistDisplayName } from "../../utils/helpers";
import useLang from "../../hooks/useLang";

export default function ArtistCard({ artist, onClick }) {
  const { t } = useLang();
  const name = artistDisplayName(artist);

  return (
    <div
      className="artist-card card-hover"
      style={{ textAlign: "left", cursor: "pointer", border: "none", position: "relative" }}
    >
      <div className="artist-card-header">
        {artist.image ? (
          <img
            src={artist.image}
            alt={name}
            style={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              border: "3px solid white",
              objectFit: "cover",
              boxShadow: "0 4px 15px rgba(0,0,0,.2)",
            }}
          />
        ) : (
          <div className="artist-avatar">{initials(artist.user)}</div>
        )}
        {artist.isApproved && (
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 12,
              background: "rgba(255,255,255,.92)",
              color: "#166534",
              fontSize: ".7rem",
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            {t("verified")}
          </span>
        )}
      </div>

      <div className="artist-card-body">
        <div className="artist-name">{name}</div>
        {artist.artistType === "GROUP" && artist.user?.firstName && (
          <div
            style={{
              fontSize: ".75rem",
              color: "var(--text-muted)",
              marginBottom: 4,
              fontStyle: "italic",
            }}
          >
            {t("led_by", { name: `${artist.user.firstName} ${artist.user.lastName}` })}
          </div>
        )}

        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {artist.user?.city && (
            <span
              style={{
                fontSize: ".72rem",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 20,
                background: "rgba(255,153,51,.1)",
                color: "var(--saffron-deep)",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              📍 {artist.user.city.toUpperCase()}
            </span>
          )}
          <span
            style={{
              fontSize: ".68rem",
              fontWeight: 700,
              letterSpacing: ".5px",
              padding: "3px 10px",
              borderRadius: 20,
              background:
                artist.artistType === "GROUP"
                  ? "rgba(99,102,241,.1)"
                  : "rgba(245,158,11,.1)",
              color: artist.artistType === "GROUP" ? "#4338ca" : "#b45309",
              border: `1px solid ${
                artist.artistType === "GROUP"
                  ? "rgba(99,102,241,.25)"
                  : "rgba(245,158,11,.25)"
              }`,
            }}
          >
            {artist.artistType === "GROUP"
              ? t("artist_type_group")
              : t("artist_type_solo")}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Stars rating={artist.averageRating} />
          <span style={{ fontSize: ".85rem", fontWeight: 600, color: "var(--text)" }}>
            {(artist.averageRating || 0).toFixed(1)}
          </span>
        </div>

        {artist.eventTypes?.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {artist.eventTypes.map((et) => (
              <span
                key={et}
                className="badge badge-saffron"
                style={{
                  fontSize: ".72rem",
                  padding: "3px 10px",
                  borderRadius: 20,
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                }}
              >
                {et}
              </span>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: ".75rem",
              color: "var(--text-muted)",
              paddingTop: ".7rem",
              borderTop: "1px solid var(--border)",
            }}
          >
            {t("starting_from")}
          </div>
          <div className="artist-price" style={{ fontSize: "1.3rem" }}>
            ₹{artist.price?.toLocaleString()}
          </div>
        </div>

        <button
          className="btn btn-outline"
          onClick={onClick}
          style={{
            width: "100%",
            borderRadius: 24,
            fontWeight: 600,
            fontSize: ".85rem",
            padding: "8px 0",
          }}
        >
          {t("view_profile")}
        </button>
      </div>
    </div>
  );
}
