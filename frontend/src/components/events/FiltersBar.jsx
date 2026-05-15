import { useState } from "react";
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
  const OTHER_OPTION = "__other__";
  const { t } = useLang();
  const [godOther, setGodOther] = useState("");
  const [eventTypeOther, setEventTypeOther] = useState("");
  const godSelectValue = god ? (GODS_LIST.includes(god) ? god : OTHER_OPTION) : "";
  const eventTypeSelectValue = eventType ? (EVENT_TYPES.includes(eventType) ? eventType : OTHER_OPTION) : "";

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
          <select
            className="form-input form-select"
            value={godSelectValue}
            onChange={(e) => {
              const value = e.target.value;
              if (value === OTHER_OPTION) {
                onGodChange(godOther);
                return;
              }
              onGodChange(value);
              setGodOther("");
            }}
          >
            <option value="">{t("all_deities")}</option>
            {GODS_LIST.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
            <option value={OTHER_OPTION}>Other</option>
          </select>
          {godSelectValue === OTHER_OPTION && (
            <input
              className="form-input mt-2"
              placeholder="Type deity name"
              value={godOther}
              onChange={(e) => {
                setGodOther(e.target.value);
                onGodChange(e.target.value);
              }}
            />
          )}
        </div>

        <div className="form-group">
          <label className="form-label">{t("filter_by_event_type")}</label>
          <select
            className="form-input form-select"
            value={eventTypeSelectValue}
            onChange={(e) => {
              const value = e.target.value;
              if (value === OTHER_OPTION) {
                onEventTypeChange(eventTypeOther);
                return;
              }
              onEventTypeChange(value);
              setEventTypeOther("");
            }}
          >
            <option value="">{t("all_event_types")}</option>
            {EVENT_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
            <option value={OTHER_OPTION}>Other</option>
          </select>
          {eventTypeSelectValue === OTHER_OPTION && (
            <input
              className="form-input mt-2"
              placeholder="Type event type"
              value={eventTypeOther}
              onChange={(e) => {
                setEventTypeOther(e.target.value);
                onEventTypeChange(e.target.value);
              }}
            />
          )}
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
