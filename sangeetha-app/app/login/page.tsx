"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Phone, ShieldCheck } from "lucide-react";
import { BigButton } from "@/components/big-button";
import { InputField } from "@/components/input-field";
import { PageBrand } from "@/components/page-brand";
import { focusFieldAfterError, useAutoScrollToMessage } from "@/lib/form-feedback";
import { useTranslation } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";
import { getAppSession, setAppSession } from "@/lib/session";

type AppUser = {
  id: string;
  name: string;
  phone: string;
  pin: string;
  role: "owner" | "employee";
};

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useAutoScrollToMessage(errorMessage, errorRef);

  useEffect(() => {
    const existingSession = getAppSession();

    if (existingSession) {
      router.replace("/");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!phone.trim()) {
      setErrorMessage(t("login.enterPhone"));
      focusFieldAfterError(phoneRef);
      return;
    }

    if (!pin.trim()) {
      setErrorMessage(t("login.enterPin"));
      focusFieldAfterError(pinRef);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("users")
        .select("id, name, phone, pin, role")
        .eq("phone", phone.trim())
        .maybeSingle<AppUser>();

      if (error) {
        setErrorMessage(error.message || t("login.loginFailed"));
        return;
      }

      if (!data || data.pin !== pin.trim()) {
        setErrorMessage(t("login.invalidCredentials"));
        focusFieldAfterError(pinRef);
        return;
      }

      setAppSession({
        id: data.id,
        fullName: data.name,
        phone: data.phone,
        role: data.role,
      });

      router.push("/");
    } catch (error) {
      console.error("Login failed", error);
      setErrorMessage(
        error instanceof Error ? error.message : t("login.loginFailed")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6">
      <section className="w-full max-w-sm rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_20px_70px_rgba(31,41,55,0.12)] backdrop-blur">
        <div className="mb-6 rounded-[24px] bg-[linear-gradient(135deg,#0d5eb8_0%,#1788e6_58%,#4fc3ff_100%)] px-5 py-6 text-white shadow-[0_16px_40px_rgba(20,121,220,0.24)]">
          <PageBrand />
          <h1 className="mt-2 text-3xl font-bold leading-tight">
            {t("login.title")}
          </h1>
          <p className="mt-3 text-base leading-6 text-white/85">
            {t("login.subtitle")}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <InputField
            ref={phoneRef}
            label={t("login.phoneNumber")}
            name="phone"
            placeholder={t("login.phonePlaceholder")}
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            icon={<Phone className="h-6 w-6" />}
          />
          <InputField
            ref={pinRef}
            label={t("login.pin")}
            name="pin"
            placeholder={t("login.pinPlaceholder")}
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            icon={<ShieldCheck className="h-6 w-6" />}
          />
          {errorMessage ? (
            <div
              ref={errorRef}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-base font-semibold text-red-700"
            >
              {errorMessage}
            </div>
          ) : null}
          <BigButton type="submit" disabled={isSubmitting} className={isSubmitting ? "opacity-70" : ""}>
            <LogIn className="h-6 w-6" />
            {t("login.button")}
          </BigButton>
        </form>

        <div className="mt-5 rounded-[22px] bg-cream px-4 py-4 text-center">
          <p className="text-base font-semibold text-ink">{t("login.version")}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {t("login.versionNote")}
          </p>
        </div>
      </section>
    </main>
  );
}
