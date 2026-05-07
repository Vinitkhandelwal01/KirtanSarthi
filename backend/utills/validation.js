const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const INDIAN_PHONE_REGEX = /^(?:\+91[\s-]?)?[6-9]\d{9}$/;
const NAME_REGEX = /^[A-Za-z\u00C0-\u024F\u0900-\u097F][A-Za-z\u00C0-\u024F\u0900-\u097F\s'-]{0,49}$/;
const CITY_REGEX = /^[A-Za-z\u00C0-\u024F\u0900-\u097F][A-Za-z\u00C0-\u024F\u0900-\u097F\s,.'-]{1,59}$/;

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();

const isValidEmail = (value = "") => EMAIL_REGEX.test(normalizeEmail(value));

const normalizePhone = (value = "") => {
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits;
};

const isValidPhone = (value = "") => {
  const input = String(value).trim();
  return INDIAN_PHONE_REGEX.test(input) || /^[6-9]\d{9}$/.test(normalizePhone(input));
};

const isValidName = (value = "") => NAME_REGEX.test(String(value).trim());

const isValidCity = (value = "") => {
  const city = String(value).trim();
  if (!city) return true;
  return CITY_REGEX.test(city);
};

const getYouTubeVideoId = (url = "") => {
  try {
    const parsed = new URL(String(url).trim());
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v") || "";
      if (parsed.pathname.startsWith("/shorts/")) return parsed.pathname.split("/")[2] || "";
      if (parsed.pathname.startsWith("/embed/")) return parsed.pathname.split("/")[2] || "";
    }
  } catch {
    return "";
  }

  return "";
};

const isValidYouTubeUrl = (url = "") => /^[A-Za-z0-9_-]{11}$/.test(getYouTubeVideoId(url));

module.exports = {
  normalizeEmail,
  isValidEmail,
  normalizePhone,
  isValidPhone,
  isValidName,
  isValidCity,
  isValidYouTubeUrl,
};
