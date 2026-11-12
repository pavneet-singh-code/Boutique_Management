"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ClipboardList } from "lucide-react";
import AppShell from "../../components/AppShell";
import BarChart from "../../components/BarChart";
import { PeriodStepper, ReportTabs } from "../../components/PeriodPicker";
import { TopCustomers, compactMoney } from "../../components/Reports";
import {
  Card,
  EmptyState,
  ErrorBox,
  LinkButton,
  PageHeading,
  Spinner,
  StatTile,
} from "../../components/ui";
import { useI18n } from "../../lib/i18n";
import {
  formatMoney,
  formatMonth,
  groupCustomers,
  monthRange,
  orderDate,
  pad,
  receivedBetween,
  summarise,
} from "../../lib/orders";
import { useOrders } from "../../lib/useOrders";

export default function YearlyReviewPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { orders, ready, error, reload } = useOrders();
  const [year, setYear] = useState(() => new Date().getFullYear());

  const report = useMemo(() => {
    const inYear = orders.filter((order) => orderDate(order)?.getFullYear() === year);
    const months = Array.from({ length: 12 }, (_, index) => {
      const key = `${year}-${pad(index + 1)}`;
      const list = inYear.filter((order) => orderDate(order).getMonth() === index);
      // Money received in this month (by payment dates), whatever the order date.
      const received = receivedBetween(orders, ...monthRange(key));
      return { key, list, stats: summarise(list), received };
    });
    const best = months.reduce(
      (top, month) => (month.stats.value > (top?.stats.value ?? 0) ? month : top),
      null
    );
    return {
      inYear,
      stats: summarise(inYear),
      received: receivedBetween(orders, new Date(year, 0, 1), new Date(year, 11, 31, 23, 59, 59)),
      customers: groupCustomers(inYear).length,
      months,
      best,
    };
  }, [orders, year]);

  const monthLabel = (key) => formatMonth(key, locale, true).split(" ")[0];
  const countData = report.months.map((m) => ({
    key: m.key,
    label: formatMonth(m.key, locale),
    tick: monthLabel(m.key),
    value: m.stats.count,
  }));
  const valueData = report.months.map((m) => ({
    key: m.key,
    label: formatMonth(m.key, locale),
    tick: monthLabel(m.key),
    value: m.stats.value,
  }));
  const { stats } = report;

  return (
    <AppShell
      feature="reports" title={t("yearly.title")} subtitle={t("yearly.subtitle")}>
      <ReportTabs current="year" />
      <PageHeading
        eyebrow={t("nav.overview")}
        title={t("yearly.title")}
        subtitle={t("yearly.subtitle")}
        actions={
          <LinkButton href="/monthly-review" variant="secondary">
            <CalendarDays size={17} />
            {t("nav.monthly")}
          </LinkButton>
        }
      />

      <div className="px-4 py-3 md:mb-6 md:max-w-xs md:px-0 md:py-0">
        <PeriodStepper
          label={String(year)}
          onPrev={() => setYear(year - 1)}
          onNext={() => setYear(year + 1)}
          nextDisabled={year >= new Date().getFullYear()}
        />
      </div>

      <ErrorBox error={error} onRetry={() => reload()} className="my-4" />

      {!ready && !error ? (
        <Spinner />
      ) : ready ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 px-4 md:gap-4 md:px-0 lg:grid-cols-3 xl:grid-cols-6">
            <StatTile tone="accent" label={t("dash.orders")} value={stats.count} />
            <StatTile label={t("dash.value")} value={formatMoney(stats.value, locale)} />
            <StatTile label={t("pay.received")} value={formatMoney(report.received, locale)} />
            <StatTile label={t("dash.balance")} value={formatMoney(stats.balance, locale)} />
            <StatTile label={t("yearly.customers")} value={report.customers} />
            <StatTile
              label={t("yearly.bestMonth")}
              value={report.best ? formatMonth(report.best.key, locale, true) : "—"}
              note={report.best ? formatMoney(report.best.stats.value, locale) : null}
            />
          </div>

          {stats.count === 0 ? (
            <Card className="mx-4 md:mx-0">
              <EmptyState icon={ClipboardList} title={t("yearly.noData")} />
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="mx-4 p-4 md:mx-0 md:p-6">
                  <h2 className="mb-4 text-sm font-semibold text-ink">{t("yearly.ordersPerMonth")}</h2>
                  <BarChart
                    data={countData}
                    ariaLabel={t("yearly.ordersPerMonth")}
                    tooltip={(d) => t("chart.tooltipOrders", { label: d.label, value: d.value })}
                  />
                </Card>
                <Card className="mx-4 p-4 md:mx-0 md:p-6">
                  <h2 className="mb-4 text-sm font-semibold text-ink">{t("yearly.valuePerMonth")}</h2>
                  <BarChart
                    data={valueData}
                    ariaLabel={t("yearly.valuePerMonth")}
                    format={(v) => compactMoney(v, locale)}
                    tooltip={(d) =>
                      t("chart.tooltipValue", { label: d.label, value: formatMoney(d.value, locale) })
                    }
                  />
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[3fr_2fr]">
                {/* Table view of the same numbers */}
                <Card className="mx-4 overflow-hidden md:mx-0">
                  <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink md:px-5">
                    {t("yearly.table")}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-card-2 text-xs text-muted">
                          <th className="px-4 py-2.5 font-medium md:px-5">{t("reports.month")}</th>
                          <th className="px-3 py-2.5 text-right font-medium">{t("dash.orders")}</th>
                          <th className="px-3 py-2.5 text-right font-medium">{t("dash.value")}</th>
                          <th className="px-4 py-2.5 text-right font-medium md:px-5">{t("pay.received")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {report.months.map((m) => (
                          <tr
                            key={m.key}
                            onClick={() => router.push(`/monthly-review?month=${m.key}`)}
                            className={
                              m.stats.count
                                ? "cursor-pointer hover:bg-card-2"
                                : "text-muted"
                            }
                          >
                            <td className="px-4 py-2.5 md:px-5">{formatMonth(m.key, locale)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{m.stats.count}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              {formatMoney(m.stats.value, locale)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums md:px-5">
                              {formatMoney(m.received, locale)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <TopCustomers orders={report.inYear} />
              </div>
            </>
          )}
        </div>
      ) : null}
    </AppShell>
  );
}
