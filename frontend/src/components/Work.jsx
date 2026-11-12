"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CircleCheck,
  Hourglass,
  LoaderCircle,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import {
  addPlan,
  assignTask,
  getWorkload,
  removeTask,
  reorderSteps,
  updateOrder,
  updateTask,
} from "../lib/api";
import { useI18n } from "../lib/i18n";
import { clean, daysBetween, formatDate, parseDate, toISODate } from "../lib/orders";
import { useResource } from "../lib/useResource";
import { STAGES, TASK_TYPES, TEMPLATES, daysPushed, isLate } from "../lib/work";
import { Button, ConfirmDialog, EmployeeAvatar, Notice, cx } from "./ui";

/* ---------------- Small pieces ---------------- */

const STAGE_TONES = {
  received: "bg-card-2 text-ink-2",
  in_work: "bg-[#e6effb] text-[#1e4f91]",
  ready: "bg-accent-soft text-accent-soft-ink",
  delivered: "bg-card-2 text-muted",
  cancelled: "bg-card-2 text-muted line-through",
};

/** Stage chip. While in work it names the current step ("Cutting"). */
export function StageChip({ status = "received", step, className }) {
  const { t } = useI18n();
  const label = status === "in_work" && step ? t(`task.${step}`) : t(`stage.${status}`);
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
        STAGE_TONES[status] || STAGE_TONES.received,
        className
      )}
    >
      {status === "ready" && <CircleCheck size={12} />}
      {label}
    </span>
  );
}

export function LateChip() {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
      <TriangleAlert size={12} />
      {t("work.late")}
    </span>
  );
}

export function PushedChip({ task }) {
  const { t } = useI18n();
  const days = daysPushed(task);
  if (!days) return null;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
      <Hourglass size={12} />
      {days === 1 ? t("work.pushedOne") : t("work.pushed", { count: days })}
    </span>
  );
}

export function ProgressBar({ value, className }) {
  return (
    <span
      className={cx("block h-1.5 overflow-hidden rounded-full bg-card-2", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span
        className={cx("block h-full rounded-full", value >= 100 ? "bg-accent" : "bg-[#3b82f6]")}
        style={{ width: `${Math.max(value, value > 0 ? 6 : 0)}%` }}
      />
    </span>
  );
}

function DueText({ date }) {
  const { t, locale } = useI18n();
  const due = parseDate(date);
  if (!due) return null;
  const diff = daysBetween(new Date(), due);
  const short = formatDate(due, locale, { day: "numeric", month: "short" });
  if (diff < 0) return <span className="font-semibold text-danger">{t("work.late")} · {short}</span>;
  if (diff === 0) return <span className="font-semibold text-warn-ink">{t("work.dueToday")}</span>;
  return <span>{t("work.dueOn", { date: short })}</span>;
}

function TaskStatusChip({ status }) {
  const { t } = useI18n();
  return (
    <span
      className={cx(
        "rounded-full px-2 py-px text-[11px] font-semibold",
        status === "done"
          ? "bg-accent-soft text-accent-soft-ink"
          : status === "in_progress"
            ? "bg-[#e6effb] text-[#1e4f91]"
            : "bg-card-2 text-ink-2"
      )}
    >
      {t(`taskStatus.${status}`)}
    </span>
  );
}

/* ---------------- Choosing a person (people with the speciality first) ---------------- */

function PersonPicker({ step, value, onChange, people }) {
  const { t } = useI18n();
  const [everyone, setEveryone] = useState(false);
  const skilled = (people || []).filter(({ employee }) => (employee.skills || []).includes(step));
  const shown = everyone || skilled.length === 0 ? people || [] : skilled;

  return (
    <div>
      {skilled.length === 0 && people && (
        <p className="mb-1.5 text-xs text-muted">{t("work.noPeopleWithSkill")}</p>
      )}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {shown.map(({ employee, open, late }) => (
          <button
            key={employee.id}
            type="button"
            aria-pressed={value === employee.id}
            onClick={() => onChange(value === employee.id ? null : employee.id)}
            className={cx(
              "flex w-24 shrink-0 flex-col items-center rounded-2xl border-2 bg-card px-2 py-2.5 text-center transition",
              value === employee.id ? "border-accent" : "border-transparent"
            )}
          >
            <EmployeeAvatar employee={employee} size={40} />
            <span className="mt-1 w-full truncate text-[13px] font-medium text-ink">{employee.name}</span>
            <span className={cx("text-[11px]", late ? "font-semibold text-danger" : "text-muted")}>
              {late ? t("work.lateTasks", { count: late }) : t("work.openTasks", { count: open })}
            </span>
          </button>
        ))}
        {!people && <LoaderCircle size={20} className="m-4 animate-spin text-muted" />}
      </div>
      {skilled.length > 0 && skilled.length < (people || []).length && (
        <button
          type="button"
          onClick={() => setEveryone(!everyone)}
          className="mt-1 text-xs font-medium text-accent-ink"
        >
          {everyone ? t("work.skilled") : t("work.everyone")}
        </button>
      )}
    </div>
  );
}

/* ---------------- Add one step ---------------- */

function AddStepForm({ order, people, onDone, onCancel }) {
  const { t, tError } = useI18n();
  const deliver = parseDate(order.deliver_date);
  const defaultDue = deliver ? toISODate(new Date(deliver.getTime() - 86_400_000)) : "";
  const [form, setForm] = useState({ task: "cutting", employee_id: null, due_date: defaultDue, note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await assignTask(order.id, { ...form, due_date: form.due_date || null, note: form.note || null });
      onDone();
    } catch (err) {
      setError(tError(err));
      setBusy(false);
    }
  };

  const input =
    "mt-1.5 h-11 w-full rounded-xl border border-line bg-card px-3 text-[16px] outline-none focus:border-accent md:text-sm";

  return (
    <div className="space-y-4 rounded-2xl bg-card-2 p-4">
      <div>
        <p className="text-[13px] font-medium text-ink-2">{t("work.what")}</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {TASK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={form.task === type}
              onClick={() => setForm({ ...form, task: type, employee_id: null })}
              className={cx(
                "h-9 rounded-full px-3.5 text-sm transition",
                form.task === type ? "bg-accent font-medium text-white" : "bg-card text-ink-2"
              )}
            >
              {t(`task.${type}`)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[13px] font-medium text-ink-2">{t("work.who")}</p>
        <PersonPicker
          step={form.task}
          value={form.employee_id}
          people={people}
          onChange={(id) => setForm({ ...form, employee_id: id })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[13px] font-medium text-ink-2">{t("work.due")}</span>
          <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={input} />
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-ink-2">{t("work.note")}</span>
          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder={t("work.notePlaceholder")}
            className={input}
          />
        </label>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <Button onClick={save} disabled={busy}>
          {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
          {t("work.addStep")}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- One step of the plan ---------------- */

function StepRow({ task, index, count, canAssign, people, onMove }) {
  const { t, tError } = useI18n();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState("");

  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(tError(err));
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  const next = task.status === "assigned" ? "in_progress" : task.status === "in_progress" ? "done" : "assigned";
  const nextLabel = t(next === "assigned" ? "work.undo" : next === "done" ? "work.done" : "work.start");

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            task.status === "done" ? "bg-accent text-white" : "bg-card-2 text-ink-2"
          )}
        >
          {task.status === "done" ? <CircleCheck size={15} /> : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium text-ink">
            {t(`task.${task.task}`)}
            <TaskStatusChip status={task.status} />
            {task.status !== "done" && <PushedChip task={task} />}
          </p>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted">
            {task.employee ? (
              <>
                <EmployeeAvatar employee={task.employee} size={22} />
                <span className="text-ink-2">{task.employee.name}</span>
              </>
            ) : (
              <span className="flex items-center gap-1 font-medium text-warn-ink">
                <UserRound size={14} />
                {t("work.noPerson")}
              </span>
            )}
            {task.due_date && task.status !== "done" && (
              <>
                <span>·</span>
                <DueText date={task.due_date} />
              </>
            )}
          </div>
          {task.note && <p className="mt-0.5 text-sm text-ink-2">“{task.note}”</p>}
          {error && <p className="mt-1 text-sm text-danger">{error}</p>}
        </div>
        {canAssign && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="flex items-center">
              <button
                type="button"
                disabled={busy || index === 0}
                onClick={() => onMove(index, -1)}
                aria-label={t("work.moveUp")}
                className="rounded-full p-1.5 text-muted hover:bg-card-2 disabled:opacity-30"
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                disabled={busy || index === count - 1}
                onClick={() => onMove(index, 1)}
                aria-label={t("work.moveDown")}
                className="rounded-full p-1.5 text-muted hover:bg-card-2 disabled:opacity-30"
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => setConfirm(true)}
                aria-label={t("work.remove")}
                className="rounded-full p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => setChoosing(!choosing)}>
                <UserRound size={14} />
                <span className="hidden sm:inline">{t("work.choosePerson")}</span>
              </Button>
              {task.employee && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  aria-label={nextLabel}
                  onClick={() => run(() => updateTask(task.id, { status: next }))}
                >
                  {next === "done" ? <CircleCheck size={14} /> : next === "in_progress" ? <Play size={14} /> : <RotateCcw size={14} />}
                  <span className="hidden sm:inline">{nextLabel}</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      {choosing && (
        <div className="mt-3 space-y-3 rounded-2xl bg-card-2 p-3">
          <PersonPicker
            step={task.task}
            value={task.employee?.id ?? null}
            people={people}
            onChange={(id) => {
              setChoosing(false);
              run(() => updateTask(task.id, { employee_id: id }));
            }}
          />
          <label className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
            {t("work.due")}
            <input
              type="date"
              defaultValue={task.due_date || ""}
              onChange={(e) => run(() => updateTask(task.id, { due_date: e.target.value || null }))}
              className="h-10 rounded-xl border border-line bg-card px-3 text-[16px] outline-none focus:border-accent md:text-sm"
            />
          </label>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        title={t("work.removeTitle")}
        body={`${t(`task.${task.task}`)}${task.employee ? ` · ${task.employee.name}` : ""}`}
        confirmLabel={t("work.remove")}
        busy={busy}
        onCancel={() => setConfirm(false)}
        onConfirm={() => run(() => removeTask(task.id))}
      />
    </li>
  );
}

/* ---------------- Work section on an order ---------------- */

export function WorkSection({ order, canEdit, canAssign, canBill }) {
  const { t, locale, tError } = useI18n();
  const loader = useCallback(() => getWorkload(), []);
  const { data: people } = useResource(loader, canAssign);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const status = order.status || "received";
  const tasks = order.tasks || [];
  const closed = ["delivered", "cancelled"].includes(status);

  const run = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(tError(err));
    } finally {
      setBusy(false);
    }
  };

  const move = (index, direction) => {
    const ids = tasks.map((task) => task.id);
    const target = index + direction;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => reorderSteps(order.id, ids));
  };

  // A quick plan: steps whose speciality only one person has get that person.
  const applyTemplate = (key) => {
    const deliver = parseDate(order.deliver_date);
    const due = deliver ? toISODate(new Date(deliver.getTime() - 86_400_000)) : null;
    const steps = TEMPLATES[key].map((task) => {
      const skilled = (people || []).filter(({ employee }) => (employee.skills || []).includes(task));
      return { task, employee_id: skilled.length === 1 ? skilled[0].employee.id : null, due_date: due };
    });
    run(() => addPlan(order.id, steps));
  };

  return (
    <div className="space-y-4 py-3">
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex flex-wrap items-center gap-2">
            <StageChip status={status} step={order.current_step} />
            {isLate(order) && <LateChip />}
          </span>
          <span className="text-sm font-semibold text-ink">{t("work.progress", { percent: order.progress ?? 0 })}</span>
        </div>
        <ProgressBar value={order.progress ?? 0} className="mt-2" />
        {order.trial_date && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-2">
            <CalendarClock size={15} className="text-muted" />
            {t("work.trialOn", { date: formatDate(order.trial_date, locale) })}
          </p>
        )}
      </div>

      {canEdit && (
        <div>
          <p className="text-[13px] font-medium text-ink-2">{t("stage.label")}</p>
          <div className="no-scrollbar -mx-1 mt-1.5 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {STAGES.map((stage) => (
              <button
                key={stage}
                type="button"
                disabled={busy}
                aria-pressed={status === stage}
                onClick={() => run(() => updateOrder(order.id, { status: stage }))}
                className={cx(
                  "h-8 shrink-0 rounded-full px-3 text-[13px] transition disabled:opacity-60",
                  status === stage ? "bg-ink font-semibold text-white" : "bg-card-2 text-ink-2 hover:text-ink"
                )}
              >
                {t(`stage.${stage}`)}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">{t("work.stageHelp")}</p>
        </div>
      )}

      {status === "ready" && (
        <div className="flex flex-col gap-2 rounded-xl bg-accent-soft p-3 text-sm text-accent-soft-ink sm:flex-row sm:items-center">
          <CircleCheck size={18} className="shrink-0" />
          <span className="flex-1">{t("work.readyNote")}</span>
          <span className="flex gap-2">
            {canBill && !order.bill_id && order.customer_id && (
              <Link
                href={`/bills/new?customer=${order.customer_id}&orders=${order.id}`}
                className="rounded-full bg-accent px-3 py-1.5 font-medium text-white"
              >
                {t("pay.createBill")}
              </Link>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => run(() => updateOrder(order.id, { status: "delivered" }))}
                className="rounded-full border border-accent-soft-ink/30 bg-card px-3 py-1.5 font-medium"
              >
                {t("work.markDelivered")}
              </button>
            )}
          </span>
        </div>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      <div>
        <p className="text-[13px] font-semibold text-ink">{t("work.plan")}</p>
        <p className="text-xs text-muted">{t("work.planHelp")}</p>
        {tasks.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t("work.noTasks")}</p>
        ) : (
          <ol className="mt-1 divide-y divide-line">
            {tasks.map((task, index) => (
              <StepRow
                key={`${task.id}-${task.status}-${task.employee?.id ?? "none"}-${index}`}
                task={task}
                index={index}
                count={tasks.length}
                canAssign={canAssign}
                people={people}
                onMove={move}
              />
            ))}
          </ol>
        )}
      </div>

      {canAssign && !closed && (
        <div className="space-y-3">
          {tasks.length === 0 && !adding && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-ink-2">
                <Sparkles size={14} />
                {t("work.templates")}
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(TEMPLATES).map((key) => (
                  <Button key={key} size="sm" variant="secondary" disabled={busy || !people} onClick={() => applyTemplate(key)}>
                    {t(`work.template.${key}`)}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {adding ? (
            <AddStepForm order={order} people={people} onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />
          ) : (
            <Button variant="secondary" onClick={() => setAdding(true)}>
              <Plus size={16} />
              {t("work.addStep")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- A worker's step card ---------------- */

export function TaskCard({ task, onChanged }) {
  const { t, locale, tError } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const order = task.order;
  const pushed = task.status !== "done" ? daysPushed(task) : 0;

  const set = async (status) => {
    setBusy(true);
    setError("");
    try {
      await updateTask(task.id, { status });
      await onChanged();
    } catch (err) {
      setError(tError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className={cx(
        "rounded-2xl border bg-card p-4 shadow-sm",
        pushed ? "border-danger/40" : "border-line",
        task.status === "done" && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-ink">{t(`task.${task.task}`)}</p>
          <p className="text-sm text-muted">
            {t("mywork.orderInfo", { number: order.order_number || order.id })}
            {order.customer_name && ` · ${t("mywork.customer", { name: order.customer_name })}`}
          </p>
        </div>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <TaskStatusChip status={task.status} />
          {pushed > 0 && <PushedChip task={task} />}
        </span>
      </div>

      {task.waiting_for?.length > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn-ink">
          <Hourglass size={16} className="mt-0.5 shrink-0" />
          {t("work.waitingFor", {
            steps: task.waiting_for
              .map((step) => `${t(`task.${step.task}`)}${step.employee_name ? ` (${step.employee_name})` : ""}`)
              .join(", "),
          })}
        </p>
      )}

      <p className="mt-3 whitespace-pre-wrap rounded-xl bg-card-2 px-3 py-2.5 text-[15.5px] leading-7 text-ink">
        {clean(order.what_to_design) || "—"}
        {clean(order.additional_info) && <span className="block text-sm text-muted">{clean(order.additional_info)}</span>}
      </p>
      {task.note && <p className="mt-2 text-[15px] text-ink-2">📝 {task.note}</p>}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">
        {task.due_date && task.status !== "done" && <DueText date={task.due_date} />}
        {pushed > 0 && (
          <span className="text-danger">
            {t("work.pushedHelp", { date: formatDate(task.original_due_date, locale, { day: "numeric", month: "short" }) })}
          </span>
        )}
        {order.trial_date && <span>{t("work.trialOn", { date: formatDate(order.trial_date, locale) })}</span>}
        {order.deliver_date && (
          <span className="text-muted">
            {t("orders.delivery")}: {formatDate(order.deliver_date, locale)}
          </span>
        )}
      </div>

      {error && <Notice tone="error" className="mt-3">{error}</Notice>}

      <div className="mt-4 flex gap-2">
        {task.status === "assigned" && (
          <Button variant="secondary" size="lg" className="flex-1" disabled={busy} onClick={() => set("in_progress")}>
            <Play size={18} />
            {t("work.start")}
          </Button>
        )}
        {task.status !== "done" ? (
          <Button size="lg" className="flex-1" disabled={busy} onClick={() => set("done")}>
            {busy ? <LoaderCircle size={18} className="animate-spin" /> : <CircleCheck size={18} />}
            {t("work.done")}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => set("in_progress")}>
            <RotateCcw size={15} />
            {t("work.undo")}
          </Button>
        )}
      </div>
    </article>
  );
}
