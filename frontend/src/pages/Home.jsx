import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ArtistCard from "../components/core/ArtistCard";
import { artistAPI } from "../services/api";
import useLang from "../hooks/useLang";

export default function Home() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [artists, setArtists] = useState([]);

  useEffect(() => {
    artistAPI
      .search({ limit: 6 })
      .then((res) => setArtists(res.artists || []))
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="landing-hero">
        <div className="landing-content">
          <div className="landing-text">
            <p
              style={{
                fontFamily: "'Tiro Devanagari Hindi',serif",
                fontSize: "1.5rem",
                color: "rgba(255,220,150,.9)",
                marginBottom: ".5rem",
              }}
            >
              ॐ नमः शिवाय
            </p>
            <h1>{t("hero_title")}</h1>
            <p>{t("hero_subtitle")}</p>
            <div className="landing-cta">
              <button
                className="btn btn-primary btn-lg"
                style={{
                  background: "linear-gradient(135deg,#F5C842,#D4960A)",
                  color: "#2C1810",
                  fontWeight: 700,
                }}
                onClick={() => navigate("/artists")}
              >
                {t("hero_find_artists")}
              </button>
              <button
                className="btn btn-outline btn-lg"
                style={{
                  background: "rgba(255,255,255,.15)",
                  color: "white",
                  border: "1.5px solid rgba(255,255,255,.4)",
                }}
                onClick={() => navigate("/signup?role=artist")}
              >
                {t("hero_join_artist")}
              </button>
            </div>
            <div
              style={{
                display: "flex",
                gap: "2rem",
                marginTop: "1.5rem",
                flexWrap: "wrap",
              }}
            >
              {[
                ["200+", t("hero_stat_artists")],
                ["5000+", t("hero_stat_events")],
                ["4.8★", t("hero_stat_rating")],
              ].map(([num, label]) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontFamily: "'Yatra One',cursive",
                      fontSize: "1.8rem",
                      color: "var(--gold-light)",
                    }}
                  >
                    {num}
                  </div>
                  <div style={{ fontSize: ".8rem", color: "rgba(255,255,255,.6)" }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              ["🎵", t("hero_card_1_title"), t("hero_card_1_desc")],
              ["🪔", t("hero_card_2_title"), t("hero_card_2_desc")],
              ["🕉️", t("hero_card_3_title"), t("hero_card_3_desc")],
            ].map(([icon, title, desc]) => (
              <div className="feature-card" key={title}>
                <div style={{ fontSize: "2rem", marginBottom: "6px" }}>{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="main-content">
        <div style={{ textAlign: "center", marginBottom: "2rem", paddingTop: "1rem" }}>
          <div className="section-title">{t("featured_artists")}</div>
          <p className="section-sub">{t("featured_artists_subtitle")}</p>
          <div className="section-divider" style={{ margin: "0 auto 1.5rem" }} />
        </div>
        <div className="grid-3">
          {artists.map((a) => (
            <ArtistCard
              key={a._id}
              artist={a}
              onClick={() => navigate(`/artist/${a._id}`)}
            />
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button
            className="btn btn-outline btn-lg"
            onClick={() => navigate("/artists")}
          >
            {t("view_all_artists")}
          </button>
        </div>

        <div
          style={{
            marginTop: "4rem",
            padding: "3rem 2rem",
            background: "var(--white)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div className="section-title">{t("how_it_works")}</div>
            <p className="section-sub">{t("how_it_works_subtitle")}</p>
            <div className="section-divider" style={{ margin: "0 auto" }} />
          </div>
          <div className="grid-4">
            {[
              ["🔍", t("step_1_title"), t("step_1_desc")],
              ["📅", t("step_2_title"), t("step_2_desc")],
              ["📩", t("step_3_title"), t("step_3_desc")],
              ["🎶", t("step_4_title"), t("step_4_desc")],
            ].map(([icon, title, desc], i) => (
              <div key={title} style={{ textAlign: "center", padding: "1rem" }}>
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,var(--saffron),var(--gold))",
                    margin: "0 auto 1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                  }}
                >
                  {icon}
                </div>
                <h3
                  style={{
                    fontFamily: "'Crimson Pro',serif",
                    fontSize: "1.1rem",
                    marginBottom: "4px",
                    color: "var(--brown)",
                  }}
                >
                  {i + 1}. {title}
                </h3>
                <p
                  style={{
                    fontSize: ".85rem",
                    color: "var(--text-muted)",
                    lineHeight: 1.5,
                  }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
