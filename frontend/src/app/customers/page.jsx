"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users, X } from "lucide-react";
import AppShell from "../../components/AppShell";
import {
  Avatar,
  EmptyState,
  ErrorBox,
  PageHeading,
  Spinner,
  StatTile,
} from "../../components/ui";
import { useI18n } from "../../lib/i18n";
import { formatMoney, friendlyDate, groupCustomers } from "../../lib/orders";
import { useOrders } from "../../lib/useOrders";

export default function CustomersPage() {
  const { t, locale } = useI18n();
  const { orders, ready, error, reload } = useOrders();
  const [search, setSearch] = useState("");

  const customers = useMemo(
    () =>
      groupCustomers(orders).sort(
        (a, b) => (b.lastDate?.getTime() ?? 0) - (a.lastDate?.getTime() ?? 0)
      ),
    [orders]
  );

  const query = search.trim().toLowerCase();
  const visible = query
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.contact.includes(query) ||
          c.key.includes(query.replace(/\s+/g, ""))
      )
    : customers;
  const repeat = customers.filter((c) => c.orders.length > 1).length;

  return (
    <AppShell title={t("customers.title")} subtitle={t("customers.subtitle")}>
      <PageHeading
        eyebrow={t("nav.management")}
        title={t("customers.title")}
        subtitle={t("customers.subtitle")}
      />

      <div className="bg-card px-4 pb-2 pt-3 md:mb-6 md:bg-transparent md:p-0">
        <label className="flex h-11 items-center gap-3 rounded-full bg-card-2 px-4 md:max-w-md md:rounded-xl md:border md:border-line md:bg-card">
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
      </div>

      <ErrorBox error={error} onRetry={() => reload()} className="my-4" />

      {!ready && !error ? (
        <Spinner />
      ) : ready ? (
        <>
          <div className="mb-6 hidden grid-cols-3 gap-4 md:grid">
            <StatTile label={t("customers.total")} value={customers.length} icon={Users} />
            <StatTile label={t("customers.repeat")} value={repeat} />
            <StatTile label={t("dash.orders")} value={orders.length} />
          </div>

          {visible.length === 0 ? (
            <EmptyState icon={Users} title={t("customers.empty")} />
          ) : (
            <ul className="bg-card md:grid md:grid-cols-2 md:gap-3 md:bg-transparent xl:grid-cols-3">
              {visible.map((customer) => {
                const name = customer.name || t("common.unknownCustomer");
                return (
                  <li key={customer.key}>
                    <Link
                      href={`/customers/${encodeURIComponent(customer.key)}`}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-card-2 md:rounded-2xl md:border md:border-line md:bg-card md:p-4 md:shadow-sm"
                    >
                      <Avatar name={customer.name} seed={customer.key} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-[16.5px] font-medium text-ink">{name}</p>
                          <span className="shrink-0 text-xs text-muted">
                            {customer.lastDate ? friendlyDate(customer.lastDate, t, locale) : ""}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p className="truncate text-[14.5px] text-muted">
                            {t("customers.orders", {
                              count: customer.orders.length,
                              value: formatMoney(customer.total, locale),
                            })}
                          </p>
                          {customer.orders.length > 1 && (
                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">
                              {customer.orders.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}
    </AppShell>
  );
}
