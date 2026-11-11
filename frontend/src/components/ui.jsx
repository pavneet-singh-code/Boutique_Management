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

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/* ---------------- Buttons ---------------- */

const buttonVariants = {
  primary:
    "bg-accent text-white hover:bg-accent-hover shadow-sm disabled:opacity-50",
  secondary:
    "border border-line bg-card text-ink-2 hover:bg-card-2 disabled:opacity-50",
  danger: "bg-danger text-white hover:opacity-90 disabled:opacity-50",
  ghost: "text-ink-2 hover:bg-card-2 disabled:opacity-50",
};

export function buttonClass(variant = "primary", size = "md") {
  const sizes = {
    sm: "h-9 px-3 text-sm rounded-full md:rounded-lg",
    md: "h-11 px-5 text-[15px] rounded-full md:rounded-xl md:text-sm",
    lg: "h-12 px-6 text-base rounded-full md:rounded-xl",
  };
  return cx(
    "inline-flex items-center justify-center gap-2 font-medium transition disabled:cursor-not-allowed",
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
        "rounded-2xl border border-line bg-card md:shadow-sm",
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
        <h2 className="text-[15px] font-semibold text-ink md:font-serif md:text-xl md:font-normal">
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-ink">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink md:text-4xl">
          {title}
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

export function StatTile({ label, value, note, icon: Icon, tone = "default" }) {
  return (
    <div
      className={cx(
        "rounded-2xl border p-4 md:p-5",
        tone === "accent"
          ? "border-transparent bg-accent-soft"
          : "border-line bg-card md:shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] leading-5 text-muted md:text-sm">{label}</p>
        {Icon && (
          <span className="hidden rounded-xl bg-accent-soft p-2.5 text-accent-ink md:block">
            <Icon size={18} strokeWidth={1.8} />
          </span>
        )}
      </div>
      <p className="mt-1 text-xl font-semibold tracking-tight text-ink md:mt-2 md:text-2xl">
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
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

export function ReviewBadge({ needsReview, compact = false }) {
  const { t } = useI18n();
  if (!needsReview && compact) return null;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
        needsReview
          ? "bg-warn-soft text-warn-ink"
          : "bg-accent-soft text-accent-soft-ink"
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
        "h-8 shrink-0 whitespace-nowrap rounded-full px-3.5 text-sm transition",
        active
          ? "bg-accent-soft font-medium text-accent-soft-ink"
          : "bg-card-2 text-muted hover:text-ink"
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
      <LoaderCircle size={26} className="animate-spin text-accent" />
      <p className="text-sm text-muted">{label || t("common.loading")}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, help, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <div className="rounded-full bg-card-2 p-4 text-muted">
          <Icon size={28} strokeWidth={1.5} />
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
    success: "bg-accent-soft text-accent-soft-ink",
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
        className="pb-safe relative w-full rounded-t-3xl bg-card p-6 shadow-2xl sm:max-w-md sm:rounded-2xl"
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
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger">
          <TriangleAlert size={20} />
        </div>
        <h2 id="confirm-title" className="mt-4 text-lg font-semibold text-ink">
          {title}
        </h2>
        {body && <p className="mt-2 text-sm leading-6 text-muted">{body}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
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
        "inline-flex rounded-full border border-line bg-card-2 p-1",
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
            "rounded-full font-medium transition",
            size === "lg" ? "px-5 py-2 text-base" : "px-3.5 py-1.5 text-sm",
            lang === option.value
              ? "bg-card text-ink shadow-sm"
              : "text-muted hover:text-ink"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
