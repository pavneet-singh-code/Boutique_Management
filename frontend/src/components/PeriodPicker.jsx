"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { cx } from "./ui";

/** ‹ November 2026 › — big, thumb-friendly period stepper. */
export function PeriodStepper({ label, onPrev, onNext, nextDisabled, className }) {
  const { t } = useI18n();
  return (
    <div
      className={cx(
        "flex items-center justify-between gap-2 rounded-full border border-line bg-card px-1.5 py-1.5 md:rounded-xl",
        className
      )}
    >
      <button
        type="button"
        onClick={onPrev}
        aria-label={t("common.prev")}
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-card-2"
      >
        <ChevronLeft size={20} />
      </button>
      <span className="min-w-0 truncate px-2 text-center text-[15px] font-semibold text-ink">
        {label}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        aria-label={t("common.next")}
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-card-2 disabled:opacity-30"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

/** Month | Year switch shared by the two report screens. */
export function ReportTabs({ current }) {
  const { t } = useI18n();
  const items = [
    { key: "month", href: "/monthly-review", label: t("reports.month") },
    { key: "year", href: "/yearly-review", label: t("reports.year") },
  ];
  return (
    <div className="grid grid-cols-2 border-b border-line bg-card md:hidden">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={current === item.key ? "page" : undefined}
          className={cx(
            "border-b-[3px] py-3 text-center text-[15px] font-medium transition",
            current === item.key
              ? "border-accent-ink text-accent-ink"
              : "border-transparent text-muted"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
