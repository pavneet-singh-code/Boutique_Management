"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarRange, ChevronRight, ClipboardList } from "lucide-react";
import AppShell from "../../components/AppShell";
import BarChart from "../../components/BarChart";
import { PeriodStepper, ReportTabs } from "../../components/PeriodPicker";
import { Change, TopCustomers } from "../../components/Reports";
import { OrderChatList } from "../../components/OrderList";
import {
  Card,
  EmptyState,
  ErrorBox,
  LinkButton,
  PageHeading,
  SectionTitle,
  Spinner,
  StatTile,
} from "../../components/ui";
import { useI18n } from "../../lib/i18n";
import {
  currentMonthKey,
  formatMoney,
  formatMonth,
  orderDate,
  orderMonthKey,
  shiftMonth,
  monthRange,
  receivedBetween,
  summarise,
} from "../../lib/orders";
import { useOrders } from "../../lib/useOrders";

function MonthlyContent() {
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const { orders, ready, error, reload } = useOrders();
  const [month, setMonth] = useState(() => searchParams.get("month") || currentMonthKey());

  const report = useMemo(() => {
    const inMonth = orders
      .filter((order) => orderMonthKey(order) === month)
      .sort((a, b) => (orderDate(b)?.getTime() ?? 0) - (orderDate(a)?.getTime() ?? 0));
    const previous = orders.filter((order) => orderMonthKey(order) === shiftMonth(month, -1));

    const [y, m] = month.split("-").map(Number);
    const days = new Date(y, m, 0).getDate();
    const perDay = Array.from({ length: days }, (_, index) => ({
      key: index + 1,
      label: new Date(y, m - 1, index + 1).toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
      }),
      tick: (index + 1) % 5 === 0 || index === 0 ? String(index + 1) : "",
      value: 0,
    }));
    for (const order of inMonth) {
      const date = orderDate(order);
      if (date) perDay[date.getDate() - 1].value += 1;
    }

    return {
      list: inMonth,
      stats: summarise(inMonth),
      prev: summarise(previous),
      received: receivedBetween(orders, ...monthRange(month)),
      prevReceived: receivedBetween(orders, ...monthRange(shiftMonth(month, -1))),
      perDay,
    };
  }, [orders, month, locale]);

  const { stats, prev } = report;
  const isCurrent = month >= currentMonthKey();

  return (
    <AppShell title={t("monthly.title")} subtitle={t("monthly.subtitle")}>
      <ReportTabs current="month" />
      <PageHeading
        eyebrow={t("nav.overview")}
        title={t("monthly.title")}
        subtitle={t("monthly.subtitle")}
        actions={
          <LinkButton href="/yearly-review" variant="secondary">
            <CalendarRange size={17} />
            {t("nav.yearly")}
          </LinkButton>
        }
      />

      <div className="px-4 py-3 md:mb-6 md:max-w-sm md:px-0 md:py-0">
        <PeriodStepper
          label={formatMonth(month, locale)}
          onPrev={() => setMonth(shiftMonth(month, -1))}
          onNext={() => setMonth(shiftMonth(month, 1))}
          nextDisabled={isCurrent}
        />
      </div>

      <ErrorBox error={error} onRetry={() => reload()} className="my-4" />

      {!ready && !error ? (
        <Spinner />
      ) : ready ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 px-4 md:gap-4 md:px-0 lg:grid-cols-3 xl:grid-cols-6">
            <StatTile
              tone="accent"
              label={t("dash.orders")}
              value={stats.count}
              note={<Change now={stats.count} before={prev.count} />}
            />
            <StatTile
              label={t("dash.value")}
              value={formatMoney(stats.value, locale)}
              note={<Change now={stats.value} before={prev.value} />}
            />
            <StatTile
              label={t("pay.received")}
              value={formatMoney(report.received, locale)}
              note={<Change now={report.received} before={report.prevReceived} />}
            />
            <StatTile label={t("dash.balance")} value={formatMoney(stats.balance, locale)} />
            <StatTile
              label={t("monthly.avgOrder")}
              value={formatMoney(stats.count ? Math.round(stats.value / stats.count) : 0, locale)}
            />
            <StatTile label={t("monthly.needsReview")} value={stats.review} />
          </div>

          {stats.count === 0 ? (
            <Card className="mx-4 md:mx-0">
              <EmptyState icon={ClipboardList} title={t("monthly.noData")} />
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[3fr_2fr]">
                <Card className="mx-4 p-4 md:mx-0 md:p-6">
                  <h2 className="mb-4 text-sm font-semibold text-ink">
                    {t("monthly.ordersPerDay")}
                  </h2>
                  <BarChart
                    data={report.perDay}
                    ariaLabel={t("monthly.ordersPerDay")}
                    tooltip={(d) => t("chart.tooltipOrders", { label: d.label, value: d.value })}
                  />
                </Card>
                <TopCustomers orders={report.list} />
              </div>

              <section>
                <SectionTitle
                  title={t("monthly.ordersList")}
                  action={
                    <Link
                      href={`/orders?month=${month}`}
                      className="flex items-center text-sm font-medium text-accent-ink"
                    >
                      {t("common.viewAll")}
                      <ChevronRight size={16} />
                    </Link>
                  }
                />
                <OrderChatList orders={report.list.slice(0, 8)} />
              </section>
            </>
          )}
        </div>
      ) : null}
    </AppShell>
  );
}

export default function MonthlyReviewPage() {
  return (
    <Suspense fallback={null}>
      <MonthlyContent />
    </Suspense>
  );
}
