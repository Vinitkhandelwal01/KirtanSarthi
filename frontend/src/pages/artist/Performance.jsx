import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { dashboardAPI } from "../../services/api";
import { Stars, fmtDate } from "../../utils/helpers";
import useLang from "../../hooks/useLang";

export default function ArtistPerformance() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI
      .artistPerformance()
      .then((res) => setData(res.data || res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const buildMonthly = () => {
    const rawRev = Array.isArray(data?.monthlyRevenue) ? data.monthlyRevenue : [];
    const rawBook = Array.isArray(data?.monthlyBookings) ? data.monthlyBookings : [];
    const rawRat = Array.isArray(data?.monthlyRatings) ? data.monthlyRatings : [];

    const map = new Map();
    for (const r of rawRev) {
      const key = `${r._id?.year}-${String(r._id?.month).padStart(2, "0")}`;
      const entry = map.get(key) || { revenue: 0, bookings: 0, rating: 0 };
      entry.revenue += r.revenue || 0;
      entry.bookings += r.bookings || 0;
      map.set(key, entry);
    }
    for (const b of rawBook) {
      const key = `${b._id?.year}-${String(b._id?.month).padStart(2, "0")}`;
      const entry = map.get(key) || { revenue: 0, bookings: 0, rating: 0 };
      entry.bookings += b.count || 0;
      map.set(key, entry);
    }
    for (const r of rawRat) {
      const key = `${r._id?.year}-${String(r._id?.month).padStart(2, "0")}`;
      const entry = map.get(key) || { revenue: 0, bookings: 0, rating: 0 };
      entry.rating = Number((r.avgRating || 0).toFixed(1));
      map.set(key, entry);
    }

    if (map.size === 0) {
      const now = new Date();
      const m = [];
      const rv = [];
      const bk = [];
      const rt = [];
      for (let i = 5; i >= 0; i -= 1) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        m.push(monthNames[d.getMonth()]);
        rv.push(0);
        bk.push(0);
        rt.push(0);
      }
      return { months: m, revenue: rv, bookings: bk, ratings: rt };
    }

    const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const m = [];
    const rv = [];
    const bk = [];
    const rt = [];
    for (const [key, val] of sorted) {
      const mon = parseInt(key.split("-")[1], 10);
      m.push(monthNames[(mon - 1) % 12] || "-");
      rv.push(val.revenue);
      bk.push(val.bookings);
      rt.push(val.rating);
    }
    return { months: m, revenue: rv, bookings: bk, ratings: rt };
  };

  const monthly = data ? buildMonthly() : null;
  const months = monthly?.months || ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const bookings = monthly?.bookings || [0, 0, 0, 0, 0, 0];
  const revenue = monthly?.revenue || [0, 0, 0, 0, 0, 0];
  const ratings = monthly?.ratings || [0, 0, 0, 0, 0, 0];
  const normalizedRatings = ratings.map((r) => Number(r) || 0);
  const maxRating = normalizedRatings.length ? Math.max(...normalizedRatings) : 0;

  const dateRange = (() => {
    const rawRev = Array.isArray(data?.monthlyRevenue) ? data.monthlyRevenue : [];
    const rawBook = Array.isArray(data?.monthlyBookings) ? data.monthlyBookings : [];
    const all = [...rawRev, ...rawBook];
    if (!all.length || !months.length) return t("artist_performance_last_months", { count: months.length });
    const first = all[0]?._id;
    const last = all[all.length - 1]?._id;
    if (!first || !last) return t("artist_performance_last_months", { count: months.length });
    const mNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${mNames[first.month]} ${first.year} - ${mNames[last.month]} ${last.year}`;
  })();

  const kpis = [
    ["\u{1F4C5}", data?.bookingStats?.total ?? 0, t("artist_performance_total_bookings"), t("artist_performance_all_time")],
    ["\u2705", data?.bookingStats?.completed ?? 0, t("artist_performance_completed"), t("artist_performance_completion_suffix", { count: data?.bookingStats?.completionRate ?? 0 })],
    ["\u{1F4B0}", `Rs.${(data?.revenue?.total ?? 0).toLocaleString("en-IN")}`, t("artist_performance_total_revenue"), t("artist_performance_all_time")],
    ["\u2B50", data?.ratings?.average?.toFixed(1) ?? "0.0", t("artist_performance_avg_rating"), t("artist_performance_reviews_suffix", { count: data?.ratings?.total ?? 0 })],
  ];

  const metrics = [
    [t("artist_performance_completion_rate"), data?.bookingStats?.completionRate ?? 0, "var(--success)"],
    [t("artist_performance_response_rate"), data?.responseRate ?? 0, "var(--info)"],
    [t("artist_performance_repeat_clients"), data?.repeatClientRate ?? 0, "var(--gold)"],
    [t("artist_performance_profile_views"), data?.profileViewRate ?? 0, "var(--saffron)"],
  ];

  const reviews = data?.recentReviews || [];

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
          <h1>{t("artist_performance_title")} {"\u{1F4CA}"}</h1>
          <p>{t("artist_performance_subtitle")}</p>
        </div>
      </div>
      <div className="main-content">
        <div className="grid-4 mb-3">
          {kpis.map(([icon, val, label, sub]) => (
            <div key={label} className="stat-card" data-icon={icon}>
              <div className="stat-label">{label}</div>
              <div className="stat-value">{val}</div>
              <div className="stat-sub">{sub}</div>
            </div>
          ))}
        </div>

        <div className="grid-2 mb-3">
          <div className="card">
            <h3 style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", marginBottom: ".25rem" }}>{t("artist_performance_monthly_bookings")}</h3>
            <p style={{ fontFamily: "'Crimson Pro',serif", color: "var(--text-muted)", fontSize: ".88rem", fontStyle: "italic", marginBottom: "1rem" }}>{dateRange}</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={months.map((m, i) => ({ month: m, bookings: bookings[i] }))} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.07)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8a6a40", fontFamily: "DM Sans,sans-serif" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#aaa", fontFamily: "DM Sans,sans-serif" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(232,101,10,.06)" }}
                  contentStyle={{ borderRadius: 10, border: "1px solid #f0dfc0", fontFamily: "DM Sans,sans-serif", fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,.1)" }}
                  formatter={(val) => [t("artist_performance_bookings_tooltip", { count: val }), t("artist_performance_monthly_bookings")]}
                />
                <Bar dataKey="bookings" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {months.map((m, i) => (
                    <Cell key={m} fill={i === bookings.indexOf(Math.max(...bookings)) ? "url(#bookingsBest)" : "url(#bookingsNormal)"} />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="bookingsNormal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E8650A" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="#f5a623" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="bookingsBest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c0392b" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#E8650A" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: ".6rem", fontSize: ".78rem", color: "var(--text-muted)", padding: "0 4px" }}>
              <span>{t("artist_performance_avg_month", { count: (bookings.reduce((a, b) => a + b, 0) / bookings.length).toFixed(1) })}</span>
              <span>{t("artist_performance_best_month_bookings", { month: months[bookings.indexOf(Math.max(...bookings))], count: Math.max(1, ...bookings) })}</span>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", marginBottom: ".25rem" }}>{t("artist_performance_monthly_revenue")}</h3>
            <p style={{ fontFamily: "'Crimson Pro',serif", color: "var(--text-muted)", fontSize: ".88rem", fontStyle: "italic", marginBottom: "1rem" }}>{dateRange}</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={months.map((m, i) => ({ month: m, revenue: revenue[i] }))} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,.07)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8a6a40", fontFamily: "DM Sans,sans-serif" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => (v >= 1000 ? `Rs.${v / 1000}k` : `Rs.${v}`)} tick={{ fontSize: 11, fill: "#aaa", fontFamily: "DM Sans,sans-serif" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(212,150,10,.06)" }}
                  contentStyle={{ borderRadius: 10, border: "1px solid #f0dfc0", fontFamily: "DM Sans,sans-serif", fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,.1)" }}
                  formatter={(val) => [`Rs.${val.toLocaleString("en-IN")}`, t("artist_performance_total_revenue")]}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {months.map((m, i) => (
                    <Cell key={m} fill={i === revenue.indexOf(Math.max(...revenue)) ? "url(#revenueBest)" : "url(#revenueNormal)"} />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="revenueNormal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4960A" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#f5d87a" stopOpacity={0.55} />
                  </linearGradient>
                  <linearGradient id="revenueBest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b8860b" stopOpacity={1} />
                    <stop offset="100%" stopColor="#D4960A" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: ".6rem", fontSize: ".78rem", color: "var(--text-muted)", padding: "0 4px" }}>
              <span>{t("artist_performance_total_amount", { amount: revenue.reduce((a, b) => a + b, 0).toLocaleString("en-IN") })}</span>
              <span>{t("artist_performance_best_month_revenue", { amount: Math.max(1, ...revenue).toLocaleString("en-IN") })}</span>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <h3 style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", marginBottom: "1.5rem" }}>
            {t("artist_dashboard_performance_stats")}
          </h3>
          <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "2rem" }}>
            {metrics.map(([label, pct, color]) => {
              const r = 28;
              const c = 2 * Math.PI * r;
              const dash = (pct / 100) * c;
              return (
                <div key={label} className="ring-wrap">
                  <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width={80} height={80} viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--cream-dark)" strokeWidth="6" />
                      <circle
                        cx="32"
                        cy="32"
                        r={r}
                        fill="none"
                        stroke={color}
                        strokeWidth="6"
                        strokeDasharray={`${dash} ${c}`}
                        strokeLinecap="round"
                        style={{ transformOrigin: "50% 50%", transform: "rotate(-90deg)", transition: "stroke-dasharray .8s ease" }}
                      />
                    </svg>
                    <div style={{ position: "absolute", fontFamily: "'Yatra One',cursive", fontSize: "1rem", color: "var(--text)" }}>
                      {pct}%
                    </div>
                  </div>
                  <div className="ring-label" style={{ maxWidth: 90, marginTop: 6 }}>{label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card mb-3 rating-trend-card">
          <h3 style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", marginBottom: "1rem" }}>
            {t("artist_performance_rating_trend")}
          </h3>
          <div className="rating-trend-grid">
            {months.map((m, i) => (
              <div key={m} className={`rating-trend-item ${normalizedRatings[i] === maxRating && maxRating > 0 ? "is-peak" : ""}`}>
                <div className="rating-trend-meter" aria-hidden="true">
                  <span style={{ height: `${Math.max(12, (normalizedRatings[i] / 5) * 100)}%` }} />
                </div>
                <div className="rating-trend-score">
                  {normalizedRatings[i].toFixed(1)}
                </div>
                <Stars rating={normalizedRatings[i]} className="rating-trend-stars" />
                <div className="rating-trend-month">{m}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", marginBottom: "1rem" }}>
            {t("artist_performance_recent_reviews")}
          </h3>
          {reviews.length > 0 ? (
            reviews.map((r, i) => (
              <div key={r._id || i} style={{ padding: "1rem", borderBottom: i < reviews.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 4 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg,var(--saffron),var(--gold))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: ".8rem",
                        fontWeight: 600,
                      }}
                    >
                      {r.user?.firstName?.[0] || "?"}
                    </div>
                    <strong style={{ fontSize: ".9rem" }}>
                      {r.user?.firstName} {r.user?.lastName?.[0]}.
                    </strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Stars rating={r.rating} />
                    <span style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>{(() => {
                      if (r.createdAt) return fmtDate(r.createdAt);
                      if (r._id && r._id.length === 24) return fmtDate(new Date(parseInt(r._id.substring(0, 8), 16) * 1000));
                      return "";
                    })()}</span>
                  </div>
                </div>
                <p style={{ fontSize: ".88rem", color: "var(--text-muted)", fontFamily: "'Crimson Pro',serif", lineHeight: 1.6, paddingLeft: 42 }}>
                  {r.review || r.text}
                </p>
              </div>
            ))
          ) : (
            <div style={{ color: "var(--text-muted)", fontSize: ".88rem", textAlign: "center", padding: "1.5rem" }}>
              {t("artist_performance_no_reviews")} {"\u{1F3B5}"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
