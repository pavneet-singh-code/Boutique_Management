"use client";

import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { getMe, getToken } from "../lib/api";
import { homeFor } from "../lib/roles";
import { useI18n } from "../lib/i18n";
import { LanguageToggle } from "../components/ui";

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();

  const enter = () => router.push(getToken() ? homeFor(getMe()?.role) : "/login");

  return (
    <main className="min-h-dvh overflow-hidden text-ink">
      <nav className="relative z-10 flex items-center justify-between gap-3 px-5 py-5 md:px-12 md:py-6">
        <div className="glass flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 shadow-sm ring-1 ring-white">
          <Image src="/brand/icon-96.png" alt="" width={36} height={36} priority className="h-9 w-9 rounded-full bg-white" />
          <span className="font-display text-lg font-bold">Fab_art</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <button
            onClick={enter}
            className="press hidden h-10 items-center gap-2 rounded-full bg-card px-4 text-sm font-bold shadow-sm ring-1 ring-line sm:flex"
          >
            {t("landing.access")}
            <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      <section className="relative flex min-h-[calc(100dvh-88px)] items-center justify-center px-6 pb-16">
        {/* Soft floating bubbles (decoration only) */}
        <div aria-hidden="true" className="bg-sunset grain pointer-events-none absolute -right-24 top-4 h-72 w-72 rounded-full opacity-80 md:h-96 md:w-96" />
        <div aria-hidden="true" className="bg-lilac-glow grain pointer-events-none absolute -left-28 bottom-10 h-64 w-64 rounded-full opacity-70 md:h-80 md:w-80" />
        <div aria-hidden="true" className="pointer-events-none absolute left-[14%] top-[20%] text-accent">
          <Sparkles size={22} strokeWidth={1.6} />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-7 flex h-44 w-44 items-center justify-center rounded-full bg-white shadow-lg ring-8 ring-white/60 md:h-52 md:w-52">
            <Image
              src="/brand/logo.jpg"
              alt="Fab_art Studio — Artistry in Every Stitch"
              width={720}
              height={720}
              priority
              className="h-full w-full rounded-full object-cover"
            />
          </div>
          <p className="mb-4 inline-flex rounded-full bg-accent-soft px-4 py-1.5 text-xs font-bold text-accent-soft-ink">
            {t("landing.eyebrow")}
          </p>
          <h1 className="font-display text-5xl font-bold leading-[1.05] sm:text-6xl md:text-7xl">
            {t("landing.title1")}
            <br />
            <span className="bg-sunset bg-clip-text text-transparent">{t("landing.title2")}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base font-medium leading-7 text-muted md:text-lg">
            {t("landing.body")}
          </p>
          <button
            onClick={enter}
            className="press bg-sunset mt-9 inline-flex h-14 items-center gap-3 rounded-full px-8 text-base font-bold text-white shadow-lg shadow-accent/35"
          >
            {t("landing.enter")}
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <p className="text-xs font-semibold text-muted/70">{t("landing.footer")}</p>
        </div>
      </section>
    </main>
  );
}
