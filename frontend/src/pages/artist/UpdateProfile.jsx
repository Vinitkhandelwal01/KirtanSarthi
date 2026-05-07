import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { profileAPI, artistAPI, authAPI } from "../../services/api";
import { patchUser } from "../../slices/authSlice";
import { initials } from "../../utils/helpers";
import PasswordInput from "../../components/common/PasswordInput";
import toast from "react-hot-toast";
import useLang from "../../hooks/useLang";
import { isValidCity, isValidPhone, isValidYouTubeUrl, normalizePhone } from "../../utils/validation";

export default function ArtistUpdateProfile() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { t } = useLang();

  const [tab, setTab] = useState("personal");
  const [loading, setLoading] = useState(false);
  const [hasArtistProfile, setHasArtistProfile] = useState(null);

  const [personal, setPersonal] = useState({
    phone: user?.phone || "",
    city: user?.city || "",
    gender: user?.gender || "",
  });
  const setP = (k, v) => setPersonal((p) => ({ ...p, [k]: v }));

  const [artist, setArtist] = useState({
    artistType: "SOLO",
    groupName: "",
    description: "",
    experienceYears: "",
    price: "",
    eventTypes: "",
    gods: "",
    videoLinks: "",
  });
  const setA = (k, v) => setArtist((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    artistAPI
      .getMe()
      .then((res) => {
        const a = res.artist || res;
        setHasArtistProfile(true);
        setArtist({
          artistType: a.artistType || "SOLO",
          groupName: a.groupName || "",
          description: a.description || "",
          experienceYears: String(a.experienceYears || ""),
          price: String(a.price || ""),
          eventTypes: (a.eventTypes || []).join(", "),
          gods: (a.gods || []).join(", "),
          videoLinks: (a.videoLinks || []).join(", "),
        });
      })
      .catch(() => {
        setHasArtistProfile(false);
      });
  }, []);

  const [pwForm, setPwForm] = useState({ oldPassword: "", newPassword: "", confirmNew: "" });
  const setPw = (k, v) => setPwForm((p) => ({ ...p, [k]: v }));

  const savePersonal = async () => {
    if (personal.phone && !isValidPhone(personal.phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    if (!isValidCity(personal.city)) {
      toast.error("Please enter a valid city name");
      return;
    }
    setLoading(true);
    try {
      await profileAPI.updateProfile({
        phone: personal.phone ? normalizePhone(personal.phone) : undefined,
        city: personal.city.trim() || undefined,
        gender: personal.gender || undefined,
      });
      dispatch(patchUser({ ...personal, phone: personal.phone ? normalizePhone(personal.phone) : "", city: personal.city.trim() }));
      toast.success(t("artist_update_personal_saved"));
    } catch {
      toast.error(t("artist_update_save_failed"));
    } finally {
      setLoading(false);
    }
  };

  const saveArtist = async () => {
    if (!artist.experienceYears || !artist.eventTypes || !artist.gods) {
      toast.error(t("artist_update_required_fields"));
      return;
    }
    if (!artist.price || Number(artist.price) <= 0) {
      toast.error("Please enter your price per event which is greater than 0");
      return;
    }
    if (artist.artistType === "GROUP" && !artist.groupName) {
      toast.error(t("artist_update_group_name_required"));
      return;
    }
    const videoLinks = artist.videoLinks
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (videoLinks.some((link) => !isValidYouTubeUrl(link))) {
      toast.error("Please enter valid YouTube video URLs only");
      return;
    }
    setLoading(true);
    const payload = {
      artistType: artist.artistType,
      ...(artist.artistType === "GROUP" ? { groupName: artist.groupName } : {}),
      description: artist.description,
      experienceYears: Number(artist.experienceYears),
      price: Number(artist.price),
      eventTypes: artist.eventTypes.split(",").map((s) => s.trim()).filter(Boolean),
      gods: artist.gods.split(",").map((s) => s.trim()).filter(Boolean),
      ...(videoLinks.length ? { videoLinks } : {}),
    };
    try {
      if (hasArtistProfile) {
        await artistAPI.update(payload);
        toast.success(t("artist_update_artist_saved"));
      } else {
        await artistAPI.create(payload);
        setHasArtistProfile(true);
        toast.success(t("artist_update_artist_created"));
      }
    } catch (err) {
      toast.error(err.message || t("artist_update_artist_save_failed"));
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    if (!pwForm.oldPassword || !pwForm.newPassword) {
      toast.error(t("artist_update_fill_all"));
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmNew) {
      toast.error(t("artist_update_password_mismatch"));
      return;
    }
    setLoading(true);
    try {
      await authAPI.changePassword({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      toast.success(t("artist_update_password_changed"));
      setPwForm({ oldPassword: "", newPassword: "", confirmNew: "" });
    } catch (e) {
      toast.error(e.message || t("artist_update_generic_failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("displayPicture", file);
    try {
      const res = await profileAPI.updateDisplayPicture(fd);
      dispatch(patchUser({ image: res.image }));
      toast.success(t("artist_update_picture_updated"));
    } catch {
      toast.error(t("artist_update_picture_failed"));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-content">
          <h1>{t("artist_update_title")} {"\u270F\uFE0F"}</h1>
          <p>{t("artist_update_subtitle")}</p>
        </div>
      </div>
      <div className="main-content" style={{ maxWidth: 680 }}>
        <div className="tabs mb-3">
          {[
            ["personal", `${"\u{1F464}"} ${t("artist_update_tab_personal")}`],
            ["artist", `${"\u{1F3B5}"} ${t("artist_update_tab_artist")}`],
            ["password", `${"\u{1F510}"} ${t("artist_update_tab_password")}`],
          ].map(([k, l]) => (
            <button key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>

        {tab === "personal" && (
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
                  overflow: "hidden",
                }}
              >
                {user?.image ? (
                  <img src={user.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  initials(user)
                )}
              </div>
              <div>
                <div style={{ fontFamily: "'Crimson Pro',serif", fontSize: "1.2rem", fontWeight: 600 }}>
                  {user?.firstName} {user?.lastName}
                </div>
                <div style={{ fontSize: ".85rem", color: "var(--text-muted)", marginBottom: 8 }}>{user?.email}</div>
                <label style={{ cursor: "pointer" }}>
                  <input type="file" style={{ display: "none" }} accept="image/*" onChange={handleAvatar} />
                  <span className="btn btn-outline btn-sm">{"\u{1F4F7}"} {t("artist_update_change_photo")}</span>
                </label>
              </div>
            </div>
            <div className="grid-2 mb-2">
              <div className="form-group">
                <label className="form-label">{t("artist_update_first_name_readonly")}</label>
                <input className="form-input" value={user?.firstName || ""} disabled style={{ opacity: 0.6 }} />
              </div>
              <div className="form-group">
                <label className="form-label">{t("artist_update_last_name_readonly")}</label>
                <input className="form-input" value={user?.lastName || ""} disabled style={{ opacity: 0.6 }} />
              </div>
            </div>
            <div className="form-group mb-2">
              <label className="form-label">{t("phone")}</label>
              <input className="form-input" type="tel" value={personal.phone} onChange={(e) => setP("phone", e.target.value)} placeholder={t("update_profile_phone_placeholder")} inputMode="numeric" maxLength={14} />
            </div>
            <div className="form-group mb-2">
              <label className="form-label">{t("city")}</label>
              <input className="form-input" value={personal.city} onChange={(e) => setP("city", e.target.value)} placeholder={t("city_placeholder")} maxLength={60} />
            </div>
            <div className="form-group mb-3">
              <label className="form-label">{t("update_profile_gender")}</label>
              <select className="form-input form-select" value={personal.gender} onChange={(e) => setP("gender", e.target.value)}>
                <option value="">{t("update_profile_gender_prefer_not_say")}</option>
                <option value="Male">{t("update_profile_gender_male")}</option>
                <option value="Female">{t("update_profile_gender_female")}</option>
                <option value="Other">{t("update_profile_gender_other")}</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={savePersonal} disabled={loading}>
              {loading ? <><span className="spinner" /> {t("artist_update_saving")}</> : `${"\u{1F4BE}"} ${t("artist_update_save_personal")}`}
            </button>
          </div>
        )}

        {tab === "artist" && (
          <div className="card">
            <div className="form-group mb-2">
              <label className="form-label">{t("artist_update_artist_type")}</label>
              <select className="form-input form-select" value={artist.artistType} onChange={(e) => setA("artistType", e.target.value)}>
                <option value="SOLO">{t("artist_update_solo_artist")}</option>
                <option value="GROUP">{t("artist_update_group")}</option>
              </select>
            </div>
            {artist.artistType === "GROUP" && (
              <div className="form-group mb-2">
                <label className="form-label">{t("artist_update_group_name")}</label>
                <input className="form-input" value={artist.groupName} onChange={(e) => setA("groupName", e.target.value)} placeholder={t("artist_update_artist_placeholder")} maxLength={80} />
              </div>
            )}
            <div className="form-group mb-2">
              <label className="form-label">{t("artist_update_description")}</label>
              <textarea className="form-input" rows={4} value={artist.description} onChange={(e) => setA("description", e.target.value)} style={{ resize: "vertical" }} maxLength={1000} />
            </div>
            <div className="grid-2 mb-2">
              <div className="form-group">
                <label className="form-label">{t("artist_update_experience")}</label>
                <input className="form-input" type="number" value={artist.experienceYears} onChange={(e) => setA("experienceYears", e.target.value)} min={0} />
              </div>
              <div className="form-group">
                <label className="form-label">{t("artist_update_price_per_event")}</label>
                <input className="form-input" type="number" value={artist.price} onChange={(e) => setA("price", e.target.value)} min={1} />
              </div>
            </div>
            <div className="form-group mb-2">
              <label className="form-label">
                {t("artist_update_event_types")} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>{t("artist_update_comma_separated")}</span>
              </label>
              <input className="form-input" value={artist.eventTypes} onChange={(e) => setA("eventTypes", e.target.value)} placeholder={t("artist_update_event_types_placeholder")} />
            </div>
            <div className="form-group mb-2">
              <label className="form-label">
                {t("artist_update_deities")} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>{t("artist_update_comma_separated")}</span>
              </label>
              <input className="form-input" value={artist.gods} onChange={(e) => setA("gods", e.target.value)} placeholder={t("artist_update_deities_placeholder")} />
            </div>
            <div className="form-group mb-3">
              <label className="form-label">
                {t("artist_update_video_links")} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>{t("artist_update_youtube_urls")}</span>
              </label>
              <input className="form-input" value={artist.videoLinks} onChange={(e) => setA("videoLinks", e.target.value)} placeholder={t("artist_update_video_placeholder")} />
            </div>
            <button className="btn btn-primary" onClick={saveArtist} disabled={loading || hasArtistProfile === null}>
              {loading ? <><span className="spinner" /> {t("artist_update_saving")}</> : hasArtistProfile ? `${"\u{1F3B5}"} ${t("artist_update_update_artist")}` : `${"\u{1F3B5}"} ${t("artist_update_create_artist")}`}
            </button>
          </div>
        )}

        {tab === "password" && (
          <div className="card">
            <div className="form-group mb-2">
              <label className="form-label">{t("artist_update_current_password")}</label>
              <PasswordInput value={pwForm.oldPassword} onChange={(e) => setPw("oldPassword", e.target.value)} placeholder={t("artist_update_current_password_placeholder")} />
            </div>
            <div className="form-group mb-2">
              <label className="form-label">{t("artist_update_new_password")}</label>
              <PasswordInput value={pwForm.newPassword} onChange={(e) => setPw("newPassword", e.target.value)} placeholder={t("artist_update_new_password_placeholder")} />
            </div>
            <div className="form-group mb-3">
              <label className="form-label">{t("artist_update_confirm_new_password")}</label>
              <PasswordInput value={pwForm.confirmNew} onChange={(e) => setPw("confirmNew", e.target.value)} placeholder={t("artist_update_repeat_password_placeholder")} />
            </div>
            <button className="btn btn-primary" onClick={changePassword} disabled={loading}>
              {loading ? <><span className="spinner" /> {t("artist_update_changing")}</> : `${"\u{1F510}"} ${t("artist_update_change_password")}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

