import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useLang from "../hooks/useLang";
import { eventAPI } from "../services/api";
import { EVENT_TYPES, GODS_LIST, VISIBILITY_OPTS } from "../utils/constants";
import toast from "react-hot-toast";

export default function CreateEvent() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLang();

  const [permissions, setPermissions] = useState({
    canEditCore: false,
  });
  const [loadingEvent, setLoadingEvent] = useState(isEditMode);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    eventType: "Kirtan",
    god: "Krishna",
    city: "",
    address: "",
    dateTime: "",
    visibility: "PUBLIC",
  });

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (!isEditMode) return;

    setLoadingEvent(true);
    eventAPI
      .getForManage(id)
      .then((res) => {
        const ev = res.event || {};
        setPermissions(res.permissions || {});
        setForm((prev) => ({
          ...prev,
          title: ev.title || "",
          eventType: ev.eventType || "Kirtan",
          god: ev.god || "Krishna",
          city: ev.city || "",
          address: ev.address || "",
          dateTime: ev.dateTime ? new Date(ev.dateTime).toISOString().slice(0, 16) : "",
          visibility: ev.visibility || "PUBLIC",
        }));
      })
      .catch((err) => {
        toast.error(err.message || "Failed to load event");
        navigate(`/events/${id}`);
      })
      .finally(() => setLoadingEvent(false));
  }, [id, isEditMode, navigate]);

  useEffect(() => {
    if (isEditMode) return;

    const canCreate = ["ADMIN", "ARTIST"].includes(user?.accountType);
    if (!user) {
      toast.error("Please login first");
      navigate("/login");
      return;
    }
    if (!canCreate) {
      toast.error("Users can create public events through bookings only");
      navigate("/events");
    }
  }, [isEditMode, navigate, user]);

  const submit = async () => {
    const payload = {};

    if (!isEditMode || permissions.canEditCore) {
      if (!form.title || !form.city || !form.address || !form.dateTime) {
        toast.error("Please fill all required core event fields");
        return;
      }
      payload.title = form.title;
      payload.eventType = form.eventType;
      payload.god = form.god;
      payload.city = form.city;
      payload.address = form.address;
      payload.dateTime = form.dateTime;
      payload.visibility = form.visibility;
    }

    if (!Object.keys(payload).length) {
      toast.error("You do not have anything editable on this event");
      return;
    }

    setLoading(true);
    try {
      if (isEditMode) {
        await eventAPI.update(id, payload);
        toast.success("Event updated successfully");
        navigate(`/events/${id}`);
      } else {
        await eventAPI.create(payload);
        toast.success("Event created! 🪔");
        navigate("/events");
      }
    } catch (err) {
      toast.error(err.message || `Failed to ${isEditMode ? "update" : "create"} event`);
    } finally {
      setLoading(false);
    }
  };

  if (loadingEvent) {
    return (
      <div className="main-content text-center" style={{ padding: "4rem" }}>
        <span className="spinner" /> Loading...
      </div>
    );
  }

  const showCoreFields = !isEditMode || permissions.canEditCore;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-content">
          <h1>{isEditMode ? "🛠 Update Event" : `✨ ${t("create_event")}`}</h1>
          <p>
            {isEditMode
              ? "Only the host or admin can update this event."
              : "Organize a spiritual gathering for your community"}
          </p>
        </div>
      </div>
      <div className="main-content">
        <div className="card" style={{ maxWidth: 700, margin: "0 auto" }}>
          {showCoreFields && (
            <>
              <div className="form-group mb-2">
                <label className="form-label">{t("event_title")} *</label>
                <input
                  className="form-input"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="e.g. Krishna Janmashtami Kirtan"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                <div className="form-group mb-2">
                  <label className="form-label">{t("event_type")}</label>
                  <select
                    className="form-input form-select"
                    value={form.eventType}
                    onChange={(e) => set("eventType", e.target.value)}
                  >
                    {EVENT_TYPES.map((et) => (
                      <option key={et}>{et}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-2">
                  <label className="form-label">{t("deity")}</label>
                  <select
                    className="form-input form-select"
                    value={form.god}
                    onChange={(e) => set("god", e.target.value)}
                  >
                    {GODS_LIST.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
              {!isEditMode && (
                <>
                  <div className="form-group mb-2">
                    <label className="form-label">{t("city")} *</label>
                    <input
                      className="form-input"
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                      placeholder="e.g. Jaipur"
                    />
                  </div>
                  <div className="form-group mb-2">
                    <label className="form-label">{t("address")} *</label>
                    <input
                      className="form-input"
                      value={form.address}
                      onChange={(e) => set("address", e.target.value)}
                      placeholder="Full address"
                    />
                  </div>
                  <div className="form-group mb-2">
                    <label className="form-label">{t("dateTime")} *</label>
                    <input
                      className="form-input"
                      type="datetime-local"
                      value={form.dateTime}
                      onChange={(e) => set("dateTime", e.target.value)}
                    />
                  </div>
                </>
              )}
              {!isEditMode && (
                <div className="form-group mb-3">
                  <label className="form-label">{t("visibility")}</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {VISIBILITY_OPTS.map((opt) => (
                      <button
                        key={opt.value}
                        className={`pill ${form.visibility === opt.value ? "active" : ""}`}
                        onClick={() => set("visibility", opt.value)}
                        type="button"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <button
            className="btn btn-primary btn-lg w-full"
            onClick={submit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" /> {isEditMode ? "Saving..." : "Creating..."}
              </>
            ) : (
              isEditMode ? "Save Changes" : "✨ Create Event"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

