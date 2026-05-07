import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useLang from "../hooks/useLang";
import PasswordInput from "../components/common/PasswordInput";
import toast from "react-hot-toast";
import { authAPI } from "../services/api";
import { isValidEmail, normalizeEmail } from "../utils/validation";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t("login_fill_fields"));
      return;
    }
    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const data = await login(normalizeEmail(email), password);
      toast.success(t("welcome_back_toast"));
      const type = data.user?.accountType;
      if (type === "ADMIN") navigate("/admin/dashboard");
      else if (type === "ARTIST") navigate("/artist/dashboard");
      else navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || t("invalid_credentials"));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast.error(t("enter_your_email"));
      return;
    }
    if (!isValidEmail(resetEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    try {
      await authAPI.resetPasswordToken({ email: normalizeEmail(resetEmail) });
      toast.success(t("password_reset_email_sent"));
      setForgot(false);
    } catch (err) {
      toast.error(err.message || t("failed_to_send_reset_email"));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-content">
          <h1>{t("login_welcome")}</h1>
          <p>{t("login_subtitle")}</p>
        </div>
      </div>
      <div className="main-content">
        <div className="card" style={{ maxWidth: 440, margin: "0 auto", padding: "2rem" }}>
          <h2
            style={{
              fontFamily: "'Yatra One',cursive",
              color: "var(--saffron-deep)",
              marginBottom: "1.5rem",
              textAlign: "center",
            }}
          >
            {t("login")}
          </h2>
          <form onSubmit={handleLogin}>
            <div className="form-group mb-2">
              <label className="form-label">
                {t("email_address")}: <sup className="text-pink-200">*</sup>
              </label>
              <input
                className="form-input"
                type="email"
                placeholder={t("enter_email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="form-group mb-2">
              <label className="form-label">
                {t("password")}: <sup className="text-pink-200">*</sup>
              </label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div style={{ textAlign: "right", marginBottom: "1rem" }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setForgot(true)}
                style={{ color: "var(--saffron-deep)", fontSize: ".82rem" }}
              >
                {t("forgot_password")}
              </button>
            </div>
            <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" /> {t("logging_in")}
                </>
              ) : (
                t("login")
              )}
            </button>
          </form>
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
              {t("new_to_kirtansarthi")}
            </p>
            <button className="btn btn-outline" onClick={() => navigate("/signup")}>
              {t("create_account")}
            </button>
          </div>
        </div>
      </div>

      {forgot && (
        <div className="modal-overlay" onClick={() => setForgot(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setForgot(false)}>
              ×
            </button>
            <h2
              style={{
                fontFamily: "'Yatra One',cursive",
                color: "var(--saffron-deep)",
                marginBottom: "1rem",
              }}
            >
              {t("reset_password")}
            </h2>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: ".88rem",
                marginBottom: "1.5rem",
              }}
            >
              {t("reset_password_help")}
            </p>
            <div className="form-group mb-3">
              <label className="form-label">
                {t("email")}: <sup className="text-pink-200">*</sup>
              </label>
              <input
                className="form-input"
                type="email"
                placeholder={t("reset_email_placeholder")}
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <button className="btn btn-primary w-full" onClick={handleForgotPassword}>
              {t("send_reset_link")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
