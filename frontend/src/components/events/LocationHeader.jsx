import useLang from "../../hooks/useLang";

export default function LocationHeader({ loading, onRefresh, refreshing }) {
  const { t } = useLang();

  return (
    <div className="card" style={{ marginBottom: "1.5rem", padding: "1.25rem 1.5rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "'Yatra One',cursive",
              color: "var(--saffron-deep)",
              marginBottom: ".35rem",
              fontSize: "1.45rem",
            }}
          >
            {t("nearby_events_title")}
          </h2>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: ".92rem",
              fontStyle: "italic",
              fontFamily: "'Crimson Pro',serif",
            }}
          >
            {loading ? t("nearby_loading") : t("nearby_public_events")}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <>
              <span className="spinner" style={{ width: 14, height: 14 }} /> {t("finding")}
            </>
          ) : (
            t("find_near_me")
          )}
        </button>
      </div>
    </div>
  );
}
