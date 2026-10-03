"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#f5f1ea] text-[#1c1c1a]">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-6 md:px-12 lg:px-16">
        <div className="text-lg font-semibold tracking-[0.2em]">
          FAB_ART
        </div>

        <button
          onClick={() => router.push("/login")}
          className="group flex items-center gap-2 text-sm font-medium tracking-wide transition-opacity hover:opacity-60"
        >
          Studio Access
          <ArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-1"
          />
        </button>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-[calc(100vh-96px)] items-center justify-center overflow-hidden px-6">
        
        {/* Decorative elements */}
        <div className="pointer-events-none absolute left-[8%] top-[18%] h-32 w-32 rounded-full border border-[#1c1c1a]/10" />

        <div className="pointer-events-none absolute bottom-[15%] right-[8%] h-48 w-48 rounded-full border border-[#1c1c1a]/10" />

        <div className="pointer-events-none absolute left-[12%] top-[22%]">
          <Sparkles size={18} strokeWidth={1} className="opacity-40" />
        </div>

        {/* Main content */}
        <div className="relative z-10 mx-auto max-w-5xl text-center">

          <p className="mb-8 text-xs font-medium uppercase tracking-[0.35em] text-[#1c1c1a]/50">
            Boutique Order Studio
          </p>

          <h1 className="text-5xl font-light leading-[0.95] tracking-[-0.04em] sm:text-6xl md:text-8xl lg:text-9xl">
            Handwritten
            <br />
            <span className="font-serif italic">
              orders.
            </span>
          </h1>

          <p className="mx-auto mt-10 max-w-xl text-base leading-7 text-[#1c1c1a]/60 md:text-lg">
            A private workspace designed to transform handwritten
            orders into beautifully organized digital records.
          </p>

          <button
            onClick={() => router.push("/login")}
            className="group mt-10 inline-flex items-center gap-3 rounded-full bg-[#1c1c1a] px-7 py-4 text-sm font-medium text-[#f5f1ea] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            Enter Studio

            <ArrowRight
              size={17}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </button>
        </div>

        {/* Bottom information */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#1c1c1a]/35">
            Crafted with care · Fab_art Studio
          </p>
        </div>
      </section>
    </main>
  );
}