"use client";

import { useCallback, useState } from "react";
import { LoaderCircle, Save, Store } from "lucide-react";
import { getAppSettings, saveAppSettings } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useResource } from "../lib/useResource";
import { Button, Card, Notice, Spinner } from "./ui";

const inputClass =
  "mt-1.5 h-12 w-full rounded-xl border border-line bg-card px-3.5 text-[16px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 md:h-11 md:text-sm";

function Form({ initial }) {
  const { t, tError } = useI18n();
  const [form, setForm] = useState(() => ({
    boutique_name: initial.boutique_name || "Fab_art Studio",
    upi_id: initial.upi_id || "",
    phone: initial.phone || "",
    address: initial.address || "",
    bill_note: initial.bill_note || "",
  }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await saveAppSettings(form);
      setMessage({ tone: "success", text: t("customers.saved") });
    } catch (err) {
      setMessage({ tone: "error", text: tError(err) });
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, props = {}) => (
    <label className="block">
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      <input value={form[name]} onChange={set(name)} className={inputClass} {...props} />
      {props.help && <span className="mt-1 block text-xs text-muted">{props.help}</span>}
    </label>
  );

  return (
    <form onSubmit={save} className="space-y-4 px-4 pb-4 md:px-5 md:pb-5">
      {field("boutique_name", t("settings.boutiqueName"))}
      <label className="block">
        <span className="text-[13px] font-medium text-ink-2">{t("settings.upiId")}</span>
        <input
          value={form.upi_id}
          onChange={set("upi_id")}
          placeholder="9876543210@ybl"
          autoCapitalize="none"
          className={inputClass}
        />
        <span className="mt-1 block text-xs text-muted">{t("settings.upiHelp")}</span>
      </label>
      {field("phone", t("settings.boutiquePhone"), { inputMode: "tel" })}
      {field("address", t("settings.address"))}
      {field("bill_note", t("settings.billNote"), { placeholder: t("bills.thanks") })}
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <Button type="submit" disabled={saving}>
        {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
        {t("settings.saveDetails")}
      </Button>
    </form>
  );
}

export default function BoutiqueDetails() {
  const { t } = useI18n();
  const loader = useCallback(() => getAppSettings(), []);
  const { data, error } = useResource(loader);

  return (
    <Card className="overflow-hidden rounded-none border-x-0 md:rounded-2xl md:border-x">
      <div className="flex items-center gap-4 px-4 py-3.5 md:px-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card-2 text-ink-2">
          <Store size={20} />
        </span>
        <span>
          <span className="block text-[16px] text-ink">{t("settings.boutique")}</span>
          <span className="block text-[13.5px] text-muted">{t("settings.boutiqueHelp")}</span>
        </span>
      </div>
      {error ? (
        <Notice tone="error" className="mx-4 mb-4">
          {error.message}
        </Notice>
      ) : data ? (
        <Form initial={data} />
      ) : (
        <Spinner />
      )}
    </Card>
  );
}
