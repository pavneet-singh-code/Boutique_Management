// Order stages, specialities, quick plans and "what needs attention".
import { daysBetween, parseDate } from "./orders";

export const STAGES = ["received", "in_work", "ready", "delivered", "cancelled"];

// The boutique's specialities, which are also the kinds of steps in a plan.
export const SPECIALITIES = [
  "materials",
  "cutting",
  "machine",
  "handwork",
  "stitching",
  "final_check",
  "social_media",
];
export const TASK_TYPES = [...SPECIALITIES, "other"];

// Quick plans the owner can start from (then change freely).
export const TEMPLATES = {
  basic: ["materials", "cutting", "stitching", "final_check"],
  handwork: ["materials", "cutting", "handwork", "stitching", "final_check"],
  full: ["materials", "cutting", "machine", "handwork", "stitching", "final_check"],
};

export function isOpen(order) {
  return !["ready", "delivered", "cancelled"].includes(order.status || "received");
}

/** Days until delivery (negative = late), or null without a date. */
export function daysLeft(order) {
  const date = parseDate(order.deliver_date);
  return date ? daysBetween(new Date(), date) : null;
}

/** Late = delivery date passed, not ready, and not an old order still waiting for "delivered?". */
export function isLate(order) {
  const left = daysLeft(order);
  return isOpen(order) && order.status_confirmed !== false && left !== null && left < 0;
}

export function openTasks(order) {
  return (order.tasks || []).filter((task) => task.status !== "done");
}

/** No plan yet, or a step that still needs a person. */
export function needsPeople(order) {
  const tasks = order.tasks || [];
  return tasks.length === 0 || tasks.some((task) => !task.employee && task.status !== "done");
}

/** Days a step has slipped (0 if on time). */
export function daysPushed(task) {
  const first = parseDate(task.original_due_date);
  const now = parseDate(task.due_date);
  return first && now ? Math.max(0, daysBetween(first, now)) : 0;
}

/** Groups for the Pending screen (an order shows in the first group it fits). */
export function pendingGroups(orders) {
  const today = new Date();
  const groups = { confirm: [], late: [], unassigned: [], soon: [], ready: [], trials: [] };
  for (const order of orders) {
    const status = order.status || "received";
    if (order.status_confirmed === false && isOpen(order)) {
      groups.confirm.push(order);
      continue;
    }
    if (status === "ready") {
      groups.ready.push(order);
      continue;
    }
    if (!isOpen(order)) continue;
    const left = daysLeft(order);
    if (left !== null && left < 0) groups.late.push(order);
    else if (needsPeople(order)) groups.unassigned.push(order);
    else if (left !== null && left <= 3) groups.soon.push(order);
    const trial = parseDate(order.trial_date);
    if (trial) {
      const inDays = daysBetween(today, trial);
      if (inDays >= 0 && inDays <= 7) groups.trials.push(order);
    }
  }
  const byDelivery = (a, b) => (daysLeft(a) ?? 9999) - (daysLeft(b) ?? 9999);
  for (const key of Object.keys(groups)) groups[key].sort(byDelivery);
  groups.trials.sort(
    (a, b) => (parseDate(a.trial_date)?.getTime() ?? 0) - (parseDate(b.trial_date)?.getTime() ?? 0)
  );
  return groups;
}
