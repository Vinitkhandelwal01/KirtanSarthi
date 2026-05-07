import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ArtistCard from "../components/core/ArtistCard";
import { artistAPI } from "../services/api";
import { GODS_LIST, EVENT_TYPES } from "../utils/constants";
import useLang from "../hooks/useLang";

export default function Artists() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [god, setGod] = useState("");
  const [eventType, setEventType] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  const clearAll = () => {
    setQuery("");
    setCity("");
    setGod("");
    setEventType("");
    setMaxPrice("");
    setMinRating("");
  };

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (query) params.name = query;
    if (city) params.city = city;
    if (god) params.god = god;
    if (eventType) params.eventType = eventType;
    if (maxPrice) params.maxPrice = maxPrice;
    if (minRating) params.minRating = minRating;

    artistAPI
      .search(params)
      .then((res) => setArtists(res.artists || []))
      .catch(() => setArtists([]))
      .finally(() => setLoading(false));
  }, [query, city, god, eventType, maxPrice, minRating]);

  const activeFilters = [city, god, eventType, maxPrice, minRating].filter(Boolean).length;
  const emptyStateExtra = minRating ? t("no_artists_help_rating_suffix") : "";

  return (
    <div>
      <div className="search-hero">
        <div className="search-hero-content">
          <h1>{t("find_kirtan_artists")}</h1>
          <p className="subtitle">{t("artists_search_subtitle")}</p>
          <div className="search-box">
            <input
              placeholder={t("search_by_name")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <input
              className="artists-city-input"
              placeholder={t("search_by_city")}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <button className="btn btn-primary">🔍 {t("search")}</button>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="artists-layout">
          <div className="sidebar artists-sidebar">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  fontFamily: "'Yatra One',cursive",
                  color: "var(--saffron-deep)",
                  fontSize: "1.1rem",
                }}
              >
                🔧 {t("filters")}
              </div>
              {activeFilters > 0 && (
                <span className="badge badge-saffron" style={{ fontSize: ".7rem" }}>
                  {t("active_count", { count: activeFilters })}
                </span>
              )}
            </div>

            <div className="form-group mb-2">
              <label className="form-label">{t("city")}</label>
              <input
                className="form-input"
                placeholder={t("city_placeholder")}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="form-group mb-2">
              <label className="form-label">{t("deity")}</label>
              <select
                className="form-input form-select"
                value={god}
                onChange={(e) => setGod(e.target.value)}
              >
                <option value="">{t("all")}</option>
                {GODS_LIST.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group mb-2">
              <label className="form-label">{t("event_type")}</label>
              <select
                className="form-input form-select"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                <option value="">{t("all")}</option>
                {EVENT_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group mb-2">
              <label className="form-label">{t("max_price")}</label>
              <input
                className="form-input"
                type="number"
                placeholder={t("max_price_placeholder")}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>

            <div className="form-group mb-2">
              <label
                className="form-label"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{t("min_rating")}</span>
                {minRating && (
                  <span
                    style={{
                      color: "var(--saffron-deep)",
                      fontWeight: 600,
                      fontSize: ".78rem",
                    }}
                  >
                    {parseFloat(minRating).toFixed(1)}+ ⭐
                  </span>
                )}
              </label>
              <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setMinRating(minRating === String(star) ? "" : String(star))}
                    aria-label={t("minimum_stars_aria", { count: star })}
                    aria-pressed={minRating === String(star)}
                    style={{
                      flex: 1,
                      padding: "5px 0",
                      border: "1.5px solid",
                      borderRadius: 6,
                      fontSize: ".82rem",
                      cursor: "pointer",
                      transition: "all .15s",
                      fontFamily: "inherit",
                      background:
                        parseFloat(minRating) >= star ? "rgba(232,101,10,.12)" : "var(--white)",
                      borderColor:
                        parseFloat(minRating) >= star ? "var(--saffron)" : "var(--border)",
                      color:
                        parseFloat(minRating) >= star
                          ? "var(--saffron-deep)"
                          : "var(--text-muted)",
                      fontWeight: minRating === String(star) ? 700 : 400,
                    }}
                  >
                    {star}★
                  </button>
                ))}
              </div>
              <input
                className="form-input"
                type="number"
                min="0"
                max="5"
                step="0.1"
                placeholder={t("rating_input_placeholder")}
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                style={{ fontSize: ".84rem", padding: "7px 10px" }}
              />
            </div>

            <button className="btn btn-ghost btn-sm w-full mt-2" onClick={clearAll}>
              {activeFilters > 0
                ? t("clear_all_with_count", { count: activeFilters })
                : t("clear_filters")}
            </button>
          </div>

          <div className="artists-results">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div
                style={{
                  fontFamily: "'Crimson Pro',serif",
                  fontSize: "1.1rem",
                  color: "var(--text-muted)",
                }}
              >
                {loading ? (
                  t("searching")
                ) : (
                  <>
                    {t("showing_artists_count", { count: artists.length })}
                    {minRating && (
                      <span
                        style={{
                          fontSize: ".82rem",
                          marginLeft: 8,
                          color: "var(--saffron-deep)",
                        }}
                      >
                        · {t("rating_suffix", { rating: parseFloat(minRating).toFixed(1) })}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            {!loading && artists.length === 0 ? (
              <div className="empty-state">
                <span className="emoji">🔍</span>
                <h3>{t("no_artists_found")}</h3>
                <p style={{ marginTop: ".4rem", fontSize: ".9rem" }}>
                  {t("no_artists_help", { extra: emptyStateExtra })}
                </p>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: "1rem" }}
                  onClick={clearAll}
                >
                  {t("clear_all_filters")}
                </button>
              </div>
            ) : (
              <div className="grid-3">
                {artists.map((a) => (
                  <ArtistCard
                    key={a._id}
                    artist={a}
                    onClick={() => navigate(`/artist/${a._id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
