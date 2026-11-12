// Calendar items (deliveries, trials, work steps) and month grids.
import { daysBetween, parseDate, toISODate } from "./orders";
import { isLate, isOpen } from "./work";

/**
 * Everything with a date, as calendar items:
 *   { key, date (Date), iso, kind: "delivery" | "trial" | "step", order, task?, employee?, late }
 * - orders: the full orders list (owner / uploader / social media), or []
 * - myTasks: a worker's own steps from /tasks/mine (each has .order), or []
 * - stepsFor: only show work steps of this employee id (null = everyone's)
 */
export function buildItems({ orders = [], myTasks = [], stepsFor = null }) {
  const items = [];

  for (const order of orders) {
    if (!isOpen(order) && order.status !== "ready") continue; // delivered / cancelled
    if (order.status_confirmed === false) continue; // old orders still to be answered
    const delivery = parseDate(order.deliver_date);
    if (delivery) {
      items.push({ key: `d${order.id}`, date: delivery, kind: "delivery", order, late: isLate(order) });
    }
    const trial = parseDate(order.trial_date);
    if (trial) {
      items.push({ key: `t${order.id}`, date: trial, kind: "trial", order, late: false });
    }
    for (const task of order.tasks || []) {
      if (task.status === "done") continue;
      if (stepsFor && task.employee?.id !== stepsFor) continue;
      const due = parseDate(task.due_date);
      if (!due) continue;
      items.push({
        key: `s${task.id}`,
        date: due,
        kind: "step",
        order,
        task,
        employee: task.employee,
        late: Boolean(task.original_due_date),
      });
    }
  }

  // A worker's own steps (they can't see the full orders list).
  for (const task of myTasks) {
    if (task.status === "done") continue;
    const due = parseDate(task.due_date);
    if (!due) continue;
    items.push({
      key: `s${task.id}`,
      date: due,
      kind: "step",
      order: task.order,
      task,
      employee: task.employee,
      late: Boolean(task.original_due_date),
      mine: true,
    });
  }

  for (const item of items) item.iso = toISODate(item.date);
  const rank = { delivery: 0, trial: 1, step: 2 };
  return items.sort((a, b) => a.iso.localeCompare(b.iso) || rank[a.kind] - rank[b.kind]);
}

/** Groups items by day: [{ iso, date, items }], sorted. */
export function byDay(items) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.iso)) map.set(item.iso, { iso: item.iso, date: item.date, items: [] });
    map.get(item.iso).items.push(item);
  }
  return [...map.values()].sort((a, b) => a.iso.localeCompare(b.iso));
}

/** For the list view: late things first, then today onwards for `days` days. */
export function agenda(items, days) {
  const today = new Date();
  const late = items.filter(
    (item) => item.kind === "delivery" && item.late && daysBetween(today, item.date) < 0
  );
  const upcoming = items.filter((item) => {
    const diff = daysBetween(today, item.date);
    return diff >= 0 && diff < days;
  });
  return { late, days: byDay(upcoming) };
}

/** Weeks of a month (Sunday first), each a list of 7 Dates (with days from the next/previous month). */
export function monthGrid(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const start = new Date(y, m - 1, 1 - first.getDay());
  const weeks = [];
  for (let w = 0; w < 6; w += 1) {
    const week = [];
    for (let d = 0; d < 7; d += 1) {
      week.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d));
    }
    if (w >= 4 && week[0].getMonth() !== m - 1) break;
    weeks.push(week);
  }
  return weeks;
}

/** Short weekday names in the chosen language, Sunday first. */
export function weekdayNames(locale) {
  const sunday = new Date(2026, 10, 1); // 1 Nov 2026 is a Sunday
  return Array.from({ length: 7 }, (_, i) =>
    new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i).toLocaleDateString(locale, {
      weekday: "short",
    })
  );
}
