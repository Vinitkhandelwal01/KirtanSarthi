import { Link } from "react-router-dom";
import useLang from "../../hooks/useLang";

export default function Footer() {
  const { t } = useLang();

  return (
    <footer className="footer">
      <div className="footer-sections">
        <div className="footer-column footer-column-left">
          <span className="footer-heading">{t("footer_explore")}</span>
          <Link to="/artists">{t("find_artists")}</Link>
          <Link to="/events">{t("events")}</Link>
          <Link to="/about">{t("about")}</Link>
          <Link to="/contact">{t("contact")}</Link>
        </div>

        <div className="footer-brand footer-brand-center">
          <strong>ॐ KirtanSarthi</strong>
          <span>{t("footer_tagline")}</span>
        </div>

        <div className="footer-column footer-column-right">
          <span className="footer-heading">{t("footer_support")}</span>
          <Link to="/contact">{t("contact_us")}</Link>
          <a href="mailto:support@kirtansarthi.com">{t("help")}</a>
          <Link to="/privacy">{t("privacy_policy")}</Link>
          <Link to="/terms">{t("terms")}</Link>
        </div>
      </div>

      <span className="footer-copy">{t("footer_copy")}</span>
    </footer>
  );
}
