import { useState } from "react";
import toast from "react-hot-toast";
import { contactAPI } from "../services/api";
import useLang from "../hooks/useLang";
import { isValidEmail, isValidName, isValidPhone, normalizeEmail, normalizePhone } from "../utils/validation";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  message: "",
};

export default function ContactUs() {
  const { t } = useLang();
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const contacts = [
    { icon: "📧", label: t("contact_card_email"), value: "support@kirtansarthi.com", sub: t("contact_card_email_sub") },
    { icon: "📞", label: t("contact_card_call"), value: "+91 98765 43210", sub: t("contact_card_call_sub") },
    { icon: "📍", label: t("contact_card_office"), value: "Jaipur, Rajasthan", sub: "India - 302001" },
    { icon: "💬", label: t("contact_card_whatsapp"), value: "+91 98765 43210", sub: t("contact_card_whatsapp_sub") },
  ];

  const faqs = [
    { q: t("contact_faq_1_q"), a: t("contact_faq_1_a") },
    { q: t("contact_faq_2_q"), a: t("contact_faq_2_a") },
    { q: t("contact_faq_3_q"), a: t("contact_faq_3_a") },
    { q: t("contact_faq_4_q"), a: t("contact_faq_4_a") },
    { q: t("contact_faq_5_q"), a: t("contact_faq_5_a") },
  ];

  const socials = [
    ["🎵", "Instagram", "@kirtansarthi"],
    ["📺", "YouTube", "KirtanSarthi"],
    ["🐦", "Twitter", "@kirtansarthi"],
    ["📘", "Facebook", "KirtanSarthi"],
  ];

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error(t("contact_required_error"));
      return;
    }
    if (!isValidName(form.firstName) || !isValidName(form.lastName)) {
      toast.error("Please enter a valid first and last name");
      return;
    }
    if (!isValidEmail(form.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (form.phone.trim() && !isValidPhone(form.phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    if (form.message.trim().length < 10) {
      toast.error("Message should be at least 10 characters");
      return;
    }

    setSending(true);
    try {
      await contactAPI.send({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: normalizeEmail(form.email),
        phone: form.phone.trim() ? normalizePhone(form.phone) : "",
        message: form.message.trim(),
      });
      setSent(true);
      toast.success(t("contact_success_toast"));
    } catch (err) {
      const serverMessage = err?.response?.data?.message;
      toast.error(serverMessage || err?.message || t("contact_error_toast"));
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setSent(false);
    setForm(EMPTY_FORM);
  };

  return (
    <div>
      <div
        style={{
          background:
            "linear-gradient(135deg,var(--brown) 0%,var(--maroon) 60%,#2d0a0a 100%)",
          padding: "4rem 2rem 3rem",
          color: "white",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "5%",
            top: "50%",
            transform: "translateY(-50%)",
            fontFamily: "'Tiro Devanagari Hindi',serif",
            fontSize: "clamp(6rem,15vw,14rem)",
            opacity: 0.05,
            lineHeight: 1,
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          ॐ
        </div>

        <div className="main-content" style={{ padding: 0, maxWidth: 700 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,.1)",
              padding: "5px 14px",
              borderRadius: 999,
              fontSize: ".78rem",
              marginBottom: "1rem",
              fontFamily: "'DM Sans',sans-serif",
              letterSpacing: 0.5,
            }}
          >
            ✉️ {t("contact_badge")}
          </div>

          <h1
            style={{
              fontFamily: "'Yatra One',cursive",
              fontSize: "clamp(2rem,5vw,3.2rem)",
              lineHeight: 1.15,
              marginBottom: "1rem",
            }}
          >
            {t("contact_title_line_1")}
            <br />
            {t("contact_title_line_2")}
          </h1>

          <p
            style={{
              fontFamily: "'Crimson Pro',serif",
              fontSize: "1.2rem",
              lineHeight: 1.7,
              opacity: 0.85,
              maxWidth: 540,
            }}
          >
            {t("contact_hero_desc")}
          </p>
        </div>
      </div>

      <div className="main-content" style={{ paddingTop: "3rem", paddingBottom: "4rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            gap: "1rem",
            marginBottom: "3rem",
          }}
        >
          {contacts.map((contact) => (
            <div
              key={contact.label}
              style={{
                background: "var(--white)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "1.4rem 1.2rem",
                textAlign: "center",
                boxShadow: "0 2px 12px rgba(92,58,30,.08)",
                transition: "transform .2s,box-shadow .2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 28px rgba(92,58,30,.14)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 2px 12px rgba(92,58,30,.08)";
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: ".5rem" }}>{contact.icon}</div>
              <div style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", fontSize: ".95rem", marginBottom: ".25rem" }}>
                {contact.label}
              </div>
              <div style={{ fontWeight: 600, color: "var(--text)", fontSize: ".9rem", marginBottom: ".2rem" }}>
                {contact.value}
              </div>
              <div style={{ fontSize: ".78rem", color: "var(--text-muted)", fontFamily: "'Crimson Pro',serif", fontStyle: "italic" }}>
                {contact.sub}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
            gap: "2rem",
            alignItems: "start",
          }}
        >
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "linear-gradient(135deg,var(--saffron),var(--gold))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                }}
              >
                ✉️
              </div>
              <h2 style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)" }}>
                {t("contact_form_title")}
              </h2>
            </div>

            {sent ? (
              <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>🙏</div>
                <h3 style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", marginBottom: ".5rem" }}>
                  {t("contact_success_title")}
                </h3>
                <p style={{ fontFamily: "'Crimson Pro',serif", color: "var(--text-muted)", fontSize: "1.05rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                  {t("contact_success_desc")}
                </p>
                <button className="btn btn-outline btn-sm" onClick={resetForm}>
                  {t("contact_send_another")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "1rem", marginBottom: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">
                      {t("first_name")} <span style={{ color: "var(--danger)" }}>*</span>
                    </label>
                    <input className="form-input" placeholder={t("contact_first_name_placeholder")} value={form.firstName} onChange={setField("firstName")} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      {t("last_name")} <span style={{ color: "var(--danger)" }}>*</span>
                    </label>
                    <input className="form-input" placeholder={t("contact_last_name_placeholder")} value={form.lastName} onChange={setField("lastName")} required />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "1rem", marginBottom: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">
                      {t("email")} <span style={{ color: "var(--danger)" }}>*</span>
                    </label>
                    <input className="form-input" type="email" placeholder="you@email.com" value={form.email} onChange={setField("email")} autoComplete="email" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t("contact_phone_label")}</label>
                    <input className="form-input" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={setField("phone")} inputMode="numeric" maxLength={14} />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                  <label className="form-label">
                    {t("contact_message_label")} <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <textarea className="form-input" rows={5} placeholder={t("contact_message_placeholder")} value={form.message} onChange={setField("message")} style={{ resize: "vertical", minHeight: 120 }} required />
                </div>

                <button className="btn btn-primary w-full" type="submit" disabled={sending}>
                  {sending ? (
                    <>
                      <span className="spinner" style={{ width: 16, height: 16 }} /> {t("sending")}
                    </>
                  ) : (
                    `🙏 ${t("contact_send_message")}`
                  )}
                </button>
              </form>
            )}
          </div>

          <div>
            <h2 style={{ fontFamily: "'Yatra One',cursive", color: "var(--saffron-deep)", marginBottom: "1.2rem", fontSize: "1.4rem" }}>
              {t("contact_faq_title")}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
              {faqs.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>

            <div className="card" style={{ marginTop: "1.5rem", background: "linear-gradient(135deg,rgba(232,101,10,.06),rgba(212,150,10,.06))" }}>
              <h3 style={{ fontFamily: "'Yatra One',cursive", color: "var(--brown)", marginBottom: "1rem", fontSize: "1rem" }}>
                {t("contact_follow_title")}
              </h3>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {socials.map(([icon, platform, handle]) => (
                  <div key={platform} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--white)", border: "1px solid var(--border)", borderRadius: 10, padding: "7px 12px", fontSize: ".82rem" }}>
                    <span>{icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text)", fontSize: ".78rem", lineHeight: 1.1 }}>
                        {platform}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: ".72rem" }}>{handle}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        background: "var(--white)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        overflow: "hidden",
        transition: "box-shadow .2s",
        boxShadow: open ? "0 4px 20px rgba(92,58,30,.12)" : "0 1px 6px rgba(92,58,30,.06)",
      }}
    >
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 1.2rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontFamily: "'DM Sans',sans-serif",
          fontWeight: 600,
          color: "var(--text)",
          fontSize: ".88rem",
          textAlign: "left",
          gap: 12,
        }}
        aria-expanded={open}
      >
        <span>{q}</span>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: open ? "linear-gradient(135deg,var(--saffron),var(--gold))" : "var(--cream-dark)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: ".7rem",
            color: open ? "white" : "var(--text-muted)",
            flexShrink: 0,
            transition: "all .2s",
          }}
        >
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "0 1.2rem 1rem",
            fontFamily: "'Crimson Pro',serif",
            color: "var(--text-muted)",
            fontSize: "1rem",
            lineHeight: 1.7,
            borderTop: "1px solid var(--border)",
            paddingTop: ".75rem",
          }}
        >
          {a}
        </div>
      )}
    </div>
  );
}
