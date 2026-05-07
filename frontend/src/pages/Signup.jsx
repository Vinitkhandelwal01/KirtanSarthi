import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useLang from "../hooks/useLang";
import PasswordInput from "../components/common/PasswordInput";
import toast from "react-hot-toast";
import { isValidEmail, isValidName, isValidPhone, normalizeEmail, normalizePhone, isValidCity } from "../utils/validation";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sendOtp, signup } = useAuth();
  const { t } = useLang();
  const defaultRole =
    searchParams.get("role")?.toUpperCase() === "ARTIST" ? "ARTIST" : "USER";

  const [step, setStep] = useState(1);
  const [role, setRole] = useState(defaultRole);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    city: "",
  });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleNext = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.phone) {
      toast.error(t("signup_fill_fields"));
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
    if (!isValidPhone(form.phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    if (!isValidCity(form.city)) {
      toast.error("Please enter a valid city name");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error(t("passwords_do_not_match"));
      return;
    }
    setLoading(true);
    try {
      await sendOtp(form.email);
      toast.success(t("otp_sent_success"));
      setStep(2);
    } catch (err) {
      toast.error(err.message || t("failed_to_send_otp"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!otp || otp.length < 4) {
      toast.error(t("enter_valid_otp"));
      return;
    }
    setLoading(true);
    try {
      const res = await signup({
        ...form,
        email: normalizeEmail(form.email),
        phone: normalizePhone(form.phone),
        city: form.city.trim(),
        accountType: role,
        otp,
      });
      toast.success(res?.message || t("account_created_welcome"));
      const type = res?.user?.accountType || role;
      if (type === "ARTIST") navigate("/artist/dashboard");
      else navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || t("signup_failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-content">
          <h1>{t("signup_join_title")}</h1>
          <p>{t("signup_join_subtitle")}</p>
        </div>
      </div>
      <div className="main-content">
        <div className="card" style={{ maxWidth: 480, margin: "0 auto", padding: "2rem" }}>
          <div className="tabs mb-3">
            <button
              className={`tab ${role === "USER" ? "active" : ""}`}
              onClick={() => setRole("USER")}
            >
              {t("signup_role_user")}
            </button>
            <button
              className={`tab ${role === "ARTIST" ? "active" : ""}`}
              onClick={() => setRole("ARTIST")}
            >
              {t("signup_role_artist")}
            </button>
          </div>

          {step === 1 ? (
            <>
              <h2
                style={{
                  fontFamily: "'Yatra One',cursive",
                  color: "var(--saffron-deep)",
                  marginBottom: "1.5rem",
                  textAlign: "center",
                }}
              >
                {t("your_details")}
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div className="form-group">
                  <label className="form-label">{t("first_name")} *</label>
                  <input
                    className="form-input"
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    maxLength={50}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t("last_name")} *</label>
                  <input
                    className="form-input"
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    maxLength={50}
                  />
                </div>
              </div>
              <div className="form-group mb-2 mt-2">
                <label className="form-label">{t("email")} *</label>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="form-group mb-2">
                <label className="form-label">{t("phone")} *</label>
                <input
                  className="form-input"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  inputMode="numeric"
                  maxLength={14}
                />
              </div>
              <div className="form-group mb-2">
                <label className="form-label">{t("city")}</label>
                <input
                  className="form-input"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder={t("city_placeholder")}
                  maxLength={60}
                />
              </div>
              <div className="form-group mb-2">
                <label className="form-label">{t("password")} *</label>
                <PasswordInput value={form.password} onChange={(e) => set("password", e.target.value)} />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">{t("confirm_password")} *</label>
                <PasswordInput
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword", e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary btn-lg w-full"
                onClick={handleNext}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" /> {t("sending_otp")}
                  </>
                ) : (
                  t("continue_arrow")
                )}
              </button>
            </>
          ) : (
            <>
              <h2
                style={{
                  fontFamily: "'Yatra One',cursive",
                  color: "var(--saffron-deep)",
                  marginBottom: ".5rem",
                  textAlign: "center",
                }}
              >
                {t("verify_email")}
              </h2>
              <p
                style={{
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: ".88rem",
                  marginBottom: "1.5rem",
                }}
              >
                {t("otp_sent_to_email", { email: form.email })}
              </p>
              <div className="form-group mb-3">
                <label className="form-label">{t("otp_code")}</label>
                <input
                  className="form-input"
                  style={{
                    textAlign: "center",
                    fontSize: "1.5rem",
                    letterSpacing: 8,
                    fontFamily: "'Yatra One',cursive",
                  }}
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                />
              </div>
              <button
                className="btn btn-primary btn-lg w-full"
                onClick={handleVerify}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" /> {t("verifying")}
                  </>
                ) : (
                  t("verify_create_account")
                )}
              </button>
              <button className="btn btn-ghost w-full mt-1" onClick={() => setStep(1)}>
                {t("back")}
              </button>
            </>
          )}

          <div className="divider">
            <span className="divider-text">{t("or")}</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: ".88rem",
                marginBottom: ".8rem",
              }}
            >
              {t("already_have_account")}
            </p>
            <button className="btn btn-outline" onClick={() => navigate("/login")}>
              {t("login")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

