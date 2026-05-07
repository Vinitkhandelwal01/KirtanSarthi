import { statusBadge, fmtDate, artistDisplayName } from "../../utils/helpers";
import useLang from "../../hooks/useLang";

const ICONS = {
  bookings: "\u{1F4C5}",
  location: "\u{1F4CD}",
};

const RUPEE = "\u20B9";

export default function BookingDetailModal({ booking: b, role, onClose }) {
  const { t } = useLang();

  if (!b) return null;

  const artistName = artistDisplayName(b.artist);
  const userName = b.user?.firstName ? `${b.user.firstName} ${b.user.lastName}` : t("booking_detail_unknown_user");
  const eventDate = b.availability?.date || b.eventDetails?.date;
  const slot = b.availability?.slots?.[b.slotIndex];

  const rows = [
    { label: t("booking_detail_status"), value: statusBadge(b.status) },
    { label: t("booking_detail_event_date"), value: eventDate ? `${ICONS.bookings} ${fmtDate(eventDate)}` : "-" },
    slot && { label: t("booking_detail_time_slot"), value: `${slot.startTime || ""} - ${slot.endTime || ""}` },
    { label: t("booking_detail_booking_created"), value: fmtDate(b.createdAt) },
    { label: t("booking_detail_event_visibility"), value: b.eventVisibility || "-" },
    role !== "USER" && { label: t("booking_detail_user"), value: `${userName}${b.user?.city ? ` | ${ICONS.location} ${b.user.city}` : ""}` },
    role !== "USER" && b.user?.email && { label: t("email"), value: b.user.email },
    role !== "USER" && b.user?.phone && { label: t("phone"), value: b.user.phone },
    role !== "ARTIST" && { label: t("booking_detail_artist"), value: artistName },
    { label: t("booking_detail_artist_price"), value: `${RUPEE}${(b.artistPrice || 0).toLocaleString()}` },
    { label: t("booking_detail_user_budget"), value: `${RUPEE}${(b.userBudget || 0).toLocaleString()}` },
    b.counterPrice && { label: t("booking_detail_counter_by", { by: b.counterBy || "-" }), value: `${RUPEE}${b.counterPrice.toLocaleString()}` },
    b.counterCount > 0 && { label: t("booking_detail_counter_exchanges"), value: `${b.counterCount} / 3` },
    b.finalPrice && { label: t("booking_detail_final_price"), value: `${RUPEE}${b.finalPrice.toLocaleString()}` },
    b.notes && { label: t("booking_detail_note"), value: b.notes },
  ].filter(Boolean);

  const ed = b.eventDetails;
  const eventRows = ed
    ? [
        ed.title && { label: t("event_title"), value: ed.title },
        ed.eventType && { label: t("booking_detail_type"), value: ed.eventType },
        ed.god && { label: t("booking_detail_god"), value: ed.god },
        ed.city && { label: t("city"), value: ed.city },
        ed.address && { label: t("address"), value: ed.address },
      ].filter(Boolean)
    : [];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, maxHeight: "85vh", overflow: "auto" }}>
        <button className="modal-close" onClick={onClose}>x</button>

        <h2 style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: 8 }}>
          {t("booking_details")}
        </h2>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "10px 12px 10px 0", fontSize: ".82rem", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap", verticalAlign: "top", width: "40%" }}>
                  {r.label}
                </td>
                <td style={{ padding: "10px 0", fontSize: ".88rem", fontWeight: 500 }}>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {eventRows.length > 0 && (
          <>
            <h3 style={{ fontFamily: "'Crimson Pro',serif", fontSize: "1rem", marginTop: "1.2rem", marginBottom: ".6rem", color: "var(--saffron-deep)" }}>
              {t("event_details_section")}
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {eventRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 12px 8px 0", fontSize: ".82rem", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap", verticalAlign: "top", width: "40%" }}>
                      {r.label}
                    </td>
                    <td style={{ padding: "8px 0", fontSize: ".85rem" }}>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div style={{ marginTop: "1.5rem", textAlign: "right" }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>{t("close")}</button>
        </div>
      </div>
    </div>
  );
}
