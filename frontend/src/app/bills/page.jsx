"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { FilePlus, ReceiptIndianRupee, RefreshCw } from "lucide-react";
import AppShell, { HeaderIconButton } from "../../components/AppShell";
import { BillStatus } from "../../components/Bills";
import {
  Avatar,
  Chip,
  EmptyState,
  ErrorBox,
  LinkButton,
  PageHeading,
  Spinner,
  StatTile,
} from "../../components/ui";
import { getBills } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { formatDate, formatMoney } from "../../lib/orders";
import { useResource } from "../../lib/useResource";
import { useCan } from "../../lib/roles";

export default function BillsPage() {
  const { t, locale } = useI18n();
  const loader = useCallback(() => getBills(), []);
  const { data: bills, error, loading, reload } = useResource(loader, true, "bills");
  const [filter, setFilter] = useState("unpaid");
  const canBill = useCan("makeBills");

  const visible = useMemo(() => {
    if (!bills) return [];
    if (filter === "unpaid") return bills.filter((b) => b.status !== "paid");
    if (filter === "paid") return bills.filter((b) => b.status === "paid");
    return bills;
  }, [bills, filter]);

  const toCollect = (bills || [])
    .filter((b) => b.status !== "paid")
    .reduce((sum, b) => sum + b.amount_due, 0);

  return (
    <AppShell
      feature="bills"
      title={t("bills.title")}
      subtitle={t("bills.subtitle")}
      back="/dashboard"
      actions={
        <HeaderIconButton label={t("common.refresh")} onClick={reload}>
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </HeaderIconButton>
      }
      fab={canBill ? { href: "/bills/new", label: t("bills.new"), icon: FilePlus } : null}
    >
      <PageHeading
        eyebrow={t("nav.ordersSection")}
        title={t("bills.title")}
        subtitle={t("bills.subtitle")}
        actions={
          canBill && (
            <LinkButton href="/bills/new">
              <FilePlus size={17} />
              {t("bills.new")}
            </LinkButton>
          )
        }
      />

      <ErrorBox error={error} onRetry={reload} className="my-4" />

      {!bills && !error ? (
        <Spinner />
      ) : bills ? (
        <>
          <div className="grid grid-cols-2 gap-3 px-4 pt-3 md:mb-5 md:max-w-xl md:px-0 md:pt-0">
            <StatTile tone="accent" label={t("bills.balanceToCollect")} value={formatMoney(toCollect, locale)} />
            <StatTile label={t("bills.unpaid")} value={bills.filter((b) => b.status !== "paid").length} />
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3 md:px-0">
            {["unpaid", "paid", "all"].map((key) => (
              <Chip key={key} active={filter === key} onClick={() => setFilter(key)}>
                {key === "all" ? t("common.all") : t(`bills.${key}`)}
              </Chip>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyState icon={ReceiptIndianRupee} title={t("bills.empty")} />
          ) : (
            <ul className="bg-card md:overflow-hidden md:rounded-2xl md:border md:border-line">
              {visible.map((bill) => (
                <li key={bill.id}>
                  <Link
                    href={`/bills/${bill.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-card-2"
                  >
                    <Avatar name={bill.customer.name} seed={`c${bill.customer.id}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-[16.5px] font-medium text-ink">{bill.customer.name}</p>
                        <span className="shrink-0 text-xs text-muted">{formatDate(bill.issued_on, locale)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="truncate text-[14.5px] text-muted">
                          {bill.bill_number} ·{" "}
                          {bill.lines.length === 1
                            ? t("bills.suitOne")
                            : t("bills.suits", { count: bill.lines.length })}
                        </p>
                        <span className="shrink-0 text-sm font-semibold text-ink">
                          {formatMoney(bill.amount_due, locale)}
                        </span>
                      </div>
                      <div className="mt-1">
                        <BillStatus status={bill.status} />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </AppShell>
  );
}
