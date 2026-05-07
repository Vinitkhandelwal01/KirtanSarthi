import i18n from "i18next";
import HttpBackend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

const LANGUAGE_STORAGE_KEY = "ks_lang";
const savedLanguage =
  typeof window !== "undefined"
    ? localStorage.getItem(LANGUAGE_STORAGE_KEY)
    : null;

i18n.use(HttpBackend).use(initReactI18next).init({
  lng: savedLanguage || "en",
  fallbackLng: "en",
  supportedLngs: ["en", "hi"],
  defaultNS: "translation",
  ns: ["translation"],
  backend: {
    loadPath: "/locales/{{lng}}/translation.json",
  },
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

i18n.on("languageChanged", (language) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }
});

if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.language || "en";
}

export const LANGUAGE_STORAGE_KEY_NAME = LANGUAGE_STORAGE_KEY;
export default i18n;
