import { EVENT_TYPES, GODS_LIST } from "../../utils/constants";
import useLang from "../../hooks/useLang";

export default function FiltersBar({
  god,
  eventType,
  sortBy,
  onGodChange,
  onEventTypeChange,
  onSortChange,
}) {
  const { t } = useLang();

  return (
    <div className="card" style={{ marginBottom: "1.5rem", padding: "1rem 1.25rem" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <div className="form-group">
          <label className="form-label">{t("filter_by_god")}</label>
          <select className="form-input form-select" value={god} onChange={(e) => onGodChange(e.target.value)}>
            <option value="">{t("all_deities")}</option>
            {GODS_LIST.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">{t("filter_by_event_type")}</label>
          <select
            className="form-input form-select"
            value={eventType}
            onChange={(e) => onEventTypeChange(e.target.value)}
          >
            <option value="">{t("all_event_types")}</option>
            {EVENT_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">{t("sort_by")}</label>
          <select className="form-input form-select" value={sortBy} onChange={(e) => onSortChange(e.target.value)}>
            <option value="nearest">{t("nearest_first")}</option>
            <option value="date">{t("upcoming_date")}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
