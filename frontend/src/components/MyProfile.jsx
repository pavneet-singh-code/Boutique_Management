"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, KeyRound, LoaderCircle, LogOut, Save } from "lucide-react";
import { changeMyPin, logoutEverywhere, updateMyProfile } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useMe } from "../lib/roles";
import { Button, Card, EmployeeAvatar, Notice, cx } from "./ui";

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-line bg-card px-3.5 text-[16px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 md:h-11 md:text-sm";

function DetailsForm({ me }) {
  const { t, tError } = useI18n();
  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState(me.phone || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await updateMyProfile({ name, phone: phone || null });
      setMessage({ tone: "success", text: t("team.saved") });
    } catch (err) {
      setMessage({ tone: "error", text: tError(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <label className="block">
        <span className="text-[13px] font-medium text-ink-2">{t("team.name")}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
      </label>
      <label className="block">
        <span className="text-[13px] font-medium text-ink-2">{t("team.phone")}</span>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputClass} />
      </label>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <Button type="submit" size="sm" disabled={busy || !name.trim()}>
        {busy ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
        {t("common.save")}
      </Button>
    </form>
  );
}

function PinForm({ me }) {
  const { t, tError } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const digits = (value) => value.replace(/\D/g, "").slice(0, 6);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await changeMyPin(next, current);
      setCurrent("");
      setNext("");
      setMessage({ tone: "success", text: t("profile.pinSaved") });
    } catch (err) {
      setMessage({ tone: "error", text: tError(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
        <KeyRound size={16} />
        {me.has_pin ? t("profile.changePin") : t("profile.setPin")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {me.has_pin && (
          <label className="block">
            <span className="text-[13px] font-medium text-ink-2">{t("profile.currentPin")}</span>
            <input
              type="password"
              inputMode="numeric"
              value={current}
              onChange={(e) => setCurrent(digits(e.target.value))}
              className={`${inputClass} tracking-[0.3em]`}
            />
          </label>
        )}
        <label className="block">
          <span className="text-[13px] font-medium text-ink-2">{t("profile.newPin")}</span>
          <input
            type="password"
            inputMode="numeric"
            value={next}
            onChange={(e) => setNext(digits(e.target.value))}
            className={`${inputClass} tracking-[0.3em]`}
          />
        </label>
      </div>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <Button type="submit" size="sm" disabled={busy || next.length < 4}>
        {busy ? <LoaderCircle size={15} className="animate-spin" /> : <KeyRound size={15} />}
        {t("profile.savePin")}
      </Button>
    </form>
  );
}

/** Settings header: who is logged in, their details and PIN. */
export default function MyProfile() {
  const { t, tError } = useI18n();
  const router = useRouter();
  const me = useMe();
  const needsSetup = me && (!me.phone || !me.has_pin);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  if (!me) return null;

  const signOutEverywhere = async () => {
    try {
      await logoutEverywhere();
      router.replace("/login");
    } catch (err) {
      setError(tError(err));
    }
  };

  const expanded = open || needsSetup;

  return (
    <Card className="overflow-hidden rounded-none border-x-0 md:rounded-2xl md:border-x">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-4 px-4 py-4 text-left md:px-5"
      >
        <EmployeeAvatar employee={me} size={64} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xl font-semibold text-ink">{me.name}</span>
          <span className="block text-sm text-muted">
            {t("profile.code")}: {me.employee_code} · {t(`role.${me.role}`)}
          </span>
          {me.phone && <span className="block text-sm text-muted">{me.phone}</span>}
        </span>
        <ChevronDown size={18} className={cx("shrink-0 text-muted transition", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-line px-4 py-4 md:px-5">
          {needsSetup && (
            <Notice tone="warn">{t("profile.setupHelp")}</Notice>
          )}
          <DetailsForm me={me} />
          <div className="border-t border-line pt-4">
            <PinForm me={me} />
          </div>
          <div className="border-t border-line pt-4">
            <Button variant="secondary" size="sm" onClick={signOutEverywhere} className="text-danger">
              <LogOut size={15} />
              {t("profile.logoutEverywhere")}
            </Button>
            <p className="mt-1 text-xs text-muted">{t("profile.logoutEverywhereHelp")}</p>
            {error && <Notice tone="error" className="mt-2">{error}</Notice>}
          </div>
        </div>
      )}
    </Card>
  );
}
