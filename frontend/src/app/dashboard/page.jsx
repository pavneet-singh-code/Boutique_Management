"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Hash,
  ListTodo,
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
  EmployeeAvatar,
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
import { pendingGroups } from "../../lib/work";
import { useOrders } from "../../lib/useOrders";
import { can, useMe } from "../../lib/roles";

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const me = useMe();
  const { orders, ready, loading, error, reload } = useOrders({ enabled: can(me?.role, "reports") });
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
    const work = pendingGroups(orders);
    return {
      work,
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
      feature="reports"
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
        title={t("dash.title")}
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

      {/* Greeting banner (coloured, so Home doesn't feel pale) */}
      <div className="px-4 pb-1 pt-4 md:mb-6 md:px-0 md:pt-0">
        <div className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-accent to-accent-hover p-5 text-white shadow-md md:p-6">
          {me && <EmployeeAvatar employee={me} size={52} className="ring-2 ring-white/70" />}
          <div className="min-w-0">
            <p className="text-xl font-semibold md:font-serif md:text-3xl md:font-normal">
              {t("dash.hello")} {me?.name && me.name !== "Owner" ? me.name : ""}
            </p>
            <p className="text-sm text-white/85">{greetingDate}</p>
          </div>
        </div>
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

          {/* Old orders: were they delivered? */}
          {data.work.confirm.length > 0 && (
            <Link
              href="/orders/check-delivery"
              className="mx-4 flex items-center gap-3 rounded-2xl bg-warn-soft p-4 transition hover:opacity-90 md:mx-0"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f59e0b] text-white">
                <CircleHelp size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-warn-ink">
                  {t("confirm.banner", { count: data.work.confirm.length })}
                </span>
                <span className="block text-sm text-warn-ink/80">{t("confirm.bannerHelp")}</span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-warn-ink" />
            </Link>
          )}

          {/* Work that needs attention */}
          {(data.work.late.length + data.work.ready.length + data.work.unassigned.length) > 0 && (
            <Link
              href="/pending"
              className="mx-4 flex items-center gap-3 rounded-2xl border border-line bg-card p-4 transition hover:bg-card-2 md:mx-0"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e6effb] text-[#1e4f91]">
                <ListTodo size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">
                  {t("dash.work", {
                    late: data.work.late.length,
                    ready: data.work.ready.length,
                    unassigned: data.work.unassigned.length,
                  })}
                </span>
                <span className="block text-sm text-muted">{t("dash.workHelp")}</span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-muted" />
            </Link>
          )}

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
                can(me?.role, "makeBills")
                  ? { href: "/bills", icon: ReceiptIndianRupee, label: t("nav.bills") }
                  : { href: "/customers", icon: ClipboardList, label: t("nav.customers") },
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
