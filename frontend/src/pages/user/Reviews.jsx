import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ratingAPI } from "../../services/api";
import { artistDisplayName, fmtDate } from "../../utils/helpers";

export default function UserReviews() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ratingAPI
      .getMy()
      .then((res) => setReviews(res.reviews || []))
      .catch(() => toast.error("Failed to load your reviews"))
      .finally(() => setLoading(false));
  }, []);

  const getReviewDate = (item) => item.createdAt || item.updatedAt || item._id;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-content">
          <h1>Your Reviews</h1>
          <p>All reviews you have shared for artists</p>
        </div>
      </div>

      <div className="main-content">
        {loading ? (
          <div className="text-center" style={{ padding: "3rem" }}>
            <span className="spinner" /> Loading...
          </div>
        ) : reviews.length === 0 ? (
          <div className="empty-state">
            <span className="emoji">⭐</span>
            <h3>No reviews yet</h3>
            <p>You have not reviewed any artist yet.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {reviews.map((item) => (
              <button
                key={item._id}
                type="button"
                className="card"
                style={{ textAlign: "left", cursor: "pointer" }}
                onClick={() => navigate(`/artist/${item.artist?._id}`)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Yatra One',cursive",
                        color: "var(--saffron-deep)",
                        fontSize: "1.1rem",
                        marginBottom: ".25rem",
                      }}
                    >
                      {artistDisplayName(item.artist)}
                    </div>
                    <div style={{ fontSize: ".84rem", color: "var(--text-muted)" }}>
                      {item.artist?.user?.city ? item.artist.user.city.toUpperCase() : "CITY NOT AVAILABLE"}
                    </div>
                  </div>
                  <div className="badge badge-saffron">⭐ {Number(item.rating || 0).toFixed(1)}</div>
                </div>

                <p style={{ marginTop: ".9rem", lineHeight: 1.7, color: "var(--text)" }}>{item.review}</p>

                <div style={{ marginTop: ".9rem", fontSize: ".82rem", color: "var(--text-muted)" }}>
                  Reviewed on {fmtDate(getReviewDate(item))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
