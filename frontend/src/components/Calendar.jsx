"use client";

import Link from "next/link";
import { Ruler, TriangleAlert, Truck } from "lucide-react";
import { orderPath } from "../lib/api";
import { monthGrid, weekdayNames } from "../lib/calendar";
import { useI18n } from "../lib/i18n";
import { clean, daysBetween, displayName, toISODate } from "../lib/orders";
import { daysPushed } from "../lib/work";
import { EmployeeAvatar, cx } from "./ui";
import { LateChip, ProgressBar, PushedChip, StageChip } from "./Work";

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
          const colors = [...new Map(steps.map((s) => [s.employee?.id ?? "none", s.employee?.color || "#94a3b8"])).values()];
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
    <section className="overflow-hidden bg-card md:rounded-2xl md:border md:border-danger/30">
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
