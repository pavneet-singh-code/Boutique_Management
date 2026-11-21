"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarDays, Columns3, List, RefreshCw } from "lucide-react";
import AppShell, { HeaderIconButton } from "../../components/AppShell";
import { DayHeading, DayList, LateBlock, MonthGrid, WeekBoard, weekStartOf } from "../../components/Calendar";
import { PeriodStepper } from "../../components/PeriodPicker";
import { Button, Card, Chip, EmployeeAvatar, EmptyState, ErrorBox, PageHeading, Spinner, cx } from "../../components/ui";
import { getMyTasks } from "../../lib/api";
import { agenda, buildItems, byDay } from "../../lib/calendar";
import { useI18n } from "../../lib/i18n";
import { currentMonthKey, formatMonth, monthKeyOf, parseDate, shiftMonth, toISODate } from "../../lib/orders";
import { can, useMe } from "../../lib/roles";
import { useOrders } from "../../lib/useOrders";
import { useResource } from "../../lib/useResource";

const KINDS = ["all", "delivery", "trial", "step"];

export default function CalendarPage() {
  const { t, locale } = useI18n();
  const me = useMe();
  const role = me?.role;
  const seesOrders = can(role, "orders");
  const isStaff = can(role, "editOrders");

  // Owners / uploaders / social media: from the orders list. Workers: their own steps.
  const { orders, ready, loading, error, reload } = useOrders({ enabled: seesOrders });
  const tasksLoader = useCallback(() => getMyTasks(), []);
  const mine = useResource(tasksLoader, Boolean(me) && !seesOrders, "myTasks");

  // "list" / "month" on phones (the usual calendar), or "week" (the week board).
  const [view, setView] = useState("list");
  const [weekStart, setWeekStart] = useState(() => weekStartOf(new Date()));
  const [kind, setKind] = useState("all");
  const [person, setPerson] = useState(null);
  const [month, setMonth] = useState(currentMonthKey);
  const [selected, setSelected] = useState(() => toISODate(new Date()));
  const [horizon, setHorizon] = useState(14);

  const allItems = useMemo(() => {
    if (!me) return [];
    if (!seesOrders) return buildItems({ myTasks: mine.data || [] });
    // The social media person sees deliveries and trials, but only her own steps.
    return buildItems({ orders, stepsFor: isStaff ? person : me.id });
  }, [me, seesOrders, isStaff, orders, mine.data, person]);

  const items = kind === "all" ? allItems : allItems.filter((item) => item.kind === kind);
  const days = useMemo(() => byDay(items), [items]);
  const list = useMemo(() => agenda(items, horizon), [items, horizon]);
  const selectedItems = days.find((day) => day.iso === selected)?.items || [];

  // People who have work in the plans (for the owner's "whose work" filter).
  const people = useMemo(() => {
    const map = new Map();
    for (const order of orders) for (const task of order.tasks || []) if (task.employee) map.set(task.employee.id, task.employee);
    return [...map.values()];
  }, [orders]);

  const isReady = seesOrders ? ready : mine.data !== null;
  const failed = seesOrders ? error : mine.error;
  const subtitle = seesOrders ? t("cal.subtitle") : t("cal.mine");
  const refresh = () => (seesOrders ? reload() : mine.reload());

  const shiftWeek = (weeks) =>
    setWeekStart((start) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + weeks * 7));
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
  const weekLabel = `${weekStart.toLocaleDateString(locale, { day: "numeric", month: "short" })} – ${weekEnd.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`;
  const weekKinds = !seesOrders ? ["step"] : kind === "all" ? ["delivery", "trial", "step"] : [kind];
  const isWeek = view === "week";

  const pickDay = (iso) => {
    setSelected(iso);
    const key = monthKeyOf(parseDate(iso));
    if (key !== month) setMonth(key);
  };

  return (
    <AppShell
      title={t("cal.title")}
      subtitle={subtitle}
      actions={
        <HeaderIconButton label={t("common.refresh")} onClick={refresh}>
          <RefreshCw size={20} className={loading || mine.loading ? "animate-spin" : ""} />
        </HeaderIconButton>
      }
    >
      <PageHeading eyebrow={t("nav.overview")} title={t("cal.title")} subtitle={subtitle} />

      {/* View switch (phones) + filters */}
      <div className="space-y-3 bg-card px-4 pb-3 pt-3 md:mb-5 md:bg-transparent md:p-0">
        <div className="grid grid-cols-3 rounded-full bg-card-2 p-1 md:hidden">
          {[
            ["list", t("cal.list"), List],
            ["month", t("cal.month"), CalendarDays],
            ["week", t("cal.week"), Columns3],
          ].map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={cx(
                "flex h-9 items-center justify-center gap-2 rounded-full text-sm font-medium transition",
                view === value ? "bg-card text-ink shadow-sm" : "text-muted"
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <div className="hidden w-fit grid-cols-2 rounded-full bg-card p-1 shadow-sm ring-1 ring-line md:grid">
          {[
            ["list", t("cal.overview"), CalendarDays],
            ["week", t("cal.week"), Columns3],
          ].map(([value, label, Icon]) => {
            const active = value === "week" ? isWeek : !isWeek;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setView(value)}
                className={cx(
                  "flex h-9 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition",
                  active ? "bg-cocoa text-white shadow-sm" : "text-muted hover:text-ink"
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>
        {seesOrders && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
            {KINDS.map((value) => (
              <Chip key={value} active={kind === value} onClick={() => setKind(value)}>
                {value === "all" ? t("cal.all") : t(value === "delivery" ? "cal.deliveries" : value === "trial" ? "cal.trials" : "cal.steps")}
              </Chip>
            ))}
          </div>
        )}
        {isStaff && people.length > 0 && kind !== "delivery" && kind !== "trial" && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
            <Chip active={!person} onClick={() => setPerson(null)}>
              {t("cal.everyone")}
            </Chip>
            {people.map((employee) => (
              <Chip key={employee.id} active={person === employee.id} onClick={() => setPerson(person === employee.id ? null : employee.id)}>
                <span className="flex items-center gap-1.5">
                  <EmployeeAvatar employee={employee} size={18} />
                  {employee.name}
                </span>
              </Chip>
            ))}
          </div>
        )}
      </div>

      <ErrorBox error={failed} onRetry={refresh} className="my-4" />

      {!isReady && !failed ? (
        <Spinner />
      ) : isReady && isWeek ? (
        <div className="space-y-3">
          <PeriodStepper
            className="mx-3 md:mx-0"
            label={weekLabel}
            onPrev={() => shiftWeek(-1)}
            onNext={() => shiftWeek(1)}
          />
          <div className="flex justify-center">
            <Button variant="secondary" size="sm" onClick={() => setWeekStart(weekStartOf(new Date()))}>
              {t("cal.thisWeek")}
            </Button>
          </div>
          <WeekBoard items={items} start={weekStart} kinds={weekKinds} linkOrders={seesOrders} />
        </div>
      ) : isReady ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Month view: always on desktop, on phones when chosen */}
          <div className={cx(view === "month" ? "block" : "hidden", "md:block")}>
            <Card className="mx-4 p-3 md:mx-0 md:p-5">
              <PeriodStepper
                className="mb-3"
                label={formatMonth(month, locale)}
                onPrev={() => setMonth(shiftMonth(month, -1))}
                onNext={() => setMonth(shiftMonth(month, 1))}
              />
              <MonthGrid monthKey={month} days={days} selected={selected} onSelect={pickDay} />
              <p className="mt-2 text-center text-[11px] text-muted">🚚 {t("cal.delivery")} · 📏 {t("cal.trial")} · {t("cal.legend")}</p>
            </Card>
            <Card className="mx-4 mt-4 overflow-hidden md:mx-0">
              <DayHeading date={parseDate(selected)} />
              {selectedItems.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted">{t("cal.nothing")}</p>
              ) : (
                <DayList items={selectedItems} linkOrders={seesOrders} />
              )}
            </Card>
          </div>

          {/* List view: on phones when chosen; on desktop next to the month */}
          <div className={cx(view === "list" ? "block" : "hidden", "md:block")}>
            <div className="space-y-4">
              <LateBlock items={list.late} linkOrders={seesOrders} />
              {list.days.length === 0 && list.late.length === 0 ? (
                <Card className="mx-4 md:mx-0">
                  <EmptyState icon={CalendarDays} title={t("cal.nothingSoon")} />
                </Card>
              ) : (
                <div className="mx-3 overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-white md:mx-0">
                  {list.days.map((day) => (
                    <section key={day.iso}>
                      <DayHeading date={day.date} />
                      <DayList items={day.items} linkOrders={seesOrders} />
                    </section>
                  ))}
                </div>
              )}
              <div className="px-4 pb-4 text-center md:px-0">
                <Button variant="secondary" size="sm" onClick={() => setHorizon(horizon + 14)}>
                  {t("cal.showMore", { count: 14 })}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
