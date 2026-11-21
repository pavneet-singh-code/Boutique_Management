"use client";

import Image from "next/image";
import { ArrowRight, Sparkles, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { getMe, getToken } from "../lib/api";
import { homeFor } from "../lib/roles";
import { useI18n } from "../lib/i18n";
import { LanguageToggle } from "../components/ui";
import DressFormArt from "../components/DressFormArt";

const GOWN_RED = "#7b1e2c"; // the colour of the gown in the illustration

export default function Home() {
  const router = useRouter();
  const { t, lang } = useI18n();

  const enter = () => router.push(getToken() ? homeFor(getMe()?.role) : "/login");
  const upload = () => router.push(getToken() ? "/upload-orders" : "/login");

  return (
    <main className="min-h-dvh text-ink md:p-4">
      {/* A big rounded "poster" panel on tablets / laptops */}
      <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#f4eee6] md:min-h-[calc(100dvh-2rem)] md:rounded-[2.75rem] md:shadow-md md:ring-1 md:ring-white">
        <nav className="relative z-10 flex items-center justify-between gap-3 px-5 py-5 md:px-12 md:py-8">
          <div className="flex items-center gap-2.5">
            <Image
              src="/brand/icon-96.png"
              alt=""
              width={48}
              height={48}
              priority
              className="h-11 w-11 rounded-full bg-white shadow-sm ring-2 ring-white md:h-12 md:w-12"
            />
            <span className="font-display text-xl font-extrabold leading-none md:text-2xl">
              Fab_art
              <span className="block text-xs font-bold tracking-wide text-muted">Studio</span>
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <LanguageToggle />
            <button
              onClick={enter}
              className="press bg-cocoa hidden h-11 items-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-md shadow-accent/25 sm:flex"
            >
              {t("landing.access")}
              <ArrowRight size={16} />
            </button>
          </div>
        </nav>

        <section className="relative mx-auto grid w-full max-w-7xl flex-1 items-center gap-6 px-5 pb-10 md:grid-cols-[1.1fr_1fr] md:gap-4 md:px-12 md:pb-14">
          {/* Words */}
          <div className="relative">
            <Sparkles
              aria-hidden="true"
              size={34}
              strokeWidth={1.6}
              className="-mb-2 -ml-1 -rotate-12 text-[#c1872e] md:-mb-1 md:-ml-6"
            />
            <p className="mb-4 inline-flex rounded-full bg-white px-4 py-1.5 text-xs font-bold text-accent-ink shadow-sm">
              {t("landing.eyebrow")}
            </p>
            <h1 className={`font-display text-[3.4rem] font-extrabold tracking-tight sm:text-7xl lg:text-[6.4rem] ${
                // Hindi vowel signs need room above and below the line.
                lang === "hi" ? "leading-[1.15]" : "leading-[0.95]"
              }`}>
              <span className="block">{t("landing.title1")}</span>
              <span className="block">{t("landing.title2")}</span>
              <span className="block" style={{ color: GOWN_RED }}>
                {t("landing.title3")}
              </span>
            </h1>
            <p className="mt-6 max-w-md text-base font-semibold leading-7 tracking-wide text-ink-2 md:text-lg">
              {t("landing.body")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={enter}
                className="press bg-cocoa inline-flex h-14 items-center justify-center gap-3 rounded-full pl-2 pr-7 text-base font-bold text-white shadow-lg shadow-accent/30"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Sparkles size={18} />
                </span>
                {t("landing.enter")}
              </button>
              <button
                onClick={upload}
                className="press inline-flex h-14 items-center justify-center gap-3 rounded-full border-2 border-ink bg-transparent pl-2 pr-7 text-base font-bold text-ink hover:bg-white/60"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                  <Upload size={18} />
                </span>
                {t("landing.upload")}
              </button>
            </div>
          </div>

          {/* Picture: a dress form in a deep red gown */}
          <div className="relative mx-auto w-full max-w-[22rem] sm:max-w-md md:max-w-[34rem]">
            <DressFormArt className="h-auto w-full drop-shadow-sm" />
          </div>
        </section>

        <footer className="relative pb-6 text-center text-xs font-semibold text-muted/80">
          {t("landing.footer")}
        </footer>
      </div>
    </main>
  );
}
