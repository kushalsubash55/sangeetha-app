"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import en from "@/locales/en.json";
import kn from "@/locales/kn.json";

export type Language = "en" | "kn";

type TranslationValue = string | TranslationTree;
type TranslationTree = {
  [key: string]: TranslationValue;
};
type TranslationParams = Record<string, string | number>;

type I18nContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: TranslationParams) => string;
  locale: string;
};

const translations: Record<Language, TranslationTree> = { en, kn };
const STORAGE_KEY = "sangeetha_app_language";

const I18nContext = createContext<I18nContextValue | null>(null);

function getNestedValue(tree: TranslationTree, key: string): string | null {
  const parts = key.split(".");
  let current: TranslationValue | undefined = tree;

  for (const part of parts) {
    if (!current || typeof current === "string" || !(part in current)) {
      return null;
    }

    current = current[part];
  }

  return typeof current === "string" ? current : null;
}

function interpolate(template: string, params?: TranslationParams) {
  if (!params) {
    return template;
  }

  return Object.entries(params).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(STORAGE_KEY);

    if (storedLanguage === "en" || storedLanguage === "kn") {
      setLanguage(storedLanguage);
    }
  }, []);

  function handleSetLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
  }

  const value = useMemo<I18nContextValue>(() => {
    return {
      language,
      setLanguage: handleSetLanguage,
      locale: language === "kn" ? "kn-IN" : "en-IN",
      t: (key, params) => {
        const selectedValue = getNestedValue(translations[language], key);
        const fallbackValue = getNestedValue(translations.en, key);
        const template = selectedValue ?? fallbackValue ?? key;
        return interpolate(template, params);
      },
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useTranslation must be used inside I18nProvider.");
  }

  return context;
}

export function useStatusLabel() {
  const { t } = useTranslation();

  return (status: string) => {
    const normalized = status.trim().toUpperCase();

    if (normalized === "RECEIVED") {
      return t("common.receivedStatus");
    }

    if (normalized === "READY") {
      return t("common.readyStatus");
    }

    if (normalized === "DELIVERED") {
      return t("common.deliveredStatus");
    }

    return status;
  };
}

export function usePaymentModeLabel() {
  const { t } = useTranslation();

  return (paymentMode: string) => {
    const normalized = paymentMode.trim().toLowerCase();

    if (normalized === "cash") {
      return t("common.cash");
    }

    if (normalized === "upi") {
      return t("common.upi");
    }

    if (normalized === "none") {
      return t("common.none");
    }

    return paymentMode;
  };
}

export function formatWorkerIdentity(workerId: string | null) {
  if (!workerId) {
    return null;
  }

  return workerId.slice(0, 8);
}
