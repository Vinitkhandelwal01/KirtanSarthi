import { useNavigate } from "react-router-dom";
import useLang from "../hooks/useLang";

export default function About() {
  const navigate = useNavigate();
  const { t } = useLang();

  const stats = [
    { value: "200+", label: t("about_stats_artists"), icon: "🎵" },
    { value: "50+", label: t("about_stats_cities"), icon: "📍" },
    { value: "5000+", label: t("about_stats_events"), icon: "🪔" },
    { value: "4.8★", label: t("about_stats_rating"), icon: "⭐" },
  ];

  const values = [
    { icon: "🙏", title: t("about_value_1_title"), desc: t("about_value_1_desc") },
    { icon: "✅", title: t("about_value_2_title"), desc: t("about_value_2_desc") },
    { icon: "🎵", title: t("about_value_3_title"), desc: t("about_value_3_desc") },
    { icon: "🤝", title: t("about_value_4_title"), desc: t("about_value_4_desc") },
  ];

  const milestones = [
    { year: "2022", event: t("about_milestone_2022") },
    { year: "2023", event: t("about_milestone_2023") },
    { year: "2024", event: t("about_milestone_2024") },
    { year: "2025", event: t("about_milestone_2025") },
    { year: "2026", event: t("about_milestone_2026") },
  ];

  const team = [
    { name: "Vinit Khandelwal", role: t("about_team_1_role"), city: "Jaipur", emoji: "👨‍💼", bio: t("about_team_1_bio") },
    { name: "Priya Khandelwal", role: t("about_team_2_role"), city: "Delhi", emoji: "👩‍💻", bio: t("about_team_2_bio") },
    { name: "Pandit Ramdas", role: t("about_team_3_role"), city: "Varanasi", emoji: "🎶", bio: t("about_team_3_bio") },
    { name: "Nitika Khandelwal", role: t("about_team_4_role"), city: "Mumbai", emoji: "🌸", bio: t("about_team_4_bio") },
  ];

  return (
    <div>
      <div
        style={{
          background:
            "linear-gradient(135deg,#1a0833 0%,var(--maroon) 50%,var(--brown) 100%)",
          padding: "5rem 2rem 4rem",
          color: "white",
          position: "relative",
          overflow: "hidden",
          textAlign: "center",
        }}
      >
        {["8%", "92%", "50%"].map((left, i) => (
          <div
            key={left}
            style={{
              position: "absolute",
              left,
              top: i === 2 ? "10%" : "50%",
              transform: i === 2 ? "none" : "translateY(-50%)",
              fontFamily: "'Tiro Devanagari Hindi',serif",
              fontSize: i === 2 ? "5rem" : "clamp(5rem,12vw,11rem)",
              opacity: i === 2 ? 0.04 : 0.03,
              lineHeight: 1,
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            ॐ
          </div>
        ))}

        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,.1)",
              padding: "5px 16px",
              borderRadius: 999,
              fontSize: ".78rem",
              marginBottom: "1.5rem",
              fontFamily: "'DM Sans',sans-serif",
              letterSpacing: 0.6,
            }}
          >
            🪔 {t("about_badge")}
          </div>

          <h1
            style={{
              fontFamily: "'Yatra One',cursive",
              fontSize: "clamp(2.2rem,6vw,4rem)",
              lineHeight: 1.1,
              marginBottom: "1.2rem",
              textShadow: "0 2px 20px rgba(0,0,0,.3)",
            }}
          >
            {t("about_title_line_1")}
            <br />
            {t("about_title_line_2")}
          </h1>

          <p
            style={{
              fontFamily: "'Crimson Pro',serif",
              fontSize: "1.25rem",
              lineHeight: 1.75,
              opacity: 0.88,
              marginBottom: "2rem",
            }}
          >
            {t("about_hero_desc")}
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate("/artists")}>
              🎵 {t("about_explore_artists")}
            </button>
            <button
              className="btn"
              onClick={() => navigate("/contact")}
              style={{
                background: "rgba(255,255,255,.12)",
                color: "white",
                border: "1.5px solid rgba(255,255,255,.3)",
                padding: "14px 32px",
                fontSize: "1rem",
              }}
            >
              ✉️ {t("contact_us")}
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: "linear-gradient(90deg,var(--saffron) 0%,var(--saffron-deep) 100%)", padding: "2rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
            gap: "1rem",
            maxWidth: 900,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <div style={{ fontSize: "1.5rem", marginBottom: ".2rem" }}>{stat.icon}</div>
              <div style={{ fontFamily: "'Yatra One',cursive", fontSize: "1.8rem", color: "white", lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.8)", fontFamily: "'DM Sans',sans-serif", marginTop: 4 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="main-content" style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: "2rem", alignItems: "center", marginBottom: "4rem" }}>
          <div>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: ".78rem", letterSpacing: 1.5, color: "var(--saffron-deep)", fontWeight: 600, textTransform: "uppercase", marginBottom: ".6rem" }}>
              {t("about_mission_badge")}
            </div>
            <h2 style={{ fontFamily: "'Yatra One',cursive", color: "var(--brown)", fontSize: "clamp(1.6rem,3vw,2.4rem)", lineHeight: 1.25, marginBottom: "1.2rem" }}>
              {t("about_mission_title_line_1")}
              <br />
              {t("about_mission_title_line_2")}
            </h2>
            <p style={{ fontFamily: "'Crimson Pro',serif", fontSize: "1.1rem", lineHeight: 1.8, color: "var(--text-muted)", marginBottom: "1rem" }}>
              {t("about_mission_para_1")}
            </p>
            <p style={{ fontFamily: "'Crimson Pro',serif", fontSize: "1.1rem", lineHeight: 1.8, color: "var(--text-muted)" }}>
              {t("about_mission_para_2")}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            {values.map((value) => (
              <div key={value.title} style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: 16, padding: "1.4rem", boxShadow: "0 2px 12px rgba(92,58,30,.08)" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: ".5rem" }}>{value.icon}</div>
                <div style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", fontSize: ".9rem", marginBottom: ".4rem" }}>
                  {value.title}
                </div>
                <p style={{ fontFamily: "'Crimson Pro',serif", fontSize: ".88rem", lineHeight: 1.6, color: "var(--text-muted)" }}>
                  {value.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", fontSize: "1.5rem", marginBottom: "2rem", textAlign: "center" }}>
            {t("about_journey_title")} 🛤️
          </h2>
          <div style={{ position: "relative", paddingLeft: 24 }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "linear-gradient(180deg,var(--saffron),var(--gold))", borderRadius: 1 }} />
            {milestones.map((milestone, i) => (
              <div key={milestone.year} style={{ display: "flex", gap: "1.2rem", alignItems: "flex-start", marginBottom: i < milestones.length - 1 ? "1.8rem" : 0, position: "relative" }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", flexShrink: 0, marginTop: 3, marginLeft: -7, background: i === milestones.length - 1 ? "linear-gradient(135deg,var(--saffron),var(--gold))" : "var(--cream-dark)", border: `2px solid ${i === milestones.length - 1 ? "var(--saffron)" : "var(--border)"}`, boxShadow: i === milestones.length - 1 ? "0 0 0 3px rgba(232,101,10,.2)" : "none" }} />
                <div>
                  <div style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", fontSize: ".95rem", marginBottom: ".15rem" }}>
                    {milestone.year}
                  </div>
                  <div style={{ fontFamily: "'Crimson Pro',serif", color: "var(--text)", fontSize: "1rem", lineHeight: 1.5 }}>
                    {milestone.event}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "3rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h2 style={{ fontFamily: "'Yatra One',cursive", color: "var(--brown)", fontSize: "1.8rem", marginBottom: ".5rem" }}>
              {t("about_team_title")} 🙏
            </h2>
            <p style={{ fontFamily: "'Crimson Pro',serif", color: "var(--text-muted)", fontSize: "1.05rem", fontStyle: "italic" }}>
              {t("about_team_subtitle")}
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "1.2rem" }}>
            {team.map((person) => (
              <div
                key={person.name}
                style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: 20, padding: "1.8rem 1.4rem", textAlign: "center", boxShadow: "0 2px 14px rgba(92,58,30,.08)", transition: "transform .2s,box-shadow .2s" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-5px)";
                  e.currentTarget.style.boxShadow = "0 10px 30px rgba(92,58,30,.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "0 2px 14px rgba(92,58,30,.08)";
                }}
              >
                <div style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 1rem", background: "linear-gradient(135deg,var(--saffron),var(--gold))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", boxShadow: "0 4px 16px rgba(232,101,10,.3)" }}>
                  {person.emoji}
                </div>
                <div style={{ fontFamily: "'Yatra One',cursive", color: "var(--brown)", fontSize: "1rem", marginBottom: ".2rem" }}>
                  {person.name}
                </div>
                <div style={{ fontSize: ".78rem", color: "var(--saffron-deep)", fontWeight: 600, marginBottom: ".2rem" }}>
                  {person.role}
                </div>
                <div style={{ fontSize: ".74rem", color: "var(--text-muted)", marginBottom: ".7rem" }}>
                  📍 {person.city}
                </div>
                <p style={{ fontFamily: "'Crimson Pro',serif", color: "var(--text-muted)", fontSize: ".88rem", lineHeight: 1.6, fontStyle: "italic" }}>
                  {person.bio}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "linear-gradient(135deg,var(--brown) 0%,var(--maroon) 100%)", borderRadius: 24, padding: "3rem 2rem", textAlign: "center", color: "white", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: "3%", top: "50%", transform: "translateY(-50%)", fontFamily: "'Tiro Devanagari Hindi',serif", fontSize: "8rem", opacity: 0.05, userSelect: "none" }}>
            ॐ
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🎵</div>
            <h2 style={{ fontFamily: "'Yatra One',cursive", fontSize: "1.8rem", marginBottom: "1rem" }}>
              {t("about_cta_title")}
            </h2>
            <p style={{ fontFamily: "'Crimson Pro',serif", fontSize: "1.1rem", opacity: 0.85, marginBottom: "1.8rem", lineHeight: 1.6 }}>
              {t("about_cta_desc")}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
              <button className="btn btn-primary btn-lg" onClick={() => navigate("/artists")}>
                🔍 {t("about_cta_find_artist")}
              </button>
              <button
                className="btn btn-lg"
                onClick={() => navigate("/signup?role=artist")}
                style={{ background: "rgba(255,255,255,.12)", color: "white", border: "1.5px solid rgba(255,255,255,.3)" }}
              >
                ✨ {t("hero_join_artist")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

