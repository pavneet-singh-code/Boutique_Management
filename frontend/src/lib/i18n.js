"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { dictionaries } from "./translations";

const STORAGE_KEY = "fab_art_lang";
const DEFAULT_LANG = "hi";
const CHANGE_EVENT = "fab_art_lang_change";

function readLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "en" || saved === "hi" ? saved : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

function subscribe(callback) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function setLanguage(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage blocked: the choice simply won't be remembered.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const lang = useSyncExternalStore(subscribe, readLang, () => DEFAULT_LANG);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key, vars) => {
      let text = dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }
      return text;
    },
    [lang]
  );

  // Turns an Error from lib/api into a readable, translated message.
  const tError = useCallback(
    (error) => {
      const message = error?.message || "";
      if (error?.code === "duplicate_order_numbers" && error.numbers?.length) {
        return t("number.duplicate", { numbers: error.numbers.join(", ") });
      }
      if (error?.code === "order_number_required") return t("number.required");
      if (message.startsWith("error.")) return t(message);
      return message || t("error.generic");
    },
    [t]
  );

  const value = useMemo(
    () => ({
      lang,
      locale: lang === "hi" ? "hi-IN" : "en-IN",
      setLang: setLanguage,
      t,
      tError,
    }),
    [lang, t, tError]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useI18n must be used inside LanguageProvider");
  }
  return context;
}
