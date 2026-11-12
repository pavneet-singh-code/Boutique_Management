"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search, UserPlus, Users, X } from "lucide-react";
import AppShell, { HeaderIconButton } from "../../components/AppShell";
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorBox,
  Notice,
  PageHeading,
  Spinner,
  StatTile,
} from "../../components/ui";
import { createCustomer, getCustomers, mergeCustomers } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { formatMoney, friendlyDate, similarNames } from "../../lib/orders";
import { useResource } from "../../lib/useResource";
import { useCan } from "../../lib/roles";

const DISMISSED_KEY = "fab_art_not_same_customers";

function readDismissed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveDismissed(set) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
  } catch {
    // Not remembered on this device; fine.
  }
}

/** Pairs of customers whose names look alike ("Same person?"). */
function findLookAlikes(customers, dismissed) {
  const pairs = [];
  for (let i = 0; i < customers.length; i += 1) {
    for (let j = i + 1; j < customers.length; j += 1) {
      const a = customers[i];
      const b = customers[j];
      const key = [a.id, b.id].sort((x, y) => x - y).join("-");
      if (!dismissed.has(key) && similarNames(a.name, b.name)) {
        // Keep the one with more orders.
        const [keep, other] = a.order_count >= b.order_count ? [a, b] : [b, a];
        pairs.push({ key, keep, other });
      }
    }
  }
  return pairs;
}

function AddCustomer({ onAdded }) {
  const { t, tError } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <UserPlus size={17} />
        {t("customers.add")}
      </Button>
    );
  }

  const save = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const customer = await createCustomer({ name, phone: phone || null });
      setOpen(false);
      setName("");
      setPhone("");
      onAdded(customer);
    } catch (err) {
      setError(tError(err));
    } finally {
      setSaving(false);
    }
  };

  const input =
    "h-11 w-full rounded-xl border border-line bg-card px-3.5 text-[16px] outline-none focus:border-accent md:text-sm";
  return (
    <form onSubmit={save} className="w-full space-y-2 rounded-2xl border border-line bg-card p-4 md:w-96">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("customers.name")} className={input} autoFocus />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("customers.phone")} inputMode="tel" className={input} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" size="sm" disabled={saving || !name.trim()}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}

export default function CustomersPage() {
  const { t, locale, tError } = useI18n();
  const loader = useCallback(() => getCustomers({ force: true }), []);
  const { data: customers, error, loading, reload } = useResource(loader, true, "customers");
  const [search, setSearch] = useState("");
  const [dismissed, setDismissed] = useState(readDismissed);
  const canMerge = useCan("mergeCustomers");
  const [merging, setMerging] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mergeError, setMergeError] = useState("");

  const sorted = useMemo(
    () =>
      [...(customers || [])].sort((a, b) =>
        String(b.last_order_date || "").localeCompare(String(a.last_order_date || ""))
      ),
    [customers]
  );
  const lookAlikes = useMemo(() => findLookAlikes(sorted, dismissed), [sorted, dismissed]);

  const query = search.trim().toLowerCase();
  const visible = query
    ? sorted.filter((c) => c.name.toLowerCase().includes(query) || (c.phone || "").includes(query))
    : sorted;
  const repeat = sorted.filter((c) => c.order_count > 1).length;

  const notSame = (pair) => {
    const next = new Set(dismissed);
    next.add(pair.key);
    setDismissed(next);
    saveDismissed(next);
  };

  const confirmMerge = async () => {
    setBusy(true);
    setMergeError("");
    try {
      await mergeCustomers(merging.keep.id, merging.other.id);
      setMerging(null);
      await reload();
    } catch (err) {
      setMergeError(tError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      feature="customers"
      back
      title={t("customers.title")}
      subtitle={t("customers.subtitle")}
      actions={
        <HeaderIconButton label={t("common.refresh")} onClick={reload}>
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </HeaderIconButton>
      }
    >
      <PageHeading eyebrow={t("nav.management")} title={t("customers.title")} subtitle={t("customers.subtitle")} />

      <div className="flex flex-col gap-3 bg-card px-4 pb-2 pt-3 md:mb-6 md:flex-row md:items-start md:bg-transparent md:p-0">
        <label className="flex h-11 flex-1 items-center gap-3 rounded-full bg-card-2 px-4 md:max-w-md md:rounded-xl md:border md:border-line md:bg-card">
          <Search size={19} className="shrink-0 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("customers.search")}
            aria-label={t("common.search")}
            className="w-full bg-transparent text-[16px] outline-none placeholder:text-muted md:text-sm"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label={t("common.close")}>
              <X size={17} className="text-muted" />
            </button>
          )}
        </label>
        <AddCustomer onAdded={() => reload()} />
      </div>

      <ErrorBox error={error} onRetry={reload} className="my-4" />
      {mergeError && <Notice tone="error" className="mx-4 my-3 md:mx-0">{mergeError}</Notice>}

      {!customers && !error ? (
        <Spinner />
      ) : customers ? (
        <>
          <div className="mb-6 hidden grid-cols-3 gap-4 md:grid">
            <StatTile label={t("customers.total")} value={customers.length} icon={Users} />
            <StatTile label={t("customers.repeat")} value={repeat} />
            <StatTile
              label={t("dash.toCollect")}
              value={formatMoney(customers.reduce((s, c) => s + c.balance_due, 0), locale)}
            />
          </div>

          {/* "Same person?" suggestions */}
          {!query && canMerge && lookAlikes.length > 0 && (
            <Card className="mx-4 my-3 overflow-hidden md:mx-0 md:mb-6 md:mt-0">
              <div className="border-b border-line px-4 py-3">
                <h2 className="font-semibold text-ink">{t("customers.sameTitle")}</h2>
                <p className="text-sm text-muted">{t("customers.sameHelp")}</p>
              </div>
              <ul className="divide-y divide-line">
                {lookAlikes.slice(0, 5).map((pair) => (
                  <li key={pair.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Avatar name={pair.keep.name} seed={`c${pair.keep.id}`} size={32} />
                      <span className="truncate font-medium text-ink">{pair.keep.name}</span>
                      <span className="text-muted">≈</span>
                      <Avatar name={pair.other.name} seed={`c${pair.other.id}`} size={32} />
                      <span className="truncate font-medium text-ink">{pair.other.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setMerging(pair)}>
                        {t("customers.mergeBtn")}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => notSame(pair)}>
                        {t("customers.notSame")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {visible.length === 0 ? (
            <EmptyState icon={Users} title={t("customers.empty")} />
          ) : (
            <ul className="bg-card md:grid md:grid-cols-2 md:gap-3 md:bg-transparent xl:grid-cols-3">
              {visible.map((customer) => (
                <li key={customer.id}>
                  <Link
                    href={`/customers/${customer.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-card-2 md:rounded-2xl md:border md:border-line md:bg-card md:p-4 md:shadow-sm"
                  >
                    <Avatar name={customer.name} seed={`c${customer.id}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-[16.5px] font-medium text-ink">{customer.name}</p>
                        <span className="shrink-0 text-xs text-muted">
                          {customer.last_order_date ? friendlyDate(customer.last_order_date, t, locale) : ""}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="truncate text-[14.5px] text-muted">
                          {t("customers.orders", {
                            count: customer.order_count,
                            value: formatMoney(customer.total_value, locale),
                          })}
                        </p>
                        {customer.balance_due > 0 ? (
                          <span className="shrink-0 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn-ink">
                            {t("customers.due", { value: formatMoney(customer.balance_due, locale) })}
                          </span>
                        ) : customer.order_count > 1 ? (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">
                            {customer.order_count}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      <ConfirmDialog
        open={Boolean(merging)}
        tone="primary"
        title={merging ? t("customers.mergeTitle", { other: merging.other.name, name: merging.keep.name }) : ""}
        body={merging ? t("customers.mergeBody", { other: merging.other.name, name: merging.keep.name }) : ""}
        confirmLabel={t("customers.mergeBtn")}
        busy={busy}
        onCancel={() => setMerging(null)}
        onConfirm={confirmMerge}
      />
    </AppShell>
  );
}
