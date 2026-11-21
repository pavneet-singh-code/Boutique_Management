"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Eye, EyeOff, Languages, LoaderCircle } from "lucide-react";
import { login } from "../../lib/api";
import { homeFor } from "../../lib/roles";
import { useI18n } from "../../lib/i18n";
import { Notice, cx } from "../../components/ui";

function LanguageChoice() {
  const { lang, setLang } = useI18n();
  const options = [
    { value: "hi", label: "हिन्दी", sub: "Hindi" },
    { value: "en", label: "English", sub: "अंग्रेज़ी" },
  ];
  return (
    <fieldset>
      <legend className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-2">
        <Languages size={16} />
        भाषा चुनें / Choose language
      </legend>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const active = lang === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setLang(option.value)}
              className={cx(
                "press rounded-3xl border-2 px-4 py-3 text-left",
                active
                  ? "border-accent bg-accent-soft shadow-sm shadow-accent/20"
                  : "border-line bg-card hover:border-accent/40"
              )}
            >
              <span className="block text-lg font-semibold text-ink">{option.label}</span>
              <span className="block text-xs text-muted">{option.sub}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, tError } = useI18n();

  // Everyone logs in with phone + PIN; the owner password still works as a fallback.
  const [mode, setMode] = useState("pin");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const expired = searchParams.get("expired") === "1";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (mode === "pin" ? !phone || !pin : !password) {
      setError(t("login.empty"));
      return;
    }
    setLoading(true);
    try {
      const data = await login(mode === "pin" ? { phone, pin } : { password });
      router.replace(homeFor(data.employee?.role));
    } catch (err) {
      setError(tError(err));
      setLoading(false);
    }
  };

  const inputClass =
    "h-14 w-full rounded-full border-2 border-line bg-card-2/60 px-5 text-[16px] font-semibold outline-none transition focus:border-accent focus:bg-card focus:ring-4 focus:ring-accent/15 disabled:opacity-60";

  return (
    <main className="min-h-dvh text-ink md:flex md:items-center md:justify-center md:py-10">
      <div className="w-full md:max-w-md">
        {/* Bright header with the logo, like a greeting card */}
        <div className="bg-cocoa grain relative overflow-hidden rounded-b-[3rem] px-6 pb-24 pt-6 text-white md:rounded-[2.5rem]">
          <span aria-hidden="true" className="absolute -right-12 -top-10 h-48 w-48 rounded-full bg-white/20" />
          <span aria-hidden="true" className="absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-black/15 blur-sm" />
          <Link
            href="/"
            className="press relative inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-ink shadow-sm"
          >
            <ArrowLeft size={16} />
            {t("common.back")}
          </Link>
          <div className="relative mt-6 flex flex-col items-center text-center">
            <Image
              src="/brand/logo.jpg"
              alt="Fab_art Studio"
              width={720}
              height={720}
              priority
              className="h-32 w-32 rounded-full bg-white object-cover shadow-lg ring-4 ring-white/60 md:h-36 md:w-36"
            />
            <h1 className="mt-4 font-display text-[2.1rem] font-bold leading-tight">{t("login.title")}</h1>
            <p className="mt-1 max-w-xs text-sm font-medium text-white/90">
              {mode === "pin" ? t("login.subtitlePin") : t("login.subtitle")}
            </p>
          </div>
        </div>

        <div className="relative -mt-16 px-4 pb-10 md:px-0">
        <div className="rounded-[2rem] bg-card p-6 shadow-lg ring-1 ring-white">
        <div className="mb-7">
          <LanguageChoice />
        </div>

        {expired && !error && (
          <Notice tone="warn" className="mb-5">
            {t("login.expired")}
          </Notice>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "pin" ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-medium text-ink-2">
                  {t("login.phone")}
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={t("login.phonePlaceholder")}
                  disabled={loading}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="pin" className="mb-2 block text-sm font-medium text-ink-2">
                  {t("login.pin")}
                </label>
                <input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="current-password"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                  placeholder={t("login.pinPlaceholder")}
                  disabled={loading}
                  className={`${inputClass} tracking-[0.4em]`}
                />
              </div>
            </div>
          ) : (
          <>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-ink-2">
            {t("login.password")}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("login.placeholder")}
              disabled={loading}
              autoComplete="current-password"
              className="h-14 w-full rounded-full border-2 border-line bg-card-2/60 px-5 pr-12 text-[16px] font-semibold outline-none transition focus:border-accent focus:bg-card focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:text-ink"
              aria-label={showPassword ? t("login.hide") : t("login.show")}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          </>
          )}

          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="press bg-cocoa mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-bold text-white shadow-md shadow-accent/30 hover:brightness-105 disabled:opacity-60"
          >
            {loading && <LoaderCircle size={18} className="animate-spin" />}
            {loading ? t("login.loading") : t("login.submit")}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "pin" ? "password" : "pin");
              setError("");
            }}
            className="mt-5 w-full text-center text-sm font-medium text-accent-ink"
          >
            {mode === "pin" ? t("login.usePassword") : t("login.usePin")}
          </button>
        </form>
        </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
