"use client";

import Link from "next/link";
import { useI18n } from "../lib/i18n";
import { formatMoney, groupCustomers } from "../lib/orders";
import { Avatar, Card, cx } from "./ui";

/** "+12% vs last month" in a calm tone (no alarm colors for business swings). */
export function Change({ now, before }) {
  const { t } = useI18n();
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  const sign = pct > 0 ? "+" : "";
  return (
    <span className={cx("text-xs", pct >= 0 ? "text-accent-ink" : "text-muted")}>
      {sign}
      {pct}% {t("monthly.vsLast")}
    </span>
  );
}

export function TopCustomers({ orders, limit = 5 }) {
  const { t, locale } = useI18n();
  const top = groupCustomers(orders)
    .sort((a, b) => b.total - a.total || b.orders.length - a.orders.length)
    .slice(0, limit);
  if (top.length === 0) return null;
  const max = top[0].total || 1;

  return (
    <Card className="mx-4 overflow-hidden md:mx-0">
      <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink md:px-5">
        {t("monthly.topCustomers")}
      </h2>
      <ul className="divide-y divide-line">
        {top.map((customer) => (
          <li key={customer.key}>
            <Link
              href={`/customers/${encodeURIComponent(customer.key)}`}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-card-2 md:px-5"
            >
              <Avatar name={customer.name} seed={customer.key} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[15px] font-medium text-ink">
                    {customer.name || t("common.unknownCustomer")}
                  </p>
                  <p className="shrink-0 text-sm font-semibold text-ink">
                    {formatMoney(customer.total, locale)}
                  </p>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-card-2">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${(customer.total / max) * 100}%` }}
                    />
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {customer.orders.length === 1
                      ? t("common.orderCountOne")
                      : t("common.orderCount", { count: customer.orders.length })}
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function compactMoney(value, locale) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(value >= 1000000 ? 0 : 1)}L`;
  if (value >= 1000) return `₹${Math.round(value / 1000)}k`;
  return formatMoney(value, locale);
}
