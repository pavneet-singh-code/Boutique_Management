"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  CircleAlert,
  LoaderCircle,
  TriangleAlert,
  CircleCheck,
  X,
} from "lucide-react";
import { useI18n } from "../lib/i18n";
import { avatarColors, initials } from "../lib/orders";
import { employeeColor } from "../lib/colors";
import { ButtonDoodle, NeedleDoodle, ScissorsDoodle, SparkleDoodle, SpoolDoodle } from "./Doodles";

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/* ---------------- Buttons ---------------- */

const buttonVariants = {
  primary:
    "bg-cocoa text-white font-semibold shadow-md shadow-accent/25 hover:brightness-105 disabled:opacity-50",
  secondary:
    "bg-card text-ink-2 font-semibold shadow-sm ring-1 ring-line hover:bg-card-2 disabled:opacity-50",
  danger: "bg-danger text-white font-semibold shadow-sm hover:opacity-90 disabled:opacity-50",
  ghost: "text-ink-2 font-medium hover:bg-card-2 disabled:opacity-50",
};

/** Round "pill" buttons everywhere (phone, tablet and laptop). */
export function buttonClass(variant = "primary", size = "md") {
  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-5 text-[15px]",
    lg: "h-13 px-7 text-base",
  };
  return cx(
    "press inline-flex items-center justify-center gap-2 rounded-full disabled:cursor-not-allowed",
    sizes[size],
    buttonVariants[variant]
  );
}

export function Button({ variant, size, className, ...props }) {
  return (
    <button
      type="button"
      className={cx(buttonClass(variant, size), className)}
      {...props}
    />
  );
}

export function LinkButton({ variant, size, className, ...props }) {
  return <Link className={cx(buttonClass(variant, size), className)} {...props} />;
}

/* ---------------- Surfaces ---------------- */

export function Card({ className, children, ...props }) {
  return (
    <section
      className={cx(
        "rounded-3xl border border-white bg-card shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ title, help, action }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-4 md:px-0">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold leading-tight text-ink md:text-2xl">
          {title}
        </h2>
        {help && <p className="mt-0.5 text-xs text-muted">{help}</p>}
      </div>
      {action}
    </div>
  );
}

/** Page heading shown on tablets/desktop (phones use the app bar). */
export function PageHeading({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="mb-6 hidden flex-col gap-4 md:flex lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && (
          <p className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent-soft-ink">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 flex items-center gap-3 font-display text-4xl font-bold leading-tight tracking-tight text-ink lg:text-[2.75rem]">
          {title}
          <NeedleDoodle className="h-11 w-11 shrink-0 -rotate-12" />
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// Each tile tone: background, label colour, icon bubble.
const TILE_TONES = {
  default: ["bg-card shadow-sm border border-white", "text-muted", "bg-accent-soft text-accent-ink", "text-ink"],
  accent: ["bg-cocoa grain shadow-md shadow-accent/25", "text-white/85", "bg-white/25 text-white", "text-white"],
  sand: ["bg-sand shadow-sm border border-white", "text-accent-soft-ink/80", "bg-white text-accent-ink", "text-ink"],
  taupe: ["bg-taupe-soft shadow-sm border border-white", "text-taupe-ink/80", "bg-white text-taupe-ink", "text-ink"],
};

/** A number with a label, as a soft rounded tile (like "Energy 80" in the reference). */
export function StatTile({ label, value, note, icon: Icon, tone = "default" }) {
  const [surface, labelColor, iconBubble, valueColor] = TILE_TONES[tone] || TILE_TONES.default;
  return (
    <div className={cx("press h-full overflow-hidden rounded-3xl p-4 md:p-5", surface)}>
      <div className="flex items-start justify-between gap-2">
        <p className={cx("text-[13px] font-semibold leading-5 md:text-sm", labelColor)}>{label}</p>
        {Icon && (
          <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", iconBubble)}>
            <Icon size={17} strokeWidth={2} />
          </span>
        )}
      </div>
      <p className={cx("mt-2 font-display text-[1.7rem] font-semibold leading-none tracking-tight md:mt-3 md:text-[2.1rem]", valueColor)}>
        {value}
      </p>
      {note && <p className={cx("mt-2 text-xs", labelColor)}>{note}</p>}
    </div>
  );
}

/* ---------------- Small pieces ---------------- */

export function Avatar({ name, seed, size = 48, className }) {
  const [bg, fg] = avatarColors(seed ?? name);
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        className
      )}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {initials(name)}
    </span>
  );
}

/** An employee's avatar: their colour with white initials. */
export function EmployeeAvatar({ employee, size = 40, className }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        employee?.active === false && "opacity-50",
        className
      )}
      style={{
        width: size,
        height: size,
        background: employeeColor(employee),
        fontSize: Math.round(size * 0.38),
      }}
    >
      {initials(employee?.name || "?")}
    </span>
  );
}

export function ReviewBadge({ needsReview, compact = false }) {
  const { t } = useI18n();
  if (!needsReview && compact) return null;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
        needsReview
          ? "bg-warn-soft text-warn-ink"
          : "bg-sage-soft text-sage-ink"
      )}
    >
      {needsReview ? <TriangleAlert size={12} /> : <CircleCheck size={12} />}
      {needsReview ? t("review.needs") : t("review.ok")}
    </span>
  );
}

export function Chip({ active, children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cx(
        "press h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-semibold",
        active
          ? "bg-cocoa text-white shadow-sm shadow-accent/30"
          : "bg-card text-ink-2 shadow-sm ring-1 ring-line hover:bg-card-2"
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Spinner({ label }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <ButtonDoodle className="h-10 w-10 animate-spin [animation-duration:1.6s] motion-reduce:animate-none" />
      <p className="text-sm text-muted">{label || t("common.loading")}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, help, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <div className="relative flex items-end gap-1">
          <ScissorsDoodle className="mb-1 w-14 -rotate-12 opacity-80" />
          <div className="rounded-full bg-card-2 p-4 text-muted">
            <Icon size={28} strokeWidth={1.5} />
          </div>
          <SpoolDoodle className="w-11 rotate-6 opacity-80" />
          <SparkleDoodle className="absolute -top-2 left-1/2 w-4" />
        </div>
      )}
      <h3 className="mt-4 font-medium text-ink">{title}</h3>
      {help && <p className="mt-1 max-w-sm text-sm text-muted">{help}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBox({ error, onRetry, className }) {
  const { t, tError } = useI18n();
  if (!error) return null;
  return (
    <div
      role="alert"
      className={cx(
        "mx-4 flex flex-col gap-3 rounded-xl border border-danger/20 bg-danger-soft p-4 sm:flex-row sm:items-center sm:justify-between md:mx-0",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <CircleAlert size={19} className="mt-0.5 shrink-0 text-danger" />
        <div>
          <p className="text-sm font-semibold text-danger">
            {t("common.couldNotLoad")}
          </p>
          <p className="mt-1 text-sm text-ink-2">
            {typeof error === "string" ? error : tError(error)}
          </p>
        </div>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

export function Notice({ tone = "success", children, className }) {
  const tones = {
    success: "bg-sage-soft text-sage-ink",
    error: "bg-danger-soft text-danger",
    warn: "bg-warn-soft text-warn-ink",
  };
  const Icon = tone === "success" ? CircleCheck : CircleAlert;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm",
        tones[tone],
        className
      )}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* ---------------- Dialog ---------------- */

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
  tone = "danger",
  children,
}) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => event.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={busy ? undefined : onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="pb-safe relative w-full rounded-t-[2.25rem] bg-card p-6 shadow-2xl sm:max-w-md sm:rounded-[2rem]"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          aria-label={t("common.close")}
          className="absolute right-4 top-4 rounded-full p-2 text-muted hover:bg-card-2"
        >
          <X size={18} />
        </button>
        <div
          className={cx(
            "flex h-11 w-11 items-center justify-center rounded-full",
            tone === "danger" ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent-soft-ink"
          )}
        >
          {tone === "danger" ? <TriangleAlert size={20} /> : <CircleCheck size={20} />}
        </div>
        <h2 id="confirm-title" className="mt-4 text-lg font-semibold text-ink">
          {title}
        </h2>
        {body && <p className="mt-2 text-sm leading-6 text-muted">{body}</p>}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
            {busy && <LoaderCircle size={16} className="animate-spin" />}
            {confirmLabel || t("common.delete")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Language switch ---------------- */

export function LanguageToggle({ className, size = "md" }) {
  const { lang, setLang, t } = useI18n();
  const options = [
    { value: "hi", label: t("lang.hi") },
    { value: "en", label: t("lang.en") },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={t("lang.label")}
      className={cx(
        "inline-flex rounded-full bg-card p-1 shadow-sm ring-1 ring-line",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={lang === option.value}
          onClick={() => setLang(option.value)}
          className={cx(
            "rounded-full font-semibold transition",
            size === "lg" ? "px-5 py-2 text-base" : "px-3.5 py-1.5 text-sm",
            lang === option.value
              ? "bg-cocoa text-white shadow-sm shadow-accent/30"
              : "text-muted hover:text-ink"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
