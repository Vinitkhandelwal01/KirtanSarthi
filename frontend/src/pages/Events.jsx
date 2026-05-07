import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { eventAPI } from "../services/api";
import { artistDisplayName } from "../utils/helpers";
import useLang from "../hooks/useLang";

const getArtistName = (ev) => (ev.artist ? artistDisplayName(ev.artist) : null);

const getHostName = (ev) => {
  if (!ev.host) return null;
  return `${ev.host.firstName} ${ev.host.lastName}`;
};

export default function Events() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { user } = useSelector((state) => state.auth);
  const canCreate = user?.accountType === "ARTIST" || user?.accountType === "ADMIN";
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cityQuery, setCityQuery] = useState("");

  const fetchEvents = (city) => {
    setLoading(true);
    const params = city ? { city } : {};
    eventAPI
      .getAll(params)
      .then((res) => setEvents(res.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSearch = () => {
    fetchEvents(cityQuery.trim());
  };

  const fmtDateTime = (s) => {
    const d = new Date(s);
    const date = d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { date, time };
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-content">
          <h1>🪔 {t("upcoming_events")}</h1>
          <p style={{ fontFamily: "'Crimson Pro',serif", fontStyle: "italic" }}>
            {t("events_subtitle")}
          </p>
        </div>
      </div>
      <div className="main-content">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "2rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flex: "0 1 280px" }}>
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "1rem",
                opacity: 0.5,
              }}
            >
              🔍
            </span>
            <input
              className="form-input"
              placeholder={t("search_by_city_only")}
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              style={{ paddingLeft: 36, width: "100%" }}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSearch}>
            {t("search")}
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate("/events/nearby")}
          >
            {t("events_near_you")}
          </button>
          {canCreate && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate("/events/create")}
              style={{ marginLeft: "auto" }}
            >
              ✨ {t("create_event")}
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center" style={{ padding: "3rem" }}>
            <span className="spinner" /> {t("app_loading")}
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <span className="emoji">🪔</span>
            <h3>{t("no_events")}</h3>
            {canCreate && (
              <button className="btn btn-primary mt-2" onClick={() => navigate("/events/create")}>
                ✨ {t("create_event")}
              </button>
            )}
          </div>
        ) : (
          <div className="grid-3">
            {events.map((ev) => {
              const { date, time } = fmtDateTime(ev.dateTime || ev.createdAt);
              const artistName = getArtistName(ev);
              const hostName = getHostName(ev);

              return (
                <div
                  key={ev._id}
                  className="event-card"
                  style={{
                    borderRadius: "var(--radius-lg)",
                    overflow: "hidden",
                    boxShadow: "0 4px 20px var(--shadow)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    cursor: "pointer",
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
                      padding: "1.2rem 1.2rem 2.2rem",
                      color: "white",
                      position: "relative",
                    }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "6px" }}>🪔</div>
                    <div style={{ fontFamily: "'Yatra One',cursive", fontSize: "1.15rem", lineHeight: 1.3 }}>
                      {ev.title}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Crimson Pro',serif",
                        fontSize: ".9rem",
                        opacity: 0.85,
                        marginTop: "4px",
                        fontStyle: "italic",
                      }}
                    >
                      {ev.eventType} · {ev.god}
                    </div>
                  </div>
                  <div
                    style={{
                      background: "var(--white)",
                      padding: "1.25rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                    }}
                  >
                    <p style={{ fontSize: ".85rem", color: "var(--text)" }}>
                      <span style={{ color: "var(--danger)" }}>📍</span> {ev.address},{" "}
                      <strong>{(ev.city || "").toUpperCase()}</strong>
                    </p>
                    <p style={{ fontSize: ".85rem", color: "var(--text)" }}>
                      🗓️ <strong>{date}</strong>{" "}
                      <span style={{ color: "var(--text-muted)" }}>{time}</span>
                    </p>
                    {hostName && <p style={{ fontSize: ".85rem", color: "var(--text)" }}>👤 {hostName}</p>}
                    {artistName && (
                      <p style={{ fontSize: ".85rem" }}>
                        🎵{" "}
                        <span
                          style={{
                            color: "var(--saffron-deep)",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (ev.artist?._id) navigate(`/artists/${ev.artist._id}`);
                          }}
                        >
                          {artistName}
                        </span>
                      </p>
                    )}
                    <button
                      className="btn btn-outline"
                      style={{
                        marginTop: "0.5rem",
                        width: "100%",
                        fontSize: ".85rem",
                        padding: "8px 0",
                      }}
                      onClick={() => navigate(`/events/${ev._id}`)}
                    >
                      {t("view_details")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
