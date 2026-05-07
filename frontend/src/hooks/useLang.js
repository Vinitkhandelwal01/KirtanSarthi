import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { setLang } from "../slices/langSlice";
import { LANGUAGE_STORAGE_KEY_NAME } from "../i18n";

export default function useLang() {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const lang = useSelector((state) => state.lang.lang);

  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [i18n, lang]);

  const toggle = () => {
    const next = lang === "en" ? "hi" : "en";
    localStorage.setItem(LANGUAGE_STORAGE_KEY_NAME, next);
    i18n.changeLanguage(next);
    dispatch(setLang(next));
  };

  return { lang, t, toggle };
}
