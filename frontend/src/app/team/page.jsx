"use client";

import { useCallback, useState } from "react";
import { ChevronDown, KeyRound, LoaderCircle, Power, Save, UserPlus } from "lucide-react";
import AppShell from "../../components/AppShell";
import {
  Button,
  Card,
  EmployeeAvatar,
  ErrorBox,
  Notice,
  PageHeading,
  Spinner,
  cx,
} from "../../components/ui";
import { addEmployee, getEmployees, resetEmployeePin, updateEmployee } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { ROLES, useMe } from "../../lib/roles";
import { serverTime } from "../../lib/orders";
import { useResource } from "../../lib/useResource";

// Same set as the server (models.EMPLOYEE_COLORS): never the status colours.
const EMPLOYEE_COLORS = [
  "#2563eb", "#7c3aed", "#0d9488", "#db2777", "#4f46e5",
  "#0284c7", "#9333ea", "#92400e", "#475569", "#c026d3",
];

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-line bg-card px-3.5 text-[16px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 md:h-11 md:text-sm";

function ColorPicker({ value, onChange }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("team.color")} className="mt-1.5 flex flex-wrap gap-2">
      {EMPLOYEE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={color}
          onClick={() => onChange(color)}
          className={cx(
            "h-9 w-9 rounded-full ring-offset-2 ring-offset-card transition",
            value === color ? "ring-2 ring-ink" : "hover:scale-105"
          )}
          style={{ background: color }}
        />
      ))}
    </div>
  );
}

function RolePicker({ value, onChange }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" className="mt-1.5 grid gap-2 sm:grid-cols-2">
      {ROLES.map((role) => (
        <button
          key={role}
          type="button"
          role="radio"
          aria-checked={value === role}
          onClick={() => onChange(role)}
          className={cx(
            "rounded-xl border-2 px-3 py-2.5 text-left transition",
            value === role ? "border-accent bg-accent-soft" : "border-line hover:border-muted/40"
          )}
        >
          <span className="block text-[15px] font-semibold text-ink">{t(`role.${role}`)}</span>
          <span className="block text-xs leading-5 text-muted">{t(`role.${role}.help`)}</span>
        </button>
      ))}
    </div>
  );
}

function AddForm({ onAdded, onCancel }) {
  const { t, tError } = useI18n();
  const [form, setForm] = useState({ name: "", phone: "", role: "worker", pin: "", color: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await addEmployee({ ...form, color: form.color || undefined });
      onAdded();
    } catch (err) {
      setError(tError(err));
      setSaving(false);
    }
  };

  return (
    <Card className="mx-4 p-4 md:mx-0 md:p-6">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-ink">
        <UserPlus size={18} />
        {t("team.add")}
      </h2>
      <form onSubmit={save} className="space-y-4">
        <label className="block">
          <span className="text-[13px] font-medium text-ink-2">{t("team.name")}</span>
          <input value={form.name} onChange={(e) => set("name")(e.target.value)} required className={inputClass} />
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-ink-2">{t("team.phone")}</span>
          <input value={form.phone} onChange={(e) => set("phone")(e.target.value)} inputMode="tel" required className={inputClass} />
        </label>
        <div>
          <span className="text-[13px] font-medium text-ink-2">{t("team.role")}</span>
          <RolePicker value={form.role} onChange={set("role")} />
        </div>
        <label className="block">
          <span className="text-[13px] font-medium text-ink-2">{t("team.pin")}</span>
          <input
            value={form.pin}
            onChange={(e) => set("pin")(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            required
            className={`${inputClass} tracking-[0.3em]`}
          />
          <span className="mt-1 block text-xs text-muted">{t("team.pinHelp")}</span>
        </label>
        <div>
          <span className="text-[13px] font-medium text-ink-2">{t("team.color")}</span>
          <ColorPicker value={form.color} onChange={set("color")} />
          <span className="mt-1 block text-xs text-muted">{t("team.colorHelp")}</span>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving || !form.name.trim() || !form.phone.trim() || form.pin.length < 4}>
            {saving ? <LoaderCircle size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {t("team.add")}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function EmployeeCard({ employee, isMe, onChanged }) {
  const { t, locale, tError } = useI18n();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: employee.name,
    phone: employee.phone || "",
    role: employee.role,
    color: employee.color,
  });
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const run = async (action) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: "success", text: t("team.saved") });
      onChanged();
    } catch (err) {
      setMessage({ tone: "error", text: tError(err) });
    } finally {
      setBusy(false);
    }
  };

  const lastLogin = employee.last_login_at
    ? serverTime(employee.last_login_at).toLocaleString(locale, {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : t("team.never");

  return (
    <li className="bg-card md:rounded-2xl md:border md:border-line md:shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left md:px-5"
      >
        <EmployeeAvatar employee={employee} size={46} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[16.5px] font-medium text-ink">{employee.name}</span>
            {isMe && (
              <span className="rounded-full bg-accent-soft px-2 py-px text-[11px] font-semibold text-accent-soft-ink">
                {t("team.you")}
              </span>
            )}
            {!employee.active && (
              <span className="rounded-full bg-card-2 px-2 py-px text-[11px] font-semibold text-muted">
                {t("team.inactive")}
              </span>
            )}
          </span>
          <span className="block truncate text-sm text-muted">
            {employee.employee_code} · {t(`role.${employee.role}`)}
            {employee.phone ? ` · ${employee.phone}` : ""}
          </span>
          <span className="block text-xs text-muted">
            {t("team.lastLogin")}: {lastLogin}
            {!employee.has_pin && ` · ${t("team.noPin")}`}
          </span>
        </span>
        <ChevronDown size={18} className={cx("shrink-0 text-muted transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-line px-4 py-4 md:px-5">
          <label className="block">
            <span className="text-[13px] font-medium text-ink-2">{t("team.name")}</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-ink-2">{t("team.phone")}</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" className={inputClass} />
          </label>
          <div>
            <span className="text-[13px] font-medium text-ink-2">{t("team.role")}</span>
            <RolePicker value={form.role} onChange={(role) => setForm({ ...form, role })} />
          </div>
          <div>
            <span className="text-[13px] font-medium text-ink-2">{t("team.color")}</span>
            <ColorPicker value={form.color} onChange={(color) => setForm({ ...form, color })} />
          </div>
          <Button
            disabled={busy}
            onClick={() =>
              run(() => updateEmployee(employee.id, { ...form, phone: form.phone || null }))
            }
          >
            {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
            {t("common.save")}
          </Button>

          <div className="rounded-xl bg-card-2 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <KeyRound size={16} />
              {t("team.resetPin")}
            </p>
            <p className="mt-0.5 text-xs text-muted">{t("team.resetPinHelp")}</p>
            <div className="mt-2 flex gap-2">
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="••••"
                className="h-10 w-32 rounded-xl border border-line bg-card px-3 text-[16px] tracking-[0.3em] outline-none focus:border-accent md:text-sm"
              />
              <Button
                size="sm"
                variant="secondary"
                className="h-10"
                disabled={busy || pin.length < 4}
                onClick={() => run(async () => {
                  await resetEmployeePin(employee.id, pin);
                  setPin("");
                })}
              >
                {t("profile.savePin")}
              </Button>
            </div>
          </div>

          {!isMe && (
            <div>
              <Button
                variant="secondary"
                disabled={busy}
                className={employee.active ? "text-danger" : ""}
                onClick={() => run(() => updateEmployee(employee.id, { active: !employee.active }))}
              >
                <Power size={16} />
                {employee.active ? t("team.deactivate") : t("team.reactivate")}
              </Button>
              {employee.active && <p className="mt-1 text-xs text-muted">{t("team.deactivateHelp")}</p>}
            </div>
          )}

          {message && <Notice tone={message.tone}>{message.text}</Notice>}
        </div>
      )}
    </li>
  );
}

export default function TeamPage() {
  const { t } = useI18n();
  const me = useMe();
  const loader = useCallback(() => getEmployees(), []);
  const { data: team, error, reload } = useResource(loader);
  const [adding, setAdding] = useState(false);

  return (
    <AppShell title={t("team.title")} subtitle={t("team.subtitle")} back="/settings" feature="team">
      <div className="mx-auto max-w-3xl space-y-4 pb-8">
        <PageHeading
          eyebrow={t("nav.management")}
          title={t("team.title")}
          subtitle={t("team.subtitle")}
          actions={
            !adding && (
              <Button onClick={() => setAdding(true)}>
                <UserPlus size={17} />
                {t("team.add")}
              </Button>
            )
          }
        />

        <ErrorBox error={error} onRetry={reload} className="mt-4" />

        {!adding && (
          <div className="px-4 pt-4 md:hidden">
            <Button className="w-full" onClick={() => setAdding(true)}>
              <UserPlus size={17} />
              {t("team.add")}
            </Button>
          </div>
        )}

        {adding && (
          <AddForm
            onCancel={() => setAdding(false)}
            onAdded={() => {
              setAdding(false);
              reload();
            }}
          />
        )}

        {!team && !error ? (
          <Spinner />
        ) : team ? (
          <ul className="divide-y divide-line md:space-y-3 md:divide-y-0">
            {team.map((employee) => (
              <EmployeeCard
                key={`${employee.id}-${employee.role}-${employee.color}-${employee.active}`}
                employee={employee}
                isMe={employee.id === me?.id}
                onChanged={reload}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </AppShell>
  );
}
