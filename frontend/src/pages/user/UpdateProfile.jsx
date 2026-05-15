import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { profileAPI, authAPI } from "../../services/api";
import { patchUser } from "../../slices/authSlice";
import { initials } from "../../utils/helpers";
import PasswordInput from "../../components/common/PasswordInput";
import toast from "react-hot-toast";
import useLang from "../../hooks/useLang";
import { isValidCity, isValidPhone, normalizePhone } from "../../utils/validation";

export default function UpdateProfile() {
  const OTHER_OPTION = "__other__";
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useLang();
  const { user } = useSelector((s) => s.auth);
  const [tab, setTab] = useState("profile");
  const [form, setForm] = useState({
    phone: user?.phone || "",
    city: user?.city || "",
    gender: user?.gender || "",
  });
  const [pwForm, setPwForm] = useState({ oldPassword: "", newPassword: "", confirmNew: "" });
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setPw = (k, v) => setPwForm((p) => ({ ...p, [k]: v }));
  const genderSelectValue =
    form.gender === "" || form.gender === "Male" || form.gender === "Female" ? form.gender : OTHER_OPTION;

  const saveProfile = async () => {
    if (form.phone && !isValidPhone(form.phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    if (!isValidCity(form.city)) {
      toast.error("Please enter a valid city name");
      return;
    }
    setLoading(true);
    try {
      await profileAPI.updateProfile({
        phone: form.phone ? normalizePhone(form.phone) : undefined,
        city: form.city.trim() || undefined,
        gender: form.gender || undefined,
      });
      dispatch(patchUser({ phone: form.phone ? normalizePhone(form.phone) : "", city: form.city.trim(), gender: form.gender }));
      toast.success(t("update_profile_saved"));
    } catch {
      toast.error(t("update_profile_save_failed"));
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (!pwForm.oldPassword || !pwForm.newPassword) {
      toast.error(t("update_profile_fill_all_fields"));
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmNew) {
      toast.error(t("update_profile_password_mismatch"));
      return;
    }

    setPwLoading(true);
    try {
      await authAPI.changePassword({
        oldPassword: pwForm.oldPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success(t("update_profile_password_changed"));
      setPwForm({ oldPassword: "", newPassword: "", confirmNew: "" });
    } catch (e) {
      toast.error(e.message || t("update_profile_password_change_failed"));
    } finally {
      setPwLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("displayPicture", file);
    try {
      const res = await profileAPI.updateDisplayPicture(fd);
      const newImage = res.data?.image || res.data?.data?.image;
      if (newImage) {
        const updated = { ...user, image: newImage };
        dispatch(patchUser({ image: newImage }));
        localStorage.setItem("user", JSON.stringify(updated));
      }
      toast.success(t("update_profile_photo_updated"));
    } catch {
      toast.error(t("update_profile_photo_failed"));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-content">
          <h1>{t("update_profile")}</h1>
          <p>{t("update_profile_subtitle")}</p>
        </div>
      </div>
      <div className="main-content" style={{ maxWidth: 640 }}>
        <div className="tabs mb-3">
          <button className={`tab ${tab === "profile" ? "active" : ""}`} onClick={() => setTab("profile")}>
            {t("update_profile_tab_info")}
          </button>
          <button className={`tab ${tab === "password" ? "active" : ""}`} onClick={() => setTab("password")}>
            {t("update_profile_tab_password")}
          </button>
        </div>

        {tab === "profile" && (
          <div className="card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1.5rem",
                marginBottom: "2rem",
                paddingBottom: "1.5rem",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {user?.image ? (
                <img
                  src={user.image}
                  alt="Profile"
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    objectFit: "cover",
                    flexShrink: 0,
                    border: "3px solid var(--saffron)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,var(--saffron),var(--gold))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Yatra One',cursive",
                    fontSize: "2rem",
                    color: "white",
                    flexShrink: 0,
                  }}
                >
                  {initials(user)}
                </div>
              )}
              <div>
                <div style={{ fontFamily: "'Crimson Pro',serif", fontSize: "1.2rem", fontWeight: 600 }}>
                  {user?.firstName} {user?.lastName}
                </div>
                <div style={{ fontSize: ".85rem", color: "var(--text-muted)", marginBottom: 8 }}>{user?.email}</div>
                <label style={{ cursor: "pointer" }}>
                  <input type="file" style={{ display: "none" }} accept="image/*" onChange={handleAvatarUpload} />
                  <span className="btn btn-outline btn-sm">{t("update_profile_change_photo")}</span>
                </label>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
              <div className="form-group">
                <label className="form-label">{t("update_profile_first_name_readonly")}</label>
                <input className="form-input" value={user?.firstName || ""} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="form-group">
                <label className="form-label">{t("update_profile_last_name_readonly")}</label>
                <input className="form-input" value={user?.lastName || ""} disabled style={{ opacity: 0.6 }} />
              </div>
            </div>
            <div className="form-group mb-2">
              <label className="form-label">{t("update_profile_email_readonly")}</label>
              <input className="form-input" value={user?.email || ""} disabled style={{ opacity: 0.6 }} />
            </div>
            <div className="form-group mb-2">
              <label className="form-label">{t("phone")}</label>
              <input
                className="form-input"
                type="tel"
                placeholder={t("update_profile_phone_placeholder")}
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
                placeholder={t("city_placeholder")}
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="form-group mb-3">
              <label className="form-label">{t("update_profile_gender")}</label>
              <select
                className="form-input form-select"
                value={genderSelectValue}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === OTHER_OPTION) {
                    set("gender", "");
                    return;
                  }
                  set("gender", value);
                }}
              >
                <option value="">{t("update_profile_gender_prefer_not_say")}</option>
                <option value="Male">{t("update_profile_gender_male")}</option>
                <option value="Female">{t("update_profile_gender_female")}</option>
                <option value={OTHER_OPTION}>{t("update_profile_gender_other")}</option>
              </select>
              {genderSelectValue === OTHER_OPTION && (
                <input
                  className="form-input mt-2"
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                  placeholder="Type gender"
                />
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-primary" onClick={saveProfile} disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner" /> {t("update_profile_saving")}
                  </>
                ) : (
                  t("update_profile_save_changes")
                )}
              </button>
              <button className="btn btn-ghost" onClick={() => navigate("/dashboard")}>
                {t("cancel")}
              </button>
            </div>
          </div>
        )}

        {tab === "password" && (
          <div className="card">
            <div className="form-group mb-2">
              <label className="form-label">{t("update_profile_current_password")}</label>
              <PasswordInput
                value={pwForm.oldPassword}
                onChange={(e) => setPw("oldPassword", e.target.value)}
                placeholder={t("update_profile_current_password_placeholder")}
              />
            </div>
            <div className="form-group mb-2">
              <label className="form-label">{t("update_profile_new_password")}</label>
              <PasswordInput
                value={pwForm.newPassword}
                onChange={(e) => setPw("newPassword", e.target.value)}
                placeholder={t("update_profile_new_password_placeholder")}
              />
            </div>
            <div className="form-group mb-3">
              <label className="form-label">{t("update_profile_confirm_new_password")}</label>
              <PasswordInput
                value={pwForm.confirmNew}
                onChange={(e) => setPw("confirmNew", e.target.value)}
                placeholder={t("update_profile_confirm_new_password_placeholder")}
              />
            </div>
            <button className="btn btn-primary" onClick={changePassword} disabled={pwLoading}>
              {pwLoading ? (
                <>
                  <span className="spinner" /> {t("update_profile_changing")}
                </>
              ) : (
                t("update_profile_change_password")
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

