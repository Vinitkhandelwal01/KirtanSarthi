import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { dashboardAPI, artistAPI, eventAPI } from "../../services/api";
import { statusBadge, notifIcon, fmtDate, artistDisplayName } from "../../utils/helpers";
import ArtistCard from "../../components/core/ArtistCard";
import useLang from "../../hooks/useLang";

const ICONS = {
  bookings: "\u{1F4C5}",
  artists: "\u{1F3B5}",
  reviews: "\u2B50",
  messages: "\u{1F4AC}",
  location: "\u{1F4CD}",
  distance: "\u{1F4CF}",
};

const RUPEE = "\u20B9";
const MAX_ACCEPTABLE_GEO_ACCURACY_METERS = 5000;

const getGeoPermissionState = async () => {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unknown";
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status?.state || "unknown";
  } catch {
    return "unknown";
  }
};

export default function UserDashboard() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { user } = useSelector((s) => s.auth);
  const [data, setData] = useState(null);
  const [artists, setArtists] = useState([]);
  const [nearbyEvents, setNearbyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nearbyLoading, setNearbyLoading] = useState(true);
  const lastLocationSyncRef = useRef("");

  useEffect(() => {
    dashboardAPI
      .user()
      .then((res) => setData(res.data || res))
      .catch(() => {})
      .finally(() => setLoading(false));

    artistAPI
      .search({ limit: 3 })
      .then((res) => setArtists(res.artists || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?._id) return;

    let cancelled = false;
    const fallbackParams = user?.city ? { city: user.city } : {};

    const loadNearby = async (params = {}) => {
      setNearbyLoading(true);
      try {
        const res = await eventAPI.getNearby(params);
        if (!cancelled) setNearbyEvents(res.events || []);
      } catch {
        if (!cancelled) setNearbyEvents([]);
      } finally {
        if (!cancelled) setNearbyLoading(false);
      }
    };
    getGeoPermissionState();

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      loadNearby(fallbackParams, "fallback:no_geolocation_api");
      return () => {
        cancelled = true;
      };
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const hasLowAccuracy =
          Number.isFinite(accuracy) && accuracy > MAX_ACCEPTABLE_GEO_ACCURACY_METERS;
        const locationKey = `${lat.toFixed(5)}:${lng.toFixed(5)}`;
        if (hasLowAccuracy) {
          // Use live coords even when coarse; only skip profile location sync.
          await loadNearby({ lat, lng });
          return;
        }

        if (lastLocationSyncRef.current !== locationKey) {
          lastLocationSyncRef.current = locationKey;
        }

        await loadNearby({ lat, lng });
      },
      async (error) => {
        void error;
        await loadNearby(fallbackParams);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    return () => {
      cancelled = true;
    };
  }, [user?._id, user?.city]);

  const bookings = data?.recentBookings || [];
  const notifs = data?.notifications || [];
  const stats = data?.stats || {};
  const unread = notifs.filter((n) => !n.isRead).length;

  const statCards = [
    [ICONS.bookings, stats.activeBookings ?? 0, t("user_dashboard_active_bookings"), "/bookings"],
    [ICONS.artists, stats.artistsExplored ?? 0, t("user_dashboard_artists_explored"), "/artists"],
    [ICONS.reviews, stats.reviewsGiven ?? 0, t("user_dashboard_reviews_given"), "/my-reviews"],
    [ICONS.messages, stats.unreadNotifications ?? 0, t("notifications"), "/notifications"],
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-content">
          <h1>{t("user_dashboard_greeting", { name: user?.firstName || "" })}</h1>
          <p>{t("user_dashboard_subtitle")}</p>
        </div>
      </div>
      <div className="main-content">
        {loading ? (
          <div className="text-center" style={{ padding: "3rem" }}>
            <span className="spinner" /> {t("loading")}
          </div>
        ) : (
          <>
            <div className="grid-4 mb-3">
              {statCards.map(([icon, val, label, path]) => (
                <button
                  type="button"
                  key={label}
                  className="stat-card clickable"
                  data-icon={icon}
                  onClick={() => navigate(path)}
                >
                  <div className="stat-label">{label}</div>
                  <div className="stat-value">{val}</div>
                  <div className="stat-sub">{icon}</div>
                </button>
              ))}
            </div>

            <div className="grid-2">
              <div>
                <h2 className="section-title mb-1">{t("user_dashboard_recent_bookings")}</h2>
                <div className="section-divider" />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {bookings.slice(0, 3).map((b) => {
                    const name = artistDisplayName(b.artist);
                    return (
                      <div key={b._id} className="booking-item">
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg,var(--saffron),var(--gold))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontFamily: "'Yatra One',cursive",
                            fontSize: "1.2rem",
                            flexShrink: 0,
                          }}
                        >
                          {name?.[0]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{name}</div>
                          <div style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>
                            {ICONS.bookings} {fmtDate(b.availability?.date || b.eventDetails?.date || b.createdAt)}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          {statusBadge(b.status)}
                          <div style={{ fontSize: ".78rem", color: "var(--text-muted)", marginTop: 4 }}>
                            {RUPEE}{b.userBudget?.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {bookings.length === 0 && (
                    <div className="text-center" style={{ padding: "1rem", color: "var(--text-muted)" }}>
                      {t("user_dashboard_no_bookings")}
                    </div>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate("/bookings")}>
                    {t("user_dashboard_view_all")}
                  </button>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".3rem" }}>
                  <h2 className="section-title">{t("notifications")}</h2>
                  {unread > 0 && <span className="badge badge-saffron">{t("user_dashboard_unread_badge", { count: unread })}</span>}
                </div>
                <div className="section-divider" />
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                  {notifs.slice(0, 4).map((n) => (
                    <div key={n._id} className={`notif-item ${!n.isRead ? "unread" : ""}`}>
                      <div className="notif-icon">{notifIcon(n.type)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: ".85rem", lineHeight: 1.4 }}>{n.message}</div>
                        <div style={{ fontSize: ".75rem", color: "var(--text-muted)", marginTop: 2 }}>
                          {fmtDate(n.createdAt)}
                        </div>
                      </div>
                      {!n.isRead && <div className="notif-dot" />}
                    </div>
                  ))}
                  {notifs.length === 0 && (
                    <div className="text-center" style={{ padding: "1rem", color: "var(--text-muted)" }}>
                      {t("user_dashboard_no_notifications")}
                    </div>
                  )}
                </div>
                <button className="btn btn-ghost btn-sm mt-1" onClick={() => navigate("/notifications")}>
                  {t("user_dashboard_all_notifications")}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <h2 className="section-title mb-1">{t("nearby_events_title")}</h2>
              <p className="section-sub">{t("user_dashboard_nearby_subtitle")}</p>
              <div className="section-divider" />
              {nearbyLoading ? (
                <div className="text-center" style={{ padding: "1.5rem" }}>
                  <span className="spinner" /> {t("user_dashboard_loading_nearby")}
                </div>
              ) : nearbyEvents.length === 0 ? (
                <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                  {t("user_dashboard_no_nearby_events")}
                </div>
              ) : (
                <div className="grid-3 mb-3">
                  {nearbyEvents.map((event) => (
                    <button
                      key={event._id}
                      type="button"
                      className="card"
                      style={{ textAlign: "left", cursor: "pointer" }}
                      onClick={() => navigate(`/events/${event._id}`)}
                    >
                      <div style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", fontSize: "1.05rem" }}>
                        {event.title}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: ".82rem", marginTop: 4 }}>
                        {[event.eventType, event.god].filter(Boolean).join(" | ")}
                      </div>
                      <div style={{ fontSize: ".86rem", marginTop: 10 }}>
                        {ICONS.location} {event.address}, {(event.city || "").toUpperCase()}
                      </div>
                      <div style={{ fontSize: ".82rem", color: "var(--text-muted)", marginTop: 6 }}>
                        {ICONS.bookings} {fmtDate(event.dateTime)}
                      </div>
                      {event.distance !== null && event.distance !== undefined && (
                        <div style={{ fontSize: ".82rem", color: "var(--text-muted)", marginTop: 6 }}>
                          {t("distance_away", { distance: (event.distance / 1000).toFixed(1) })}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4">
              <h2 className="section-title mb-1">{t("user_dashboard_discover_artists")}</h2>
              <p className="section-sub">{t("user_dashboard_artists_subtitle")}</p>
              <div className="section-divider" />
              <div className="grid-3">
                {artists.map((a) => (
                  <ArtistCard key={a._id} artist={a} onClick={() => navigate(`/artist/${a._id}`)} />
                ))}
              </div>
              {artists.length > 0 && (
                <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                  <button className="btn btn-outline" onClick={() => navigate("/artists")}>
                    {t("user_dashboard_find_more_artists")}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
