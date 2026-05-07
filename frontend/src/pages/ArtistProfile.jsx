import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { Stars, artistDisplayName, ArtistTypeBadge } from "../utils/helpers";
import { artistAPI, ratingAPI, bookingAPI, chatAPI } from "../services/api";
import BookingModal from "../components/common/BookingModal";
import toast from "react-hot-toast";
import { getYouTubeEmbedUrl } from "../utils/validation";

export default function ArtistProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [artist, setArtist] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [showBooking, setShowBooking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [msgLoading, setMsgLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fetches = [
      artistAPI.getProfile(id),
      ratingAPI.getAll(id),
      ratingAPI.getAverage(id),
    ];
    // If logged in as USER, also fetch their bookings to find current status
    if (user?.accountType === "USER") {
      fetches.push(bookingAPI.getMyBookings());
    }
    Promise.all(fetches)
      .then(([aRes, rRes, avgRes, bRes]) => {
        setArtist(aRes.artist || aRes);
        setReviews(rRes.reviews || []);
        setAvgRating(avgRes.averageRating || 0);
        if (bRes) {
          const active = (bRes.bookings || []).find(
            (b) => b.artist?._id === id && ["PENDING", "COUNTERED", "ACCEPTED"].includes(b.status)
          );
          setCurrentBooking(active || null);
        }
      })
      .catch(() => toast.error("Failed to load artist profile"))
      .finally(() => setLoading(false));
  }, [id, user]);

  if (loading)
    return (
      <div className="main-content text-center" style={{ padding: "4rem" }}>
        <span className="spinner" /> Loading…
      </div>
    );
  if (!artist)
    return (
      <div className="main-content text-center" style={{ padding: "4rem" }}>
        Artist not found.
      </div>
    );

  const name = artistDisplayName(artist);
  const videoLinks = (artist.videoLinks || []).filter(Boolean);

  const handleBook = () => {
    if (!user) {
      toast.error("Please login to book");
      navigate("/login");
      return;
    }
    if (user.accountType !== "USER") {
      toast.error("Only users can book");
      return;
    }
    setShowBooking(true);
  };

  const handleMessage = async () => {
    if (!user) { toast.error("Please login first"); navigate("/login"); return; }
    const artistUserId = artist.user?._id || artist.user;
    if (!artistUserId) { toast.error("Artist info missing"); return; }
    setMsgLoading(true);
    try {
      const res = await chatAPI.createPrivate({ artistUserId });
      const chatId = res.chat?._id || res.chatId;
      navigate(`/chat${chatId ? `?open=${chatId}` : ""}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "You can message the artist after your first booking");
    } finally {
      setMsgLoading(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <div className="profile-hero">
        <div className="profile-avatar-lg">{name?.[0] || "🎵"}</div>
        <div className="profile-name">{name}</div>
        <div className="profile-type" style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <ArtistTypeBadge type={artist.artistType} />
          {artist.artistType === "GROUP" ? "Group Ensemble" : "Solo Artist"}
        </div>
        {artist.artistType === "GROUP" && artist.user?.firstName && (
          <div style={{ fontSize: ".9rem", color: "rgba(255,255,255,.75)", fontStyle: "italic", marginTop: ".3rem" }}>
            Led by {artist.user.firstName} {artist.user.lastName}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            marginTop: ".8rem",
            flexWrap: "wrap",
          }}
        >
          {[
            ["📍", artist.user?.city?.toUpperCase()],
            ["⭐", `${avgRating || artist.rating || 0} Rating`],
            ["✅", "Verified"],
          ].map(([icon, val]) => (
            <span
              key={val}
              style={{
                background: "rgba(255,255,255,.15)",
                padding: "4px 14px",
                borderRadius: 999,
                fontSize: ".85rem",
              }}
            >
              {icon} {val}
            </span>
          ))}
        </div>
      </div>

      <div className="main-content" style={{ paddingTop: "2rem" }}>
        <button
          className="btn btn-ghost mb-3"
          onClick={() => navigate("/artists")}
        >
          ← Back to Search
        </button>
        <div
          className="artist-profile-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: "2rem",
            alignItems: "start",
          }}
        >
          <div>
            {/* About */}
            <div className="card mb-3">
              <h2
                style={{
                  fontFamily: "'Yatra One',cursive",
                  color: "var(--saffron-deep)",
                  marginBottom: "1rem",
                }}
              >
                About
              </h2>
              <p
                style={{
                  fontFamily: "'Crimson Pro',serif",
                  fontSize: "1.1rem",
                  lineHeight: 1.8,
                }}
              >
                {artist.description}
              </p>
            </div>

            {videoLinks.length > 0 && (
              <div className="card mb-3">
                <h2
                  style={{
                    fontFamily: "'Yatra One',cursive",
                    color: "var(--saffron-deep)",
                    marginBottom: "1rem",
                  }}
                >
                  Videos
                </h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {videoLinks.map((link, index) => {
                    const embedUrl = getYouTubeEmbedUrl(link);

                    if (!embedUrl) {
                      return (
                        <a
                          key={`${link}-${index}`}
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline"
                          style={{ justifyContent: "center" }}
                        >
                          Open Video {index + 1}
                        </a>
                      );
                    }

                    return (
                      <div key={`${link}-${index}`} style={{ display: "grid", gap: ".75rem" }}>
                        <div
                          style={{
                            position: "relative",
                            paddingTop: "56.25%",
                            overflow: "hidden",
                            borderRadius: 16,
                            border: "1px solid var(--border)",
                            background: "#000",
                          }}
                        >
                          <iframe
                            src={embedUrl}
                            title={`Artist video ${index + 1}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: "100%",
                              height: "100%",
                              border: 0,
                            }}
                          />
                        </div>
                        <a href={link} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                          Watch on YouTube
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Specializations */}
            <div className="card mb-3">
              <h2
                style={{
                  fontFamily: "'Yatra One',cursive",
                  color: "var(--saffron-deep)",
                  marginBottom: "1rem",
                }}
              >
                Specializations
              </h2>
              <div
                style={{
                  display: "flex",
                  gap: ".5rem",
                  flexWrap: "wrap",
                  marginBottom: "1rem",
                }}
              >
                <strong
                  style={{
                    fontSize: ".85rem",
                    color: "var(--brown)",
                    marginRight: 4,
                  }}
                >
                  Event Types:
                </strong>
                {artist.eventTypes?.map((e) => (
                  <span key={e} className="badge badge-saffron">
                    {e}
                  </span>
                ))}
              </div>
              <div
                style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}
              >
                <strong
                  style={{
                    fontSize: ".85rem",
                    color: "var(--brown)",
                    marginRight: 4,
                  }}
                >
                  Deities:
                </strong>
                {artist.gods?.map((g) => (
                  <span key={g} className="badge badge-gold">
                    {g}
                  </span>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div className="card">
              <h2
                style={{
                  fontFamily: "'Yatra One',cursive",
                  color: "var(--saffron-deep)",
                  marginBottom: "1rem",
                }}
              >
                Reviews
              </h2>
              {reviews.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: ".9rem" }}>
                  No reviews yet.
                </p>
              ) : (
                reviews.map((r, i) => (
                  <div
                    key={r._id || i}
                    style={{
                      padding: "1rem",
                      borderBottom:
                        i !== reviews.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                      }}
                    >
                      <strong style={{ fontSize: ".9rem" }}>
                        {r.user?.firstName || "Anonymous"}
                      </strong>
                      <Stars rating={r.rating} />
                    </div>
                    <p
                      style={{
                        fontSize: ".88rem",
                        color: "var(--text-muted)",
                        fontFamily: "'Crimson Pro',serif",
                        lineHeight: 1.6,
                      }}
                    >
                      {r.review || r.comment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sticky booking panel */}
          <div
            className="card artist-profile-sticky"
            style={{ position: "sticky", top: "80px" }}
          >
            {/* Price */}
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: ".85rem", color: "var(--text-muted)" }}>
                Starting from
              </div>
              <div
                style={{
                  fontFamily: "'Yatra One',cursive",
                  fontSize: "2.2rem",
                  color: "var(--saffron-deep)",
                }}
              >
                ₹{artist.price?.toLocaleString()}
              </div>
            </div>

            {/* Info rows */}
            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: ".88rem", color: "var(--text-muted)" }}>⭐ Rating</span>
                <strong style={{ fontSize: ".88rem" }}>{(avgRating || artist.averageRating || 0).toFixed(1)}/5.0</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: ".88rem", color: "var(--text-muted)" }}>🎭 Type</span>
                <strong style={{ fontSize: ".88rem" }}>{artist.artistType}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: ".88rem", color: "var(--text-muted)" }}>📍 City</span>
                <strong style={{ fontSize: ".88rem" }}>{artist.user?.city?.toUpperCase()}</strong>
              </div>
            </div>

            {/* Book button */}
            <button
              className="btn btn-primary btn-lg w-full"
              onClick={handleBook}
              style={{ borderRadius: 28, fontWeight: 600, padding: "12px 0" }}
            >
              Book This Artist 🔔
            </button>

            {/* Message button */}
            <button
              className="btn btn-outline w-full mt-1"
              onClick={handleMessage}
              disabled={msgLoading}
              style={{ borderRadius: 28 }}
            >
              {msgLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Opening…</> : "💬 Message Artist"}
            </button>

            {/* Current booking status */}
            {currentBooking && (
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <span style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>Current booking: </span>
                <span
                  className={`badge ${
                    currentBooking.status === "ACCEPTED"
                      ? "badge-green"
                      : currentBooking.status === "PENDING"
                        ? "badge-gold"
                        : "badge-blue"
                  }`}
                  style={{ fontSize: ".75rem" }}
                >
                  {currentBooking.status}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {showBooking && (
        <BookingModal
          artist={artist}
          onClose={() => setShowBooking(false)}
          onSuccess={() => navigate("/bookings")}
        />
      )}
    </div>
  );
}
