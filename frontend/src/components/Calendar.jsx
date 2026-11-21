"use client";

import Link from "next/link";
import { BriefcaseBusiness, Ruler, TriangleAlert, Truck } from "lucide-react";
import { orderPath } from "../lib/api";
import { monthGrid, weekdayNames } from "../lib/calendar";
import { useI18n } from "../lib/i18n";
import { clean, daysBetween, displayName, toISODate } from "../lib/orders";
import { daysPushed } from "../lib/work";
import { EmployeeAvatar, cx } from "./ui";
import { LateChip, ProgressBar, PushedChip, StageChip } from "./Work";
import { CoverThumb } from "./Photos";
import { isUnfinished } from "../lib/photos";
import { NO_PERSON_COLOR, employeeColor } from "../lib/colors";

/* ---------------- One calendar item ---------------- */

function ItemIcon({ item }) {
  if (item.kind === "step") {
    return item.employee ? (
      <EmployeeAvatar employee={item.employee} size={40} />
    ) : (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line text-xs text-muted">
        ?
      </span>
    );
  }
  const Icon = item.kind === "delivery" ? Truck : Ruler;
  return (
    <span
      className={cx(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
        item.kind === "delivery"
          ? item.late
            ? "bg-danger-soft text-danger"
            : "bg-accent-soft text-accent-soft-ink"
          : "bg-warn-soft text-warn-ink"
      )}
    >
      <Icon size={19} />
    </span>
  );
}

export function CalendarItem({ item, linkOrders }) {
  const { t } = useI18n();
  const order = item.order;
  const name = displayName(order, t);
  const title =
    item.kind === "step"
      ? `${t(`task.${item.task.task}`)}${item.employee ? ` · ${item.employee.name}` : ` · ${t("work.noPerson")}`}`
      : item.kind === "delivery"
        ? t("cal.delivery")
        : t("cal.trial");

  const body = (
    <>
      <ItemIcon item={item} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[15.5px] font-medium text-ink">{title}</p>
          <span className="flex shrink-0 items-center gap-1">
            {item.kind === "delivery" && item.late && <LateChip />}
            {item.kind === "step" && daysPushed(item.task) > 0 && <PushedChip task={item.task} />}
          </span>
        </div>
        <p className="truncate text-sm text-muted">
          #{clean(order.order_number) || order.id} · {name}
          {clean(order.what_to_design) ? ` · ${clean(order.what_to_design)}` : ""}
        </p>
        {item.kind !== "step" && order.status && (
          <div className="mt-1 flex items-center gap-2">
            <StageChip status={order.status} step={order.current_step} />
            {(order.tasks || []).length > 0 && <ProgressBar value={order.progress ?? 0} className="w-24" />}
          </div>
        )}
      </div>
      {/* While the suit is being made, show what it should look like. */}
      {isUnfinished(order) && <CoverThumb photos={order.photos} size={48} />}
    </>
  );

  const className = "flex items-center gap-3 px-4 py-3 transition md:px-5";
  return (
    <li>
      {linkOrders ? (
        <Link href={orderPath(order)} className={cx(className, "hover:bg-card-2")}>
          {body}
        </Link>
      ) : (
        <Link href="/my-work" className={cx(className, "hover:bg-card-2")}>
          {body}
        </Link>
      )}
    </li>
  );
}

export function DayList({ items, linkOrders }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <CalendarItem key={item.key} item={item} linkOrders={linkOrders} />
      ))}
    </ul>
  );
}

/* ---------------- Month grid ---------------- */

export function MonthGrid({ monthKey, days, selected, onSelect }) {
  const { locale } = useI18n();
  const weeks = monthGrid(monthKey);
  const month = Number(monthKey.split("-")[1]) - 1;
  const todayIso = toISODate(new Date());
  const byIso = new Map(days.map((day) => [day.iso, day]));

  return (
    <div className="select-none">
      <div className="grid grid-cols-7 border-b border-line pb-1 text-center text-[11px] font-semibold uppercase text-muted">
        {weekdayNames(locale).map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {weeks.flat().map((date) => {
          const iso = toISODate(date);
          const day = byIso.get(iso);
          const items = day?.items || [];
          const inMonth = date.getMonth() === month;
          const hasLate = items.some((item) => item.late);
          const deliveries = items.filter((item) => item.kind === "delivery").length;
          const trials = items.filter((item) => item.kind === "trial").length;
          const steps = items.filter((item) => item.kind === "step");
          const colors = [...new Map(steps.map((s) => [s.employee?.id ?? "none", s.employee ? employeeColor(s.employee) : NO_PERSON_COLOR])).values()];
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              aria-pressed={selected === iso}
              aria-label={date.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
              className={cx(
                "flex min-h-[64px] flex-col items-center gap-1 rounded-xl px-0.5 py-1.5 text-center transition md:min-h-[88px]",
                selected === iso ? "bg-accent-soft" : "hover:bg-card-2",
                !inMonth && "opacity-40",
                hasLate && "ring-2 ring-inset ring-danger/60"
              )}
            >
              <span
                className={cx(
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                  iso === todayIso ? "bg-accent font-bold text-white" : "text-ink"
                )}
              >
                {date.getDate()}
              </span>
              <span className="flex flex-wrap justify-center gap-0.5">
                {deliveries > 0 && (
                  <span className="rounded bg-accent-soft px-1 text-[10px] font-semibold leading-4 text-accent-soft-ink">
                    🚚{deliveries > 1 ? deliveries : ""}
                  </span>
                )}
                {trials > 0 && (
                  <span className="rounded bg-warn-soft px-1 text-[10px] font-semibold leading-4 text-warn-ink">
                    📏{trials > 1 ? trials : ""}
                  </span>
                )}
              </span>
              {colors.length > 0 && (
                <span className="flex flex-wrap justify-center gap-0.5">
                  {colors.slice(0, 4).map((color) => (
                    <span key={color} className="h-2 w-2 rounded-full" style={{ background: color }} />
                  ))}
                  {colors.length > 4 && <span className="text-[9px] leading-2 text-muted">+</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Late block for the list view ---------------- */

export function LateBlock({ items, linkOrders }) {
  const { t } = useI18n();
  if (!items.length) return null;
  return (
    <section className="mx-3 overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-danger/20 md:mx-0">
      <h2 className="flex items-center gap-2 bg-danger-soft px-4 py-2 text-sm font-semibold text-danger md:px-5">
        <TriangleAlert size={15} />
        {t("cal.late")} ({items.length})
        <span className="font-normal opacity-80">· {t("cal.lateHelp")}</span>
      </h2>
      <DayList items={items} linkOrders={linkOrders} />
    </section>
  );
}

export function DayHeading({ date }) {
  const { t, locale } = useI18n();
  const diff = daysBetween(new Date(), date);
  const full = date.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
  // "Today" / "Tomorrow" in front; other days just show their full date.
  const label = diff === 0 ? t("common.today") : diff === 1 ? t("common.tomorrow") : null;
  return (
    <h2 className="bg-card-2 px-4 py-1.5 text-xs font-semibold text-ink-2 md:px-5">
      {label ? `${label} · ${full}` : full}
    </h2>
  );
}

/* ---------------- Week board (columns = days, rows = kinds) ---------------- */

/** Sunday of the week that contains `date`. */
export function weekStartOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
}

const WEEK_ROWS = [
  { kind: "delivery", label: "cal.deliveries", icon: Truck },
  { kind: "trial", label: "cal.trials", icon: Ruler },
  { kind: "step", label: "cal.steps", icon: BriefcaseBusiness },
];

/** One card in the week board: a soft colour with a strong left edge. */
function WeekCard({ item, linkOrders }) {
  const { t } = useI18n();
  const order = item.order;
  const number = clean(order.order_number) || order.id;
  const design = clean(order.what_to_design);
  const pushed = item.kind === "step" ? daysPushed(item.task) : 0;

  let edge;
  let surface;
  let labelColor;
  if (item.kind === "step") {
    edge = item.employee ? employeeColor(item.employee) : NO_PERSON_COLOR;
    surface = { background: `${edge}1f` }; // the person's colour, very light
    labelColor = { color: edge };
  } else {
    const tone =
      item.kind === "trial"
        ? ["var(--warn)", "var(--warn-soft)", "var(--warn-ink)"]
        : item.late
          ? ["var(--danger)", "var(--danger-soft)", "var(--danger)"]
          : ["var(--accent)", "var(--accent-soft)", "var(--accent-ink)"];
    edge = tone[0];
    surface = { background: tone[1] };
    labelColor = { color: tone[2] };
  }

  const title =
    item.kind === "step" ? t(`task.${item.task.task}`) : item.kind === "delivery" ? t("cal.delivery") : t("cal.trial");

  return (
    <Link
      href={linkOrders ? orderPath(order) : "/my-work"}
      className="press block rounded-2xl p-2.5 text-left shadow-sm ring-1 ring-white/70"
      style={{ ...surface, borderLeft: `4px solid ${edge}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {item.kind === "step" && (
            <span className="mb-1 flex items-center gap-1.5">
              {item.employee ? (
                <EmployeeAvatar employee={item.employee} size={22} />
              ) : (
                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-dashed border-muted/50 text-[10px] text-muted">
                  ?
                </span>
              )}
              <span className="truncate text-[13px] font-bold text-ink">
                {item.employee ? item.employee.name : t("work.noPerson")}
              </span>
            </span>
          )}
          <p className="text-[12.5px] font-bold" style={labelColor}>
            {title}
          </p>
        </div>
        {isUnfinished(order) && <CoverThumb photos={order.photos} size={34} />}
      </div>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[12px] leading-snug text-ink-2 marker:text-muted">
        <li className="truncate">
          #{number} · {displayName(order, t)}
        </li>
        {design && <li className="line-clamp-2">{design}</li>}
      </ul>
      {(item.late || pushed > 0) && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {item.kind === "delivery" && item.late && <LateChip />}
          {pushed > 0 && <PushedChip task={item.task} />}
        </div>
      )}
    </Link>
  );
}

/**
 * A week at a glance: one column per day, one row per kind (deliveries,
 * trials, work). Past days are hatched and today is highlighted.
 * Orders have dates but no times, so the rows are kinds instead of hours.
 */
export function WeekBoard({ items, start, kinds, linkOrders }) {
  const { t, locale } = useI18n();
  const todayIso = toISODate(new Date());
  const days = Array.from(
    { length: 7 },
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  ).map((date) => ({ date, iso: toISODate(date) }));

  const cells = new Map();
  for (const item of items) {
    const key = `${item.kind}|${item.iso}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(item);
  }
  const rows = WEEK_ROWS.filter((row) => kinds.includes(row.kind));
  const empty = days.every((day) => rows.every((row) => !cells.has(`${row.kind}|${day.iso}`)));

  return (
    <div className="mx-3 overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-white md:mx-0">
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[880px] md:min-w-[1000px]"
          style={{ gridTemplateColumns: "5.25rem repeat(7, minmax(7.75rem, 1fr))" }}
        >
          {/* Header row */}
          <div className="sticky left-0 z-10 border-b border-r border-line bg-card" />
          {days.map(({ date, iso }) => {
            const isToday = iso === todayIso;
            return (
              <div
                key={iso}
                className={cx(
                  "relative border-b border-r border-line px-2 py-3 text-center text-sm last:border-r-0",
                  isToday ? "bg-accent-soft/50 font-bold text-accent-ink" : "font-semibold text-ink-2"
                )}
              >
                {date.toLocaleDateString(locale, { weekday: "long" })},{" "}
                {date.toLocaleDateString(locale, { day: "2-digit" })}
                {isToday && (
                  <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-accent" aria-hidden="true" />
                )}
              </div>
            );
          })}

          {/* One row per kind */}
          {rows.map((row) => {
            const Icon = row.icon;
            return [
              <div
                key={`${row.kind}-label`}
                className="sticky left-0 z-10 flex flex-col items-center justify-start gap-1 border-b border-r border-line bg-card px-2 py-4 text-center"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card-2 text-accent-ink">
                  <Icon size={17} />
                </span>
                <span className="text-xs font-bold text-ink-2">{t(row.label)}</span>
              </div>,
              ...days.map(({ iso }) => {
                const list = cells.get(`${row.kind}|${iso}`) || [];
                return (
                  <div
                    key={`${row.kind}-${iso}`}
                    className={cx(
                      "min-h-28 space-y-2 border-b border-r border-line p-2 last:border-r-0",
                      iso < todayIso && "hatch",
                      iso === todayIso && "bg-accent-soft/25"
                    )}
                  >
                    {list.map((item) => (
                      <WeekCard key={item.key} item={item} linkOrders={linkOrders} />
                    ))}
                  </div>
                );
              }),
            ];
          })}
        </div>
      </div>
      {empty && <p className="px-4 py-3 text-center text-sm text-muted">{t("cal.nothingThisWeek")}</p>}
    </div>
  );
}
