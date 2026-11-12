"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Combine, LoaderCircle, ReceiptIndianRupee, Save, Search, Trash2 } from "lucide-react";
import AppShell from "../../../../components/AppShell";
import { BillStatus } from "../../../../components/Bills";
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  ErrorBox,
  Notice,
  PageHeading,
  Spinner,
  StatTile,
} from "../../../../components/ui";
import {
  deleteCustomer,
  getCustomer,
  getCustomers,
  mergeCustomers,
  updateCustomer,
} from "../../../../lib/api";
import { useI18n } from "../../../../lib/i18n";
import { formatDate, formatMoney } from "../../../../lib/orders";
import { useResource } from "../../../../lib/useResource";
import { useCan, useMe } from "../../../../lib/roles";
import ActivityList from "../../../../components/ActivityList";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 text-[16px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 md:text-sm";

function DetailsForm({ customer, onSaved }) {
  const { t, tError } = useI18n();
  const [form, setForm] = useState({
    name: customer.name,
    phone: customer.phone || "",
    notes: customer.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateCustomer(customer.id, {
        name: form.name,
        phone: form.phone || null,
        notes: form.notes || null,
      });
      setMessage({ tone: "success", text: t("customers.saved") });
      onSaved();
    } catch (err) {
      setMessage({ tone: "error", text: tError(err) });
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  return (
    <Card className="mx-4 space-y-4 p-4 md:mx-0 md:p-6">
      <h2 className="font-semibold text-ink">{t("customers.edit")}</h2>
      <form onSubmit={save} className="space-y-4">
        <label className="block">
          <span className="text-[13px] font-medium text-ink-2">{t("customers.name")}</span>
          <input value={form.name} onChange={set("name")} required className={`${inputClass} h-12 md:h-11`} />
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-ink-2">{t("customers.phone")}</span>
          <input value={form.phone} onChange={set("phone")} inputMode="tel" className={`${inputClass} h-12 md:h-11`} />
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-ink-2">{t("customers.notes")}</span>
          <textarea
            rows={4}
            value={form.notes}
            onChange={set("notes")}
            placeholder={t("customers.notesHelp")}
            className={`${inputClass} py-3 leading-6`}
          />
        </label>
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <Button type="submit" disabled={saving || !form.name.trim()}>
          {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
          {t("common.save")}
        </Button>
      </form>
    </Card>
  );
}

function MergeBox({ customer, onMerged }) {
  const { t, tError } = useI18n();
  const loader = useCallback(() => getCustomers({ force: true }), []);
  const { data: customers } = useResource(loader);
  const [query, setQuery] = useState("");
  const [other, setOther] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !customers) return [];
    return customers
      .filter((c) => c.id !== customer.id && (c.name.toLowerCase().includes(q) || (c.phone || "").includes(q)))
      .slice(0, 5);
  }, [customers, query, customer.id]);

  const merge = async () => {
    setBusy(true);
    setError("");
    try {
      await mergeCustomers(customer.id, other.id);
      setOther(null);
      setQuery("");
      onMerged();
    } catch (err) {
      setError(tError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mx-4 p-4 md:mx-0 md:p-6">
      <h2 className="flex items-center gap-2 font-semibold text-ink">
        <Combine size={18} />
        {t("customers.merge")}
      </h2>
      <p className="mt-1 text-sm text-muted">{t("customers.mergeHelp")}</p>
      <label className="mt-3 flex h-11 items-center gap-3 rounded-full bg-card-2 px-4 md:rounded-xl">
        <Search size={18} className="text-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("customers.mergePick")}
          className="w-full bg-transparent text-[16px] outline-none md:text-sm"
        />
      </label>
      {matches.length > 0 && (
        <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
          {matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setOther(c)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-card-2"
              >
                <Avatar name={c.name} seed={`c${c.id}`} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] text-ink">{c.name}</span>
                  <span className="block text-xs text-muted">
                    {t("customers.existing", { count: c.order_count })}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <Notice tone="error" className="mt-3">{error}</Notice>}
      <ConfirmDialog
        open={Boolean(other)}
        tone="primary"
        title={other ? t("customers.mergeTitle", { other: other.name, name: customer.name }) : ""}
        body={other ? t("customers.mergeBody", { other: other.name, name: customer.name }) : ""}
        confirmLabel={t("customers.mergeBtn")}
        busy={busy}
        onCancel={() => setOther(null)}
        onConfirm={merge}
      />
    </Card>
  );
}

export default function CustomerInfoPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, locale, tError } = useI18n();
  const loader = useCallback(() => getCustomer(id), [id]);
  const { data: customer, error, reload } = useResource(loader);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const canMerge = useCan("mergeCustomers");
  const me = useMe();

  const remove = async () => {
    try {
      await deleteCustomer(customer.id);
      router.replace("/customers");
    } catch (err) {
      setDeleteError(tError(err));
      setConfirmDelete(false);
    }
  };

  if (!customer) {
    return (
      <AppShell
      feature="customers" title={t("customers.info")} back={`/customers/${id}`} hideTabs>
        <ErrorBox error={error} onRetry={reload} className="mt-4" />
        {!error && <Spinner />}
      </AppShell>
    );
  }

  return (
    <AppShell
      feature="customers" title={t("customers.info")} back={`/customers/${customer.id}`} hideTabs>
      <div className="mx-auto max-w-2xl space-y-4 pb-8">
        <PageHeading eyebrow={t("customers.title")} title={customer.name} subtitle={customer.phone} />

        <div className="flex flex-col items-center bg-card px-4 pb-5 pt-6 text-center md:hidden">
          <Avatar name={customer.name} seed={`c${customer.id}`} size={88} />
          <h1 className="mt-3 text-2xl font-semibold text-ink">{customer.name}</h1>
          {customer.phone && <p className="text-[15px] text-muted">{customer.phone}</p>}
        </div>

        <div className="grid grid-cols-3 gap-2 px-4 md:px-0">
          <StatTile label={t("dash.orders")} value={customer.order_count} />
          <StatTile label={t("pay.received")} value={formatMoney(customer.received, locale)} />
          <StatTile label={t("pay.balance")} value={formatMoney(customer.balance_due, locale)} />
        </div>

        <DetailsForm key={customer.id + (customer.notes || "")} customer={customer} onSaved={reload} />

        {customer.bills.length > 0 && (
          <Card className="mx-4 overflow-hidden md:mx-0">
            <h2 className="border-b border-line px-4 py-3 font-semibold text-ink md:px-6">{t("customers.bills")}</h2>
            <ul className="divide-y divide-line">
              {customer.bills.map((bill) => (
                <li key={bill.id}>
                  <Link href={`/bills/${bill.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-card-2 md:px-6">
                    <ReceiptIndianRupee size={20} className="text-accent-ink" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium text-ink">{bill.bill_number}</span>
                      <span className="block text-xs text-muted">{formatDate(bill.issued_on, locale)}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold">{formatMoney(bill.amount_due, locale)}</span>
                      <BillStatus status={bill.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {canMerge && <MergeBox customer={customer} onMerged={reload} />}

        <Card className="mx-4 overflow-hidden md:mx-0">
          <h2 className="border-b border-line px-4 py-3 font-semibold text-ink md:px-6">{t("activity.history")}</h2>
          <ActivityList entity="customer" entityId={customer.id} meId={me?.id} pageSize={10} />
        </Card>

        {canMerge && customer.order_count === 0 && (
          <div className="px-4 md:px-0">
            {deleteError && <Notice tone="error" className="mb-3">{deleteError}</Notice>}
            <Button variant="secondary" onClick={() => setConfirmDelete(true)} className="text-danger">
              <Trash2 size={16} />
              {t("customers.delete")}
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={t("customers.delete")}
        body={customer.name}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </AppShell>
  );
}
