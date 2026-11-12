"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { History, LoaderCircle } from "lucide-react";
import { getActivity } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { formatDate, formatMoney, friendlyDate, serverTime as localTime, toISODate } from "../lib/orders";
import { Button, EmptyState, EmployeeAvatar, Notice, Spinner } from "./ui";

// Field name -> translation key, for the "what changed" lines.
const FIELD_LABELS = {
  order_number: "field.orderNumber",
  customer_name: "field.customer",
  customer_id: "field.customer",
  additional_info: "field.additional",
  contact_number: "field.contact",
  order_date: "field.orderDate",
  deliver_date: "field.deliverDate",
  what_to_design: "field.design",
  advance_amount: "pay.advance",
  advance_date: "pay.advanceDate",
  estimated_total: "pay.estimate",
  needs_review: "field.needsReview",
  name: "team.name",
  phone: "customers.phone",
  notes: "customers.notes",
  role: "team.role",
  color: "team.color",
  active: "team.active",
  boutique_name: "settings.boutiqueName",
  upi_id: "settings.upiId",
  address: "settings.address",
  bill_note: "settings.billNote",
  status: "stage.label",
  skills: "team.skills",
  title: "content.titleLabel",
  brief: "content.brief",
  platforms: "content.platforms",
  format: "content.format",
  scheduled_for: "content.when",
  posted_url: "content.postedLink",
  ok_to_post: "content.okToPost",
  order_id: "content.order",
  assigned_to: "content.who",
  trial_date: "field.trialDate",
  due_date: "work.due",
  employee_id: "work.who",
  task: "work.what",
  note: "work.note",
};

const MONEY = new Set(["advance_amount", "estimated_total"]);
// Ids that mean nothing to a person: show just "changed".
const HIDDEN_VALUES = new Set(["customer_id", "employee_id", "order_id", "assigned_to"]);
// Task statuses share the "status" field name with order stages.
const STATUS_KEYS = { assigned: "taskStatus.assigned", in_progress: "taskStatus.in_progress", done: "taskStatus.done" };
const DATES = new Set(["order_date", "deliver_date", "advance_date", "trial_date", "due_date"]);

function formatValue(field, value, t, locale, entity) {
  if (value === null || value === undefined || value === "") return "—";
  if (MONEY.has(field)) return formatMoney(Number(value), locale);
  if (DATES.has(field)) return formatDate(value, locale);
  if (field === "role") return t(`role.${value}`);
  if (field === "status" && entity === "content") return t(`contentStage.${value}`);
  if (field === "status") return t(value in STATUS_KEYS ? STATUS_KEYS[value] : `stage.${value}`);
  if (field === "format") return t(`format.${value}`);
  if (field === "scheduled_for") {
    return new Date(value).toLocaleString(locale, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  }
  if (field === "platforms") {
    try {
      return JSON.parse(value).map((p) => t(`platform.${p}`)).join(", ") || "—";
    } catch {
      return String(value);
    }
  }
  if (field === "task") return t(`task.${value}`);
  if (field === "skills") {
    try {
      const list = JSON.parse(value);
      return list.length ? list.map((skill) => t(`task.${skill}`)).join(", ") : "—";
    } catch {
      return String(value);
    }
  }
  if (typeof value === "boolean") return value ? t("common.yes") : t("common.no");
  const text = String(value);
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

/** Turns a log entry into a sentence + link. */
export function describe(entry, t, locale, meId) {
  const actor = entry.actor
    ? entry.actor.id === meId
      ? t("team.you")
      : entry.actor.name
    : entry.action === "pushed"
      ? t("act.system")
      : t("activity.someone");
  const d = entry.details || {};
  let key = `act.${entry.entity}.${entry.action}`;
  if (entry.entity === "order" && entry.action === "created" && d.source === "upload") key += ".upload";
  const vars = {
    actor,
    label: entry.label || "",
    merged: d.merged_name || "",
    amount: d.amount_due != null ? formatMoney(d.amount_due, locale) : formatMoney(d.amount ?? 0, locale),
    role: d.role ? t(`role.${d.role}`) : "",
    task: d.task ? t(`task.${d.task}`) : "",
    employee: d.employee || t("work.noPerson"),
  };
  const translated = t(key, vars);
  let text = translated === key ? `${actor}: ${entry.entity} ${entry.action} ${entry.label || ""}` : translated;
  if (d.automatic) text = `${text} ${t("act.auto")}`;

  let href = null;
  if (entry.action !== "deleted" && entry.entity_id) {
    if (entry.entity === "order") href = `/orders/${entry.entity_id}`;
    if (entry.entity === "customer") href = `/customers/${entry.entity_id}`;
    if (entry.entity === "bill") href = `/bills/${entry.entity_id}`;
    if (entry.entity === "employee") href = "/team";
    if (entry.entity === "task" && d.order_id) href = `/orders/${d.order_id}`;
    if (entry.entity === "content") href = `/content/${entry.entity_id}`;
  }

  const changes = Object.entries(d.changes || {}).map(([field, [before, after]]) => ({
    field,
    label: FIELD_LABELS[field] ? t(FIELD_LABELS[field]) : field,
    before: HIDDEN_VALUES.has(field) ? null : formatValue(field, before, t, locale, entry.entity),
    after: HIDDEN_VALUES.has(field) ? null : formatValue(field, after, t, locale, entry.entity),
  }));

  return { text, href, changes };
}

function Entry({ entry, meId }) {
  const { t, locale } = useI18n();
  const { text, href, changes } = describe(entry, t, locale, meId);
  const time = localTime(entry.created_at);

  const body = (
    <>
      <p className="text-[15px] leading-6 text-ink">{text}</p>
      {changes.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-[13px] text-ink-2">
          {changes.map((change) => (
            <li key={change.field}>
              <span className="text-muted">{change.label}:</span>{" "}
              {change.before !== null ? (
                <>
                  <span className="line-through decoration-muted/60">{change.before}</span> → {change.after}
                </>
              ) : (
                "✓"
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-0.5 text-xs text-muted">
        {time.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
      </p>
    </>
  );

  return (
    <li className="flex gap-3 px-4 py-3 md:px-5">
      {entry.actor ? (
        <EmployeeAvatar employee={entry.actor} size={36} />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card-2 text-muted">
          <History size={17} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        {href ? (
          <Link href={href} className="block hover:opacity-80">
            {body}
          </Link>
        ) : (
          body
        )}
      </div>
    </li>
  );
}

/**
 * Activity entries, newest first, grouped by day like a chat.
 * Filters: entity / entityId (history of one order or customer), actorId.
 */
export default function ActivityList({ entity, entityId, actorId, meId, pageSize = 40 }) {
  const { t, locale, tError } = useI18n();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    (beforeId) => getActivity({ entity, entityId, actorId, beforeId, limit: pageSize }),
    [entity, entityId, actorId, pageSize]
  );

  useEffect(() => {
    let cancelled = false;
    load()
      .then((rows) => {
        if (cancelled) return;
        setEntries(rows);
        setMore(rows.length === pageSize);
      })
      .catch((err) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, [load, pageSize]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const rows = await load(entries[entries.length - 1].id);
      setEntries((prev) => [...prev, ...rows]);
      setMore(rows.length === pageSize);
    } catch (err) {
      setError(err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (error) return <Notice tone="error" className="mx-4 md:mx-0">{tError(error)}</Notice>;
  if (!entries) return <Spinner />;
  if (entries.length === 0) return <EmptyState icon={History} title={t("activity.empty")} />;

  const rows = entries.map((entry, index) => {
    const day = localTime(entry.created_at);
    const previous = index > 0 ? localTime(entries[index - 1].created_at) : null;
    return { entry, day, showDay: !previous || toISODate(day) !== toISODate(previous) };
  });

  return (
    <div>
      <ul>
        {rows.map(({ entry, day, showDay }) => (
          <Fragment key={entry.id}>
            {showDay && (
              <li className="bg-card-2 px-4 py-1.5 text-xs font-semibold text-muted md:px-5">
                {friendlyDate(day, t, locale)}
              </li>
            )}
            <Entry entry={entry} meId={meId} />
          </Fragment>
        ))}
      </ul>
      {more && (
        <div className="p-4 text-center">
          <Button variant="secondary" size="sm" onClick={loadMore} disabled={loadingMore}>
            {loadingMore && <LoaderCircle size={15} className="animate-spin" />}
            {t("activity.loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
