"use client";

import { useTranslation, type Language } from "@/lib/i18n";

export function LanguageToggle() {
  const { language, setLanguage, t } = useTranslation();

  const options: Array<{ value: Language; label: string }> = [
    { value: "en", label: t("common.english") },
    { value: "kn", label: t("common.kannada") },
  ];

  return (
    <div className="inline-flex rounded-full border border-white/70 bg-white/18 p-1 shadow-sm">
      {options.map((option) => {
        const active = language === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLanguage(option.value)}
            className={`rounded-full px-3 py-1 text-xs font-bold transition ${
              active ? "bg-white text-brand shadow-sm" : "text-white/85"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
