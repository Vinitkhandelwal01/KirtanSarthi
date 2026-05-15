import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import useLang from "../../hooks/useLang";
import toast from "react-hot-toast";
import { bookingAPI, availabilityAPI } from "../../services/api";
import { artistDisplayName } from "../../utils/helpers";
import {
  EVENT_TYPES,
  GODS_LIST,
  VISIBILITY_OPTS,
} from "../../utils/constants";

export default function BookingModal({ artist, onClose, onSuccess }) {
  const OTHER_OPTION = "__other__";
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { t } = useLang();
  const name = artistDisplayName(artist);
  const today = new Date();

  const [slots, setSlots] = useState([]);
  const [availabilityId, setAvailabilityId] = useState(null);
  const [availData, setAvailData] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [form, setF] = useState({
    budget: String(artist.price),
    date: "",
    slotIndex: "",
    eventVisibility: "",
    evTitle: "",
    evType: "Kirtan",
    evGod: "Krishna",
    evCity: "",
    evAddress: "",
    evDate: "",
    evLat: "",
    evLng: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const evTypeSelectValue = EVENT_TYPES.includes(form.evType) ? form.evType : OTHER_OPTION;
  const evGodSelectValue = GODS_LIST.includes(form.evGod) ? form.evGod : OTHER_OPTION;

  const set = (k, v) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  const needsEvent = true;

  useEffect(() => {
    availabilityAPI
      .getByArtist(artist._id)
      .then((res) => {
        setAvailData(res.availability || []);
      })
      .catch(() => {
        setAvailData([]);
      });
  }, [artist._id]);

  useEffect(() => {
    if (!form.date) { setSlots([]); setAvailabilityId(null); return; }
    availabilityAPI
      .getFreeSlots(artist._id, form.date)
      .then((res) => {
        setSlots(res.slots || []);
        setAvailabilityId(res.availabilityId || null);
      })
      .catch(() => { setSlots([]); setAvailabilityId(null); });
  }, [artist._id, form.date]);

  const { availableDays, bookedDays } = useMemo(() => {
    const avail = new Set();
    const booked = new Set();

    (Array.isArray(availData) ? availData : []).forEach((entry) => {
      const date = new Date(entry.date);
      if (date.getMonth() === calendarMonth && date.getFullYear() === calendarYear) {
        const day = date.getDate();
        avail.add(day);
        if (entry.slots?.length > 0 && entry.slots.every((slot) => slot.isBooked)) {
          booked.add(day);
        }
      }
    });

    return { availableDays: avail, bookedDays: booked };
  }, [availData, calendarMonth, calendarYear]);

  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const monthName = new Date(calendarYear, calendarMonth).toLocaleString("default", { month: "long" });

  const selectedDateObj = form.date ? new Date(`${form.date}T00:00:00`) : null;
  const selectedDay =
    selectedDateObj &&
    selectedDateObj.getMonth() === calendarMonth &&
    selectedDateObj.getFullYear() === calendarYear
      ? selectedDateObj.getDate()
      : null;

  const changeMonth = (direction) => {
    if (direction === -1) {
      if (calendarMonth === 0) {
        setCalendarMonth(11);
        setCalendarYear((prev) => prev - 1);
      } else {
        setCalendarMonth((prev) => prev - 1);
      }
      return;
    }

    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((prev) => prev + 1);
    } else {
      setCalendarMonth((prev) => prev + 1);
    }
  };

  const selectCalendarDate = (day) => {
    const date = new Date(calendarYear, calendarMonth, day);
    if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return;
    set("date", `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    set("slotIndex", "");
  };

  if (!user || user.accountType !== "USER") {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: ".8rem" }}>🔒</div>
            <p style={{ marginBottom: "1rem", color: "var(--text-muted)" }}>
              Please login as a User to book artists.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                onClose();
                navigate("/login");
              }}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const validate = () => {
    const e = {};
    if (
      !form.budget ||
      isNaN(Number(form.budget)) ||
      Number(form.budget) <= 0
    )
      e.budget = t("budget_required");
    if (!form.date) e.date = t("date_required");
    if (form.slotIndex === "") e.slotIndex = t("slot_required");
    if (!availabilityId) e.date = "No availability for this date";
    if (needsEvent) {
      if (!form.evTitle.trim()) e.evTitle = t("event_title_required");
      if (!form.evCity.trim()) e.evCity = t("event_city_required");
      if (!form.evAddress.trim()) e.evAddress = t("event_address_required");
    }
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setLoading(true);

    try {
      const resolveUserCoords = async () => {
        const currentCoords = Array.isArray(user?.location?.coordinates) && user.location.coordinates.length === 2
          ? user.location.coordinates.map(Number)
          : null;
        const hasCurrentCoords =
          currentCoords &&
          Number.isFinite(currentCoords[0]) &&
          Number.isFinite(currentCoords[1]);

        if (hasCurrentCoords) return currentCoords;

        try {
          const refreshedUser = await refreshUser();
          const refreshedCoords = Array.isArray(refreshedUser?.location?.coordinates) && refreshedUser.location.coordinates.length === 2
            ? refreshedUser.location.coordinates.map(Number)
            : null;
          const hasRefreshedCoords =
            refreshedCoords &&
            Number.isFinite(refreshedCoords[0]) &&
            Number.isFinite(refreshedCoords[1]);

          if (hasRefreshedCoords) return refreshedCoords;
        } catch {
          // Ignore profile refresh failures and continue with address-based geocoding.
        }

        return null;
      };

      const selectedSlot = slots[form.slotIndex];
      const bookingData = {
        artistId: artist._id,
        availabilityId,
        slotIndex: selectedSlot?.slotIndex ?? Number(form.slotIndex),
        userBudget: Number(form.budget),
        eventVisibility: form.eventVisibility || "PRIVATE",
      };

      if (needsEvent) {
        const userCoords = await resolveUserCoords();
        const hasValidUserCoords =
          userCoords &&
          Number.isFinite(userCoords[0]) &&
          Number.isFinite(userCoords[1]);

        bookingData.eventDetails = {
          title: form.evTitle,
          eventType: form.evType,
          god: form.evGod,
          city: form.evCity,
          address: form.evAddress,
          date: form.evDate || form.date,
          ...(hasValidUserCoords
            ? {
                location: {
                  type: "Point",
                  coordinates: userCoords,
                },
              }
            : {}),
        };
      }

      await bookingAPI.create(bookingData);

      toast.success(t("booking_success"));
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2
          style={{
            fontFamily: "'Yatra One',cursive",
            color: "var(--saffron-deep)",
            marginBottom: ".5rem",
          }}
        >
          {t("booking_title")}
        </h2>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: ".9rem",
            marginBottom: "1.5rem",
            fontFamily: "'Crimson Pro',serif",
            fontStyle: "italic",
          }}
        >
          {name} · ₹{artist.price?.toLocaleString()}
        </p>

        <div className="form-section">
          <div className="form-section-title">📋 Booking Details</div>
          <div className="form-group mb-2">
            <label className="form-label">{t("your_budget")}</label>
            <input
              className="form-input"
              type="number"
              value={form.budget}
              onChange={(e) => set("budget", e.target.value)}
            />
            {errors.budget && (
              <div className="form-error">{errors.budget}</div>
            )}
          </div>
          <div className="form-group mb-2">
            <label className="form-label">{t("select_date")}</label>
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "1rem",
                background: "linear-gradient(180deg, rgba(255,255,255,.92), rgba(255,248,235,.95))",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => changeMonth(-1)}>◀</button>
                <strong style={{ color: "var(--saffron-deep)", fontFamily: "'Yatra One',cursive" }}>
                  {monthName} {calendarYear}
                </strong>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => changeMonth(1)}>▶</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 8 }}>
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <div
                    key={day}
                    style={{ textAlign: "center", fontSize: ".75rem", fontWeight: 600, color: "var(--text-muted)", padding: "4px 0" }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                {Array(daysInMonth).fill(null).map((_, i) => {
                  const day = i + 1;
                  const isBooked = bookedDays.has(day);
                  const isAvail = availableDays.has(day);
                  const isSelected = selectedDay === day;
                  const isPast =
                    calendarYear === today.getFullYear() &&
                    calendarMonth === today.getMonth() &&
                    day < today.getDate();

                  return (
                    <button
                      key={day}
                      type="button"
                      className={`cal-day${isPast ? " past" : isBooked ? " booked" : isAvail ? " available" : ""}${isSelected ? " selected" : ""}`}
                      onClick={() => selectCalendarDate(day)}
                      disabled={isPast}
                      style={{ fontSize: ".82rem" }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: "1rem", fontSize: ".78rem", flexWrap: "wrap" }}>
                {[
                  ["rgba(34,197,94,.15)", "Available"],
                  ["rgba(239,68,68,.15)", "Booked"],
                  ["var(--saffron)", "Selected"],
                ].map(([bg, label]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: bg }} />
                    <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  </div>
                ))}
              </div>

              <input
                className="form-input"
                type="date"
                value={form.date}
                min={`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`}
                onChange={(e) => {
                  const value = e.target.value;
                  set("date", value);
                  set("slotIndex", "");
                  if (!value) return;
                  const nextDate = new Date(`${value}T00:00:00`);
                  setCalendarMonth(nextDate.getMonth());
                  setCalendarYear(nextDate.getFullYear());
                }}
                style={{ marginTop: "1rem" }}
              />
            </div>
            {errors.date && <div className="form-error">{errors.date}</div>}
          </div>
          <div className="form-group mb-2">
            <label className="form-label">{t("select_slot")}</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {slots.length > 0 ? (
                slots.map((s, i) => (
                  <button
                    key={i}
                    className={`pill ${form.slotIndex === String(i) ? "active" : ""}`}
                    onClick={() => set("slotIndex", String(i))}
                    type="button"
                  >
                    {typeof s === "string" ? s : `${s.startTime || s.start} – ${s.endTime || s.end}`}
                  </button>
                ))
              ) : (
                <p
                  style={{
                    fontSize: ".85rem",
                    color: "var(--text-muted)",
                  }}
                >
                  {form.date ? "No free slots available for this date." : "Select a date from the calendar to see free slots."}
                </p>
              )}
            </div>
            {errors.slotIndex && (
              <div className="form-error">{errors.slotIndex}</div>
            )}
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">🪔 {t("event_visibility")}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {VISIBILITY_OPTS.map((opt) => (
              <button
                key={opt.value}
                className={`pill ${form.eventVisibility === opt.value ? "active" : ""}`}
                onClick={() => set("eventVisibility", opt.value)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {needsEvent && (
          <div className="form-section">
            <div className="form-section-title">📝 Event Details</div>
            <div className="form-group mb-2">
              <label className="form-label">{t("event_title")}</label>
              <input
                className="form-input"
                value={form.evTitle}
                onChange={(e) => set("evTitle", e.target.value)}
                placeholder="e.g. Krishna Janmashtami Kirtan"
              />
              {errors.evTitle && (
                <div className="form-error">{errors.evTitle}</div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">{t("event_type")}</label>
                <select
                  className="form-input form-select"
                  value={evTypeSelectValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === OTHER_OPTION) {
                      set("evType", "");
                      return;
                    }
                    set("evType", value);
                  }}
                >
                  {EVENT_TYPES.map((et) => (
                    <option key={et}>{et}</option>
                  ))}
                  <option value={OTHER_OPTION}>Other</option>
                </select>
                {evTypeSelectValue === OTHER_OPTION && (
                  <input
                    className="form-input mt-2"
                    value={form.evType}
                    onChange={(e) => set("evType", e.target.value)}
                    placeholder="Type event type"
                  />
                )}
              </div>
              <div className="form-group">
                <label className="form-label">{t("deity")}</label>
                <select
                  className="form-input form-select"
                  value={evGodSelectValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === OTHER_OPTION) {
                      set("evGod", "");
                      return;
                    }
                    set("evGod", value);
                  }}
                >
                  {GODS_LIST.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                  <option value={OTHER_OPTION}>Other</option>
                </select>
                {evGodSelectValue === OTHER_OPTION && (
                  <input
                    className="form-input mt-2"
                    value={form.evGod}
                    onChange={(e) => set("evGod", e.target.value)}
                    placeholder="Type deity name"
                  />
                )}
              </div>
            </div>
            <div className="form-group mb-2 mt-2">
              <label className="form-label">{t("city")}</label>
              <input
                className="form-input"
                value={form.evCity}
                onChange={(e) => set("evCity", e.target.value)}
                placeholder="e.g. Jaipur"
              />
              {errors.evCity && (
                <div className="form-error">{errors.evCity}</div>
              )}
            </div>
            <div className="form-group mb-2">
              <label className="form-label">{t("address")}</label>
              <input
                className="form-input"
                value={form.evAddress}
                onChange={(e) => set("evAddress", e.target.value)}
                placeholder="Full address"
              />
              {errors.evAddress && (
                <div className="form-error">{errors.evAddress}</div>
              )}
            </div>
          </div>
        )}

        <button
          className="btn btn-primary btn-lg w-full mt-2"
          onClick={submit}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner" /> Sending…
            </>
          ) : (
            t("confirm_booking")
          )}
        </button>
      </div>
    </div>
  );
}

