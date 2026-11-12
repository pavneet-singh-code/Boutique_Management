"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CircleCheck,
  Clapperboard,
  ExternalLink,
  Images,
  LoaderCircle,
  Save,
  Smartphone,
  Trash2,
  Video,
} from "lucide-react";
import { createContent, deleteContent, getEmployeeDirectory, updateContent } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { clean, displayName, formatDate } from "../lib/orders";
import { useCan, useMe } from "../lib/roles";
import { useOrders } from "../lib/useOrders";
import { useResource } from "../lib/useResource";
import { Button, Card, ConfirmDialog, EmployeeAvatar, Notice, cx } from "./ui";
import { StageChip } from "./Work";

export const PLATFORMS = ["instagram", "facebook", "youtube", "whatsapp_status"];
export const FORMATS = ["reel", "post", "carousel", "story", "short"];
export const CONTENT_STAGES = ["idea", "planned", "shooting", "editing", "ready_to_post", "posted"];

// Platform colours are kept apart from employee and status colours, and every
// badge carries a short name, so colour is never the only signal.
const PLATFORM_STYLE = {
  instagram: { code: "IG", className: "bg-[#fce7f3] text-[#9d174d]" },
  facebook: { code: "FB", className: "bg-[#dbeafe] text-[#1e3a8a]" },
  youtube: { code: "YT", className: "bg-[#fde2e1] text-[#8f1d18]" },
  whatsapp_status: { code: "WA", className: "bg-[#dcf8e6] text-[#14532d]" },
};

const FORMAT_ICON = { reel: Clapperboard, post: Images, carousel: Images, story: Smartphone, short: Video };

/** Content times are boutique local time, sent without a zone. */
export function contentDate(value) {
  return value ? new Date(value) : null;
}

export function toLocalInput(value) {
  const date = contentDate(value);
  if (!date) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isLateContent(item) {
  const when = contentDate(item.scheduled_for);
  return Boolean(when) && !["idea", "posted"].includes(item.status) && when < new Date();
}

/* ---------------- Small pieces ---------------- */

export function PlatformBadges({ platforms = [], full = false }) {
  const { t } = useI18n();
  return (
    <span className="flex flex-wrap gap-1">
      {platforms.map((platform) => (
        <span
          key={platform}
          title={t(`platform.${platform}`)}
          className={cx("rounded-md px-1.5 py-px text-[10.5px] font-bold", PLATFORM_STYLE[platform]?.className)}
        >
          {full ? t(`platform.${platform}`) : PLATFORM_STYLE[platform]?.code}
        </span>
      ))}
    </span>
  );
}

const STAGE_TONE = {
  idea: "bg-card-2 text-ink-2",
  planned: "bg-[#e6effb] text-[#1e4f91]",
  shooting: "bg-[#efe7fb] text-[#5b21b6]",
  editing: "bg-[#efe7fb] text-[#5b21b6]",
  ready_to_post: "bg-warn-soft text-warn-ink",
  posted: "bg-accent-soft text-accent-soft-ink",
};

export function ContentStageChip({ status }) {
  const { t } = useI18n();
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", STAGE_TONE[status])}>
      {status === "posted" && <CircleCheck size={12} />}
      {t(`contentStage.${status}`)}
    </span>
  );
}

/** "No post yet" / "Post planned" / "Posted ✓" on an order. */
export function ReelBadge({ content = [] }) {
  const { t } = useI18n();
  if (!content.length) return null;
  const posted = content.find((item) => item.status === "posted");
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        posted ? "bg-[#fce7f3] text-[#9d174d]" : "bg-card-2 text-ink-2"
      )}
    >
      <Clapperboard size={12} />
      {posted ? t("content.postedBadge") : t("content.planned")}
    </span>
  );
}

/* ---------------- One post in the plan ---------------- */

export function ContentCard({ item, showDate = false }) {
  const { t, locale } = useI18n();
  const Icon = FORMAT_ICON[item.format] || Clapperboard;
  const when = contentDate(item.scheduled_for);
  const late = isLateContent(item);
  return (
    <li>
      <Link href={`/content/${item.id}`} className="flex items-start gap-3 px-4 py-3 transition hover:bg-card-2 md:px-5">
        <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", late ? "bg-danger-soft text-danger" : "bg-card-2 text-ink-2")}>
          <Icon size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[15.5px] font-medium text-ink">{item.title}</p>
            <span className={cx("shrink-0 text-xs", late ? "font-semibold text-danger" : "text-muted")}>
              {when
                ? showDate
                  ? when.toLocaleString(locale, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
                  : when.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })
                : t("content.unscheduled")}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <ContentStageChip status={item.status} />
            <span className="text-xs text-muted">{t(`format.${item.format}`)}</span>
            <PlatformBadges platforms={item.platforms} />
            {late && <span className="text-[11px] font-semibold text-danger">· {t("content.late")}</span>}
          </div>
          {item.order && (
            <p className="mt-1 truncate text-xs text-muted">
              #{item.order.order_number || item.order.id} · {item.order.customer_name || ""}
            </p>
          )}
        </div>
        {item.person && <EmployeeAvatar employee={item.person} size={28} />}
      </Link>
    </li>
  );
}

/* ---------------- Add / edit form ---------------- */

const inputClass =
  "mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 text-[16px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 md:text-sm";

export function ContentForm({ item, presetOrderId, presetDate, onSaved }) {
  const { t, tError } = useI18n();
  const me = useMe();
  const isOwner = me?.role === "owner";
  const canEditDetails = !item || isOwner || (item.status === "idea" && item.creator?.id === me?.id);
  const { orders } = useOrders();
  const peopleLoader = useCallback(() => getEmployeeDirectory(), []);
  const { data: people } = useResource(peopleLoader, isOwner);

  const [form, setForm] = useState(() => ({
    title: item?.title || "",
    brief: item?.brief || "",
    platforms: item?.platforms || ["instagram"],
    format: item?.format || "reel",
    order_id: item?.order_id ?? (presetOrderId ? Number(presetOrderId) : null),
    assigned_to: item?.person?.id ?? null,
    scheduled_for: item ? toLocalInput(item.scheduled_for) : presetDate || "",
  }));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const orderChoices = useMemo(() => {
    const rank = { ready: 0, in_work: 1, received: 2, delivered: 3, cancelled: 4 };
    return [...orders].sort((a, b) => (rank[a.status] ?? 5) - (rank[b.status] ?? 5) || b.id - a.id).slice(0, 80);
  }, [orders]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const togglePlatform = (platform) =>
    set("platforms", form.platforms.includes(platform) ? form.platforms.filter((p) => p !== platform) : [...form.platforms, platform]);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const payload = {
      ...form,
      title: form.title.trim(),
      brief: form.brief || null,
      scheduled_for: form.scheduled_for || null,
    };
    try {
      const saved = item ? await updateContent(item.id, payload) : await createContent(payload);
      setMessage({ tone: "success", text: t("content.saved") });
      onSaved?.(saved);
    } catch (err) {
      setMessage({ tone: "error", text: tError(err) });
    } finally {
      setBusy(false);
    }
  };

  if (!canEditDetails) {
    return <Notice tone="warn">{t("content.ownerOnly")}</Notice>;
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <label className="block">
        <span className="text-[13px] font-medium text-ink-2">{t("content.titleLabel")}</span>
        <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder={t("content.titlePlaceholder")} required className={`${inputClass} h-12 md:h-11`} />
      </label>
      <div>
        <span className="text-[13px] font-medium text-ink-2">{t("content.format")}</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {FORMATS.map((format) => (
            <button
              key={format}
              type="button"
              aria-pressed={form.format === format}
              onClick={() => set("format", format)}
              className={cx("h-9 rounded-full px-3.5 text-sm transition", form.format === format ? "bg-accent font-medium text-white" : "bg-card-2 text-ink-2")}
            >
              {t(`format.${format}`)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="text-[13px] font-medium text-ink-2">{t("content.platforms")}</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => (
            <button
              key={platform}
              type="button"
              role="checkbox"
              aria-checked={form.platforms.includes(platform)}
              onClick={() => togglePlatform(platform)}
              className={cx(
                "h-9 rounded-full border px-3.5 text-sm transition",
                form.platforms.includes(platform) ? "border-accent bg-accent-soft font-medium text-accent-soft-ink" : "border-line bg-card text-ink-2"
              )}
            >
              {form.platforms.includes(platform) ? "✓ " : ""}
              {t(`platform.${platform}`)}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="text-[13px] font-medium text-ink-2">{t("content.when")}</span>
        <input type="datetime-local" value={form.scheduled_for} onChange={(e) => set("scheduled_for", e.target.value)} className={`${inputClass} h-12 md:h-11`} />
        {!isOwner && <span className="mt-1 block text-xs text-muted">{t("content.ideaNote")}</span>}
      </label>
      <label className="block">
        <span className="text-[13px] font-medium text-ink-2">{t("content.order")}</span>
        <select
          value={form.order_id ?? ""}
          onChange={(e) => set("order_id", e.target.value ? Number(e.target.value) : null)}
          className={`${inputClass} h-12 md:h-11`}
        >
          <option value="">{t("content.orderNone")}</option>
          {orderChoices.map((order) => (
            <option key={order.id} value={order.id}>
              #{clean(order.order_number) || order.id} · {displayName(order, t)} · {clean(order.what_to_design).slice(0, 30) || "—"}
            </option>
          ))}
        </select>
      </label>
      {isOwner && (
        <div>
          <span className="text-[13px] font-medium text-ink-2">{t("content.who")}</span>
          <div className="no-scrollbar -mx-1 mt-1.5 flex gap-2 overflow-x-auto px-1 pb-1">
            {(people || [])
              .filter((person) => person.active && person.role !== "worker")
              .sort((a, b) => (b.role === "social_media") - (a.role === "social_media"))
              .map((person) => (
                <button
                  key={person.id}
                  type="button"
                  aria-pressed={form.assigned_to === person.id}
                  onClick={() => set("assigned_to", form.assigned_to === person.id ? null : person.id)}
                  className={cx(
                    "flex w-20 shrink-0 flex-col items-center rounded-2xl border-2 bg-card px-2 py-2 text-center",
                    form.assigned_to === person.id ? "border-accent" : "border-line"
                  )}
                >
                  <EmployeeAvatar employee={person} size={34} />
                  <span className="mt-1 w-full truncate text-xs text-ink">{person.name}</span>
                </button>
              ))}
          </div>
        </div>
      )}
      <label className="block">
        <span className="text-[13px] font-medium text-ink-2">{t("content.brief")}</span>
        <textarea rows={3} value={form.brief} onChange={(e) => set("brief", e.target.value)} className={`${inputClass} py-3 leading-6`} />
      </label>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <Button type="submit" size="lg" disabled={busy || !form.title.trim()} className="w-full md:w-auto">
        {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={18} />}
        {t("content.save")}
      </Button>
    </form>
  );
}

/* ---------------- Moving a post along its stages ---------------- */

export function StageStepper({ item, onChanged }) {
  const { t, tError } = useI18n();
  const router = useRouter();
  const me = useMe();
  const canEdit = useCan("contentEdit");
  const isOwner = me?.role === "owner";
  const [link, setLink] = useState(item.posted_url || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const index = CONTENT_STAGES.indexOf(item.status);
  const next = CONTENT_STAGES[index + 1];
  const canMove = canEdit && (isOwner || item.status !== "idea");
  const canDelete = isOwner || (item.status === "idea" && item.creator?.id === me?.id);

  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      const result = await action();
      if (result?.id) onChanged?.(result);
      return result;
    } catch (err) {
      setError(tError(err));
      return null;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-4 p-4 md:p-5">
      <div>
        <p className="text-[13px] font-medium text-ink-2">{t("content.stage")}</p>
        <ol className="mt-2 flex flex-wrap gap-1.5">
          {CONTENT_STAGES.map((stage, i) => (
            <li key={stage}>
              <button
                type="button"
                disabled={!canMove || busy || stage === "idea" || (stage === "planned" && !isOwner && item.status === "idea")}
                onClick={() => run(() => updateContent(item.id, { status: stage }))}
                aria-pressed={item.status === stage}
                className={cx(
                  "h-8 rounded-full px-3 text-[13px] transition disabled:cursor-default",
                  item.status === stage ? "bg-ink font-semibold text-white" : i < index ? "bg-accent-soft text-accent-soft-ink" : "bg-card-2 text-ink-2"
                )}
              >
                {i < index ? "✓ " : ""}
                {t(`contentStage.${stage}`)}
              </button>
            </li>
          ))}
        </ol>
      </div>

      {canMove && next && next !== "posted" && (item.status !== "idea" || isOwner) && (
        <Button size="lg" className="w-full md:w-auto" disabled={busy || (item.status === "idea" && !item.scheduled_for)} onClick={() => run(() => updateContent(item.id, { status: next }))}>
          <ArrowRight size={18} />
          {t("content.moveTo", { stage: t(`contentStage.${next}`) })}
        </Button>
      )}

      {canMove && item.status !== "idea" && (
        <div className="space-y-2">
          <label className="block">
            <span className="text-[13px] font-medium text-ink-2">{t("content.postedLink")}</span>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder={t("content.postedLinkPlaceholder")} inputMode="url" className={`${inputClass} h-12 md:h-11`} />
          </label>
          {item.status !== "posted" ? (
            <Button disabled={busy} onClick={() => run(() => updateContent(item.id, { status: "posted", posted_url: link || null }))}>
              <CircleCheck size={16} />
              {t("content.moveTo", { stage: t("contentStage.posted") })}
            </Button>
          ) : (
            link !== (item.posted_url || "") && (
              <Button variant="secondary" disabled={busy} onClick={() => run(() => updateContent(item.id, { posted_url: link || null }))}>
                <Save size={16} />
                {t("content.save")}
              </Button>
            )
          )}
        </div>
      )}

      {item.posted_url && (
        <a href={item.posted_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink">
          <ExternalLink size={15} />
          {t("content.openPost")}
        </a>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      {canDelete && (
        <div className="border-t border-line pt-3">
          <Button variant="ghost" size="sm" className="text-danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} />
            {t("content.delete")}
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete}
        title={t("content.deleteTitle")}
        body={item.title}
        confirmLabel={t("content.delete")}
        busy={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          const ok = await run(() => deleteContent(item.id).then(() => ({ deleted: true })));
          if (ok) router.replace("/content");
        }}
      />
    </Card>
  );
}

/* ---------------- Ready to shoot ---------------- */

export function ReadyToShoot({ orders }) {
  const { t, locale } = useI18n();
  const canEdit = useCan("contentEdit");
  if (!orders?.length) return null;
  return (
    <section>
      <div className="mb-2 px-4 md:px-0">
        <h2 className="text-[15px] font-semibold text-ink md:font-serif md:text-xl md:font-normal">
          🎬 {t("content.readyToShoot")} ({orders.length})
        </h2>
        <p className="text-xs text-muted">{t("content.readyToShootHelp")}</p>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 md:px-0">
        {orders.map((order) => (
          <div key={order.id} className="w-60 shrink-0 rounded-2xl border border-line bg-card p-3.5 shadow-sm">
            <p className="truncate text-[15px] font-semibold text-ink">{order.customer_name || "—"}</p>
            <p className="truncate text-sm text-muted">
              #{order.order_number || order.id} · {clean(order.what_to_design) || "—"}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <StageChip status={order.status} step={order.current_step} />
              {order.deliver_date && (
                <span className="text-xs text-muted">🚚 {formatDate(order.deliver_date, locale, { day: "numeric", month: "short" })}</span>
              )}
            </div>
            {canEdit && (
              <Link
                href={`/content/new?order=${order.id}`}
                className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded-full bg-accent text-sm font-medium text-white"
              >
                <Clapperboard size={15} />
                {t("content.planPost")}
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
