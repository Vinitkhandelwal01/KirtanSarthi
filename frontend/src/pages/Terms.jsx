import useLang from "../hooks/useLang";

export default function Terms() {
  const { t } = useLang();

  return (
    <div>
      <div className="page-header">
        <div className="page-header-content">
          <h1>{t("terms_title")}</h1>
          <p>{t("terms_subtitle")}</p>
        </div>
      </div>

      <div className="main-content">
        <div className="card" style={{ maxWidth: 900, margin: "0 auto", padding: "2rem", lineHeight: 1.8 }}>
          <h2 className="section-title">{t("terms_section_1_title")}</h2>
          <p>{t("terms_section_1_desc")}</p>

          <h2 className="section-title mt-3">{t("terms_section_2_title")}</h2>
          <p>{t("terms_section_2_desc")}</p>

          <h2 className="section-title mt-3">{t("terms_section_3_title")}</h2>
          <p>{t("terms_section_3_desc")}</p>

          <h2 className="section-title mt-3">{t("terms_section_4_title")}</h2>
          <p>{t("terms_section_4_desc")}</p>
        </div>
      </div>
    </div>
  );
}
