import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { eventAPI } from "../services/api";
import { artistDisplayName } from "../utils/helpers";
import useAuth from "../hooks/useAuth";
import useLang from "../hooks/useLang";
import toast from "react-hot-toast";

const getArtistName = (ev) => (ev.artist ? artistDisplayName(ev.artist) : null);

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLang();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [permissions, setPermissions] = useState({
    canEditCore: false,
    canDelete: false,
  });

  useEffect(() => {
    setLoading(true);
    eventAPI
      .getById(id)
      .then((res) => setEvent(res.event || res))
      .catch(() => toast.error("Failed to load event"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user) return;

    eventAPI
      .getForManage(id)
      .then((res) => {
        setPermissions(res.permissions || {});
        if (res.event) setEvent(res.event);
      })
      .catch(() => {
        setPermissions({
          canEditCore: false,
          canDelete: false,
        });
      });
  }, [id, user]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this event?")) return;
    setDeleting(true);
    try {
      await eventAPI.delete(id);
      toast.success("Event deleted");
      navigate("/events");
    } catch (err) {
      toast.error(err.message || "Failed to delete");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content text-center" style={{ padding: "4rem" }}>
        <span className="spinner" /> {t("loading")}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="main-content text-center" style={{ padding: "4rem" }}>
        Event not found
      </div>
    );
  }

  const ev = event;
  const evDate = new Date(ev.dateTime || ev.createdAt);
  const now = new Date();
  const diff = evDate - now;
  const daysLeft = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  const hrsLeft = Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  const artistName = getArtistName(ev);
  const hostName = ev.host ? `${ev.host.firstName} ${ev.host.lastName}` : null;

  const detailRows = [
    [
      "📅",
      "Date & Time",
      evDate.toLocaleString("en-IN", {
        dateStyle: "full",
        timeStyle: "short",
      }),
    ],
    ["📍", "Address", `${ev.address}, ${ev.city?.toUpperCase()}`],
    ["🎵", "Type", ev.eventType],
    ["🙏", "Deity", ev.god],
    ...(hostName ? [["🙋", "Host (Organiser)", hostName]] : []),
    ...(artistName ? [["🎤", "Artist / Mandali", artistName]] : []),
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-content">
          <h1>🪔 {ev.title}</h1>
          <p style={{ fontStyle: "italic" }}>
            {ev.eventType} · {ev.god || "General"}
          </p>
        </div>
      </div>
      <div className="main-content">
        <button className="btn btn-ghost mb-3" onClick={() => navigate("/events")}>
          ← {t("back")}
        </button>
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            <div className="card mb-2">
              <h2
                style={{
                  fontFamily: "'Yatra One',cursive",
                  color: "var(--saffron-deep)",
                  marginBottom: "1.2rem",
                }}
              >
                {t("eventDetails")}
              </h2>
              {detailRows.map(([icon, label, val]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontSize: "1.2rem", width: 28, flexShrink: 0 }}>{icon}</div>
                  <div>
                    <div
                      style={{
                        fontSize: ".75rem",
                        color: "var(--text-muted)",
                        fontWeight: 500,
                      }}
                    >
                      {label}
                    </div>
                    <div style={{ fontWeight: 500, marginTop: 2 }}>{val}</div>
                  </div>
                </div>
              ))}

            </div>
          </div>
          <div>
            {diff > 0 ? (
              <div className="card mb-2">
                <h3
                  style={{
                    fontFamily: "'Yatra One',cursive",
                    color: "var(--saffron-deep)",
                    marginBottom: "1rem",
                  }}
                >
                  ⏳ Countdown
                </h3>
                <div style={{ display: "flex", gap: "1.5rem" }}>
                  {[
                    [daysLeft, "Days"],
                    [hrsLeft, "Hours"],
                  ].map(([n, l]) => (
                    <div key={l} style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontFamily: "'Yatra One',cursive",
                          fontSize: "2.5rem",
                          color: "var(--saffron-deep)",
                          lineHeight: 1,
                        }}
                      >
                        {n}
                      </div>
                      <div style={{ fontSize: ".78rem", color: "var(--text-muted)", marginTop: 4 }}>
                        {l}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card mb-2" style={{ background: "rgba(107,114,128,.05)" }}>
                <p
                  style={{
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontFamily: "'Crimson Pro',serif",
                    fontStyle: "italic",
                  }}
                >
                  This event has already taken place 🙏
                </p>
              </div>
            )}

            <div className="card" style={{ padding: "1rem 1.2rem" }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    toast.success("Link copied!");
                  }}
                >
                  🔗 Share
                </button>
                {permissions.canEditCore && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => navigate(`/events/${id}/edit`)}
                  >
                    ✏️ Update Event
                  </button>
                )}
                {permissions.canDelete && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <span className="spinner" style={{ width: 14, height: 14 }} /> Deleting...
                      </>
                    ) : (
                      "🗑 Delete"
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
