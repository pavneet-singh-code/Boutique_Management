"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ClipboardList,
  Hash,
  ReceiptIndianRupee,
  Clock3,
  Download,
  FilePlus,
  IndianRupee,
  RefreshCw,
  ScanLine,
  ShoppingBag,
  TriangleAlert,
  Truck,
  Upload,
  Wallet,
} from "lucide-react";
import AppShell, { HeaderIconButton } from "../../components/AppShell";
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
  daysBetween,
  formatMoney,
  friendlyDate,
  monthRange,
  orderMonthKey,
  parseDate,
  receivedBetween,
  summarise,
} from "../../lib/orders";
import { getDataCheck } from "../../lib/api";
import { useOrders } from "../../lib/useOrders";

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const { orders, ready, loading, error, reload } = useOrders();
  const [numberProblems, setNumberProblems] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getDataCheck()
      .then((check) => !cancelled && setNumberProblems(check.blocking))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [orders.length]);

  const data = useMemo(() => {
    const month = currentMonthKey();
    const thisMonth = orders.filter((order) => orderMonthKey(order) === month);
    const today = new Date();

    const upcoming = orders
      .map((order) => ({ order, date: parseDate(order.deliver_date) }))
      .filter(({ date }) => {
        if (!date) return false;
        const diff = daysBetween(today, date);
        return diff >= 0 && diff <= 7;
      })
      .sort((a, b) => a.date - b.date)
      .map(({ order }) => order);

    const recent = [...orders]
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.id - a.id)
      .slice(0, 5);

    const [from, to] = monthRange(month);
    const all = summarise(orders);
    return {
      stats: summarise(thisMonth),
      receivedThisMonth: receivedBetween(orders, from, to),
      toCollect: all.balance,
      unbilled: all.unbilled,
      review: orders.filter((order) => order.needs_review).length,
      upcoming,
      recent,
    };
  }, [orders]);

  const greetingDate = new Date().toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <AppShell
      title={t("dash.title")}
      subtitle={t("dash.subtitle")}
      brand
      mobileTitle={
        <span className="block truncate text-[22px] font-bold tracking-tight text-accent">
          Fab_art
        </span>
      }
      actions={
        <>
          <HeaderIconButton label={t("nav.newOrder")} href="/orders/new">
            <FilePlus size={21} />
          </HeaderIconButton>
          <HeaderIconButton label={t("common.refresh")} onClick={() => reload()}>
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </HeaderIconButton>
        </>
      }
      fab={{ href: "/upload-orders", label: t("nav.upload"), icon: ScanLine }}
    >
      <PageHeading
        eyebrow={greetingDate}
        title={t("dash.hello")}
        subtitle={t("dash.subtitle")}
        actions={
          <>
            <LinkButton href="/orders/new" variant="secondary">
              <FilePlus size={17} />
              {t("nav.newOrder")}
            </LinkButton>
            <LinkButton href="/upload-orders">
              <Upload size={17} />
              {t("nav.upload")}
            </LinkButton>
          </>
        }
      />

      {/* Phone greeting */}
      <div className="px-4 pb-1 pt-4 md:hidden">
        <p className="text-xl font-semibold text-ink">{t("dash.hello")}</p>
        <p className="text-sm text-muted">{greetingDate}</p>
      </div>

      <ErrorBox error={error} onRetry={() => reload()} className="mb-4 mt-3" />

      {!ready && !error ? (
        <Spinner />
      ) : ready ? (
        <div className="space-y-6 md:space-y-8">
          {/* This month */}
          <section className="pt-3 md:pt-0">
            <SectionTitle
              title={t("dash.thisMonth")}
              action={
                <Link
                  href="/monthly-review"
                  className="flex items-center text-sm font-medium text-accent-ink"
                >
                  {t("nav.monthly")}
                  <ChevronRight size={16} />
                </Link>
              }
            />
            <div className="grid grid-cols-2 gap-3 px-4 md:gap-4 md:px-0 xl:grid-cols-4">
              <StatTile
                label={t("dash.orders")}
                value={data.stats.count.toLocaleString(locale)}
                icon={ShoppingBag}
                tone="accent"
              />
              <StatTile
                label={t("dash.received")}
                value={formatMoney(data.receivedThisMonth, locale)}
                icon={Wallet}
              />
              <Link href="/bills" className="block">
                <StatTile
                  label={t("dash.toCollect")}
                  value={formatMoney(data.toCollect, locale)}
                  icon={Clock3}
                />
              </Link>
              <Link href="/bills/new" className="block">
                <StatTile
                  label={t("dash.notBilled")}
                  value={data.unbilled.toLocaleString(locale)}
                  note={t("dash.unbilledNote", { count: data.unbilled })}
                  icon={IndianRupee}
                />
              </Link>
            </div>
          </section>

          {/* Order number problems (Phase 0 clean-up) */}
          {numberProblems > 0 && (
            <Link
              href="/orders/data-check"
              className="mx-4 flex items-center gap-3 rounded-2xl bg-danger-soft p-4 transition hover:opacity-90 md:mx-0"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-danger text-white">
                <Hash size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-danger">
                  {t("check.banner", { count: numberProblems })}
                </span>
                <span className="block text-sm text-ink-2">{t("check.bannerHelp")}</span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-danger" />
            </Link>
          )}

          {/* Needs review */}
          {data.review > 0 && (
            <Link
              href="/orders?review=review&allMonths=true"
              className="mx-4 flex items-center gap-3 rounded-2xl bg-warn-soft p-4 transition hover:opacity-90 md:mx-0"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f59e0b] text-white">
                <TriangleAlert size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-warn-ink">
                  {data.review === 1
                    ? t("dash.reviewBannerOne")
                    : t("dash.reviewBanner", { count: data.review })}
                </span>
                <span className="block text-sm text-warn-ink/80">
                  {t("dash.reviewHelp")}
                </span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-warn-ink" />
            </Link>
          )}

          <div className="grid grid-cols-1 gap-6 md:gap-8 xl:grid-cols-2">
            {/* Deliveries */}
            <section>
              <SectionTitle
                title={t("dash.deliveries")}
                help={t("dash.deliveriesHelp")}
              />
              {data.upcoming.length === 0 ? (
                <Card className="mx-4 md:mx-0">
                  <EmptyState icon={Truck} title={t("dash.noDeliveries")} />
                </Card>
              ) : (
                <OrderChatList
                  orders={data.upcoming}
                  showDelivery={false}
                  rightText={(order) => (
                    <span className="font-medium text-accent-ink">
                      {friendlyDate(order.deliver_date, t, locale)}
                    </span>
                  )}
                />
              )}
            </section>

            {/* Recent */}
            <section>
              <SectionTitle
                title={t("dash.recent")}
                action={
                  <Link
                    href="/orders?allMonths=true"
                    className="flex items-center text-sm font-medium text-accent-ink"
                  >
                    {t("common.viewAll")}
                    <ChevronRight size={16} />
                  </Link>
                }
              />
              {data.recent.length === 0 ? (
                <Card className="mx-4 md:mx-0">
                  <EmptyState
                    icon={ClipboardList}
                    title={t("dash.noOrders")}
                    action={
                      <LinkButton href="/upload-orders">
                        <Upload size={17} />
                        {t("nav.upload")}
                      </LinkButton>
                    }
                  />
                </Card>
              ) : (
                <OrderChatList orders={data.recent} />
              )}
            </section>
          </div>

          {/* Quick links on phones */}
          <section className="md:hidden">
            <SectionTitle title={t("dash.quick")} />
            <div className="grid grid-cols-3 gap-3 px-4">
              {[
                { href: "/upload-orders", icon: Upload, label: t("nav.upload") },
                { href: "/orders/new", icon: FilePlus, label: t("nav.newOrder") },
                { href: "/bills", icon: ReceiptIndianRupee, label: t("nav.bills") },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-card-2 px-2 py-4 text-center text-[13px] font-medium leading-tight text-ink-2"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-soft-ink">
                    <item.icon size={20} />
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
