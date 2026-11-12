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
    <main className="min-h-dvh bg-[#f5f1ea] text-[#1c1c1a]">
      <nav className="flex items-center justify-between gap-3 px-5 py-5 md:px-12 md:py-6">
        <div className="flex items-center gap-2.5 text-base font-semibold tracking-[0.2em] md:text-lg">
          <Image src="/brand/icon-96.png" alt="" width={36} height={36} priority className="h-9 w-9 rounded-xl" />
          FAB_ART
        </div>
        <div className="flex items-center gap-4">
          <LanguageToggle className="!border-[#e3d8ca] !bg-white/60" />
          <button
            onClick={enter}
            className="group hidden items-center gap-2 text-sm font-medium tracking-wide transition-opacity hover:opacity-60 sm:flex"
          >
            {t("landing.access")}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </nav>

      <section className="relative flex min-h-[calc(100dvh-84px)] items-center justify-center overflow-hidden px-6">
        <div className="pointer-events-none absolute left-[8%] top-[18%] h-32 w-32 rounded-full border border-[#1c1c1a]/10" />
        <div className="pointer-events-none absolute bottom-[15%] right-[8%] h-48 w-48 rounded-full border border-[#1c1c1a]/10" />
        <div className="pointer-events-none absolute left-[12%] top-[22%]">
          <Sparkles size={18} strokeWidth={1} className="opacity-40" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <Image
            src="/brand/logo.jpg"
            alt="Fab_art Studio — Artistry in Every Stitch"
            width={720}
            height={720}
            priority
            className="mx-auto mb-6 h-44 w-44 rounded-full mix-blend-multiply md:h-56 md:w-56"
          />
          <p className="mb-8 text-xs font-medium uppercase tracking-[0.35em] text-[#1c1c1a]/50">
            {t("landing.eyebrow")}
          </p>
          <h1 className="text-5xl font-light leading-[1.05] tracking-[-0.03em] sm:text-6xl md:text-8xl lg:text-9xl">
            {t("landing.title1")}
            <br />
            <span className="font-serif italic">{t("landing.title2")}</span>
          </h1>
          <p className="mx-auto mt-10 max-w-xl text-base leading-7 text-[#1c1c1a]/60 md:text-lg">
            {t("landing.body")}
          </p>
          <button
            onClick={enter}
            className="group mt-10 inline-flex items-center gap-3 rounded-full bg-[#1c1c1a] px-7 py-4 text-base font-medium text-[#f5f1ea] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            {t("landing.enter")}
            <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>

        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#1c1c1a]/35">
            {t("landing.footer")}
          </p>
        </div>
      </section>
    </main>
  );
}
