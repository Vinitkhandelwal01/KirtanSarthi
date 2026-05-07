import { useState, useEffect, useMemo } from "react";
import { availabilityAPI, dashboardAPI, bookingAPI } from "../../services/api";
import { fmtDate } from "../../utils/helpers";
import toast from "react-hot-toast";
import useLang from "../../hooks/useLang";

const ICONS = {
  calendar: "\u{1F4C6}",
  lock: "\u{1F512}",
  remove: "\u2715",
  left: "\u25C0",
  right: "\u25B6",
};

const buildBookingDateTime = (booking, fallbackTimeKey = "startTime") => {
  const rawDate = booking?.availability?.date || booking?.eventDetails?.date || booking?.createdAt;
  const baseDate = new Date(rawDate);
  if (!Number.isFinite(baseDate.getTime())) return null;

  const slot = booking?.availability?.slots?.[booking?.slotIndex];
  const timeValue = slot?.[fallbackTimeKey] || slot?.startTime;
  if (!timeValue || typeof timeValue !== "string") return baseDate;

  const [hoursText, minutesText] = timeValue.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return baseDate;

  const nextDate = new Date(baseDate);
  nextDate.setHours(hours, minutes, 0, 0);
  return nextDate;
};

export default function ArtistAvailability() {
  const { t, lang } = useLang();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([{ startTime: "10:00", endTime: "13:00" }]);
  const [availData, setAvailData] = useState([]);
  const [confirmedBookings, setConfirmedBookings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const dRes = await dashboardAPI.artist().catch(() => ({ data: {} }));
        const d = dRes.data || dRes;
        const artistId = d.artistId;
        if (artistId) {
          try {
            const avRes = await availabilityAPI.getByArtist(artistId);
            setAvailData(avRes.availability || []);
          } catch {
            setAvailData([]);
          }
        }
        try {
          const bRes = await bookingAPI.getArtistBookings();
          const accepted = (bRes.bookings || []).filter((b) => b.status === "ACCEPTED");
          setConfirmedBookings(accepted);
        } catch {
          setConfirmedBookings([]);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const { availableDays, bookedDays } = useMemo(() => {
    const avail = new Set();
    const booked = new Set();
    (Array.isArray(availData) ? availData : []).forEach((a) => {
      const d = new Date(a.date);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        avail.add(day);
        if (a.slots?.length > 0 && a.slots.every((s) => s.isBooked)) booked.add(day);
      }
    });
    return { availableDays: avail, bookedDays: booked };
  }, [availData, month, year]);

  const upcomingConfirmedBookings = useMemo(() => {
    const now = new Date();

    return confirmedBookings
      .filter((booking) => booking.status === "ACCEPTED")
      .filter((booking) => {
        const bookingEnd = buildBookingDateTime(booking, "endTime");
        return bookingEnd && bookingEnd > now;
      })
      .sort((a, b) => {
        const aTime = buildBookingDateTime(a)?.getTime?.() || 0;
        const bTime = buildBookingDateTime(b)?.getTime?.() || 0;
        return aTime - bTime;
      });
  }, [confirmedBookings]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  const monthName = new Date(year, month).toLocaleString(locale, { month: "long" });
  const dayLabels = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2026, 2, 22 + index)));

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDate(null);
  };

  const selectDay = (day) => {
    if (selectedDate === day) {
      setSelectedDate(null);
      return;
    }
    setSelectedDate(day);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const existing = (Array.isArray(availData) ? availData : []).find((a) => new Date(a.date).toISOString().slice(0, 10) === dateStr);
    setSlots(
      existing?.slots?.length
        ? existing.slots.map((s) => ({ startTime: s.startTime || s.start, endTime: s.endTime || s.end, isBooked: !!s.isBooked }))
        : [{ startTime: "10:00", endTime: "13:00", isBooked: false }]
    );
  };

  const hasOverlap = (slotList) => {
    for (let i = 0; i < slotList.length; i += 1) {
      for (let j = i + 1; j < slotList.length; j += 1) {
        const a = slotList[i];
        const b = slotList[j];
        if (a.startTime < b.endTime && b.startTime < a.endTime) return true;
      }
    }
    return false;
  };

  const saveAvailability = async () => {
    if (!selectedDate) return;
    if (hasOverlap(slots)) {
      toast.error(t("artist_availability_overlap_error"));
      return;
    }
    for (const slot of slots) {
      if (!slot.startTime || !slot.endTime || slot.startTime >= slot.endTime) {
        toast.error(t("artist_availability_invalid_slot"));
        return;
      }
    }

    setSaving(true);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDate).padStart(2, "0")}`;
    try {
      await availabilityAPI.create({ date: dateStr, slots });
      setAvailData((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        const idx = arr.findIndex((a) => new Date(a.date).toISOString().slice(0, 10) === dateStr);
        if (idx >= 0) {
          const copy = [...arr];
          copy[idx] = { ...copy[idx], slots };
          return copy;
        }
        return [...arr, { date: dateStr, slots }];
      });
      toast.success(t("artist_availability_saved", { month: monthName, day: selectedDate }));
      setSelectedDate(null);
    } catch {
      toast.error(t("artist_availability_save_failed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center" style={{ padding: "4rem" }}>
        <span className="spinner" /> {t("loading")}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-content">
          <h1>{t("artist_availability_title")} {ICONS.calendar}</h1>
          <p>{t("artist_availability_subtitle")}</p>
        </div>
      </div>
      <div className="main-content">
        <div className="grid-2" style={{ gap: "2rem", alignItems: "start" }}>
          <div>
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <button className="btn btn-ghost btn-sm" onClick={prevMonth}>{ICONS.left}</button>
                <h3 style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", margin: 0 }}>{monthName} {year}</h3>
                <button className="btn btn-ghost btn-sm" onClick={nextMonth}>{ICONS.right}</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 8 }}>
                {dayLabels.map((d) => (
                  <div key={d} style={{ textAlign: "center", fontSize: ".75rem", fontWeight: 600, color: "var(--text-muted)", padding: "4px 0" }}>{d}</div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
                {Array(daysInMonth).fill(null).map((_, i) => {
                  const day = i + 1;
                  const isBooked = bookedDays.has(day);
                  const isAvail = availableDays.has(day);
                  const isSel = selectedDate === day;
                  const isPast = year === today.getFullYear() && month === today.getMonth() && day < today.getDate();
                  return (
                    <button type="button" key={day} className={`cal-day${isPast ? " past" : isBooked ? " booked" : isAvail ? " available" : ""}${isSel ? " selected" : ""}`} onClick={() => !isPast && selectDay(day)} disabled={isPast} style={{ fontSize: ".82rem" }}>
                      {day}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: "1rem", fontSize: ".78rem", flexWrap: "wrap" }}>
                {[["rgba(34,197,94,.15)", t("artist_availability_available")], ["rgba(239,68,68,.15)", t("artist_availability_booked")], ["var(--saffron)", t("artist_availability_selected")]].map(([bg, label]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: bg }} />
                    <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            {selectedDate ? (
              <div className="card">
                <h3 style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", marginBottom: "1rem" }}>{monthName} {selectedDate} - {t("artist_availability_time_slots")}</h3>
                {slots.map((slot, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, padding: 10, background: slot.isBooked ? "rgba(239,68,68,.08)" : "var(--cream)", borderRadius: 8, border: slot.isBooked ? "1px solid rgba(239,68,68,.2)" : "1px solid transparent", opacity: slot.isBooked ? 0.85 : 1 }}>
                    {slot.isBooked && <span title={t("artist_availability_slot_booked_title")} style={{ fontSize: "1rem" }}>{ICONS.lock}</span>}
                    <input className="form-input" type="time" value={slot.startTime} onChange={(e) => setSlots((prev) => prev.map((s, j) => (j === i ? { ...s, startTime: e.target.value } : s)))} style={{ flex: 1 }} disabled={slot.isBooked} />
                    <span style={{ color: "var(--text-muted)" }}>{t("artist_availability_to")}</span>
                    <input className="form-input" type="time" value={slot.endTime} onChange={(e) => setSlots((prev) => prev.map((s, j) => (j === i ? { ...s, endTime: e.target.value } : s)))} style={{ flex: 1 }} disabled={slot.isBooked} />
                    {!slot.isBooked ? (
                      <button className="btn btn-ghost btn-sm" onClick={() => setSlots((prev) => prev.filter((_, j) => j !== i))} style={{ color: "#e53e3e", padding: "6px 8px" }}>{ICONS.remove}</button>
                    ) : (
                      <span style={{ fontSize: ".72rem", color: "#b91c1c", fontWeight: 600, whiteSpace: "nowrap" }}>{t("artist_availability_booked_label")}</span>
                    )}
                  </div>
                ))}
                <button className="btn btn-outline btn-sm mb-3" onClick={() => setSlots((prev) => [...prev, { startTime: "10:00", endTime: "13:00", isBooked: false }])}>{t("artist_availability_add_slot")}</button>
                <button className="btn btn-primary w-full" onClick={saveAvailability} disabled={saving}>
                  {saving ? <><span className="spinner" /> {t("artist_availability_saving")}</> : t("artist_availability_save")}
                </button>
              </div>
            ) : (
              <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{ICONS.calendar}</div>
                <h3 style={{ fontFamily: "'Crimson Pro',serif", fontSize: "1.2rem", marginBottom: ".5rem" }}>{t("artist_availability_select_date")}</h3>
                <p style={{ color: "var(--text-muted)", fontSize: ".88rem" }}>{t("artist_availability_select_date_help")}</p>
              </div>
            )}

            <div className="card mt-3">
              <h3 style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", marginBottom: "1rem" }}>{t("artist_availability_upcoming_confirmed")}</h3>
              {upcomingConfirmedBookings.length > 0 ? (
                upcomingConfirmedBookings.slice(0, 5).map((b) => {
                  const bookingDate = b.availability?.date || b.createdAt;
                  const slot = b.availability?.slots?.[b.slotIndex];
                  const timeStr = slot ? `${slot.startTime} - ${slot.endTime}` : "";
                  return (
                    <div key={b._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                      <div>
                        <div style={{ fontSize: ".88rem", fontWeight: 500 }}>{fmtDate(bookingDate)}{timeStr ? ` · ${timeStr}` : ""}</div>
                        <div style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>{b.user?.firstName} {b.user?.lastName?.[0]}.</div>
                      </div>
                      <span className="badge badge-green">{t("artist_availability_confirmed")}</span>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: "var(--text-muted)", fontSize: ".88rem", textAlign: "center", padding: "1rem" }}>{t("artist_availability_no_upcoming")}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
