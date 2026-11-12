"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  ClipboardList,
  FilePlus,
  RefreshCw,
  ScanLine,
  Search,
  Upload,
  X,
} from "lucide-react";
import AppShell, { HeaderIconButton } from "../../components/AppShell";
import { OrderChatList, OrdersTable } from "../../components/OrderList";
import { PeriodStepper } from "../../components/PeriodPicker";
import {
  Button,
  Chip,
  EmptyState,
  ErrorBox,
  LinkButton,
  PageHeading,
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
  parseDate,
  searchText,
  shiftMonth,
  summarise,
} from "../../lib/orders";
import { useOrders } from "../../lib/useOrders";
import { useCan } from "../../lib/roles";

const PAGE_SIZE = 15;

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const { orders, ready, loading, error, reload } = useOrders();
  const canEdit = useCan("editOrders");
  const seeMoney = useCan("money");

  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [month, setMonth] = useState(() => searchParams.get("month") || currentMonthKey());
  const [allMonths, setAllMonths] = useState(() => searchParams.get("allMonths") === "true");
  const [review, setReview] = useState(() => searchParams.get("review") || "all");
  const [sortBy, setSortBy] = useState(() => searchParams.get("sort") || "newest");
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get("page")) || 1));

  // Any filter change goes back to page 1.
  const update = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = orders.filter((order) => {
      if (!allMonths && !query && orderMonthKey(order) !== month) return false;
      if (query && !searchText(order).includes(query)) return false;
      if (review === "review" && !order.needs_review) return false;
      if (review === "clear" && order.needs_review) return false;
      return true;
    });

    const time = (date, fallback) => date?.getTime() ?? fallback;
    return list.sort((a, b) => {
      if (sortBy === "oldest") return time(orderDate(a), 0) - time(orderDate(b), 0);
      if (sortBy === "delivery") {
        return (
          time(parseDate(a.deliver_date), Infinity) -
          time(parseDate(b.deliver_date), Infinity)
        );
      }
      if (sortBy === "customer") {
        return String(a.customer_name || "").localeCompare(String(b.customer_name || ""));
      }
      return time(orderDate(b), 0) - time(orderDate(a), 0) || b.id - a.id;
    });
  }, [orders, search, month, allMonths, review, sortBy]);

  // Keep the URL in sync so Back returns to the same filters.
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (month !== currentMonthKey()) params.set("month", month);
    if (allMonths) params.set("allMonths", "true");
    if (review !== "all") params.set("review", review);
    if (sortBy !== "newest") params.set("sort", sortBy);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    const next = query ? `/orders?${query}` : "/orders";
    if (window.location.pathname + window.location.search !== next) {
      router.replace(next, { scroll: false });
    }
  }, [search, month, allMonths, review, sortBy, page, router]);

  const stats = summarise(filtered);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const searching = search.trim().length > 0;
  const periodLabel = allMonths || searching ? t("orders.allMonths") : formatMonth(month, locale);

  const sortSelect = (
    <label className="relative inline-flex items-center">
      <ArrowUpDown size={15} className="pointer-events-none absolute left-3 text-muted" />
      <select
        value={sortBy}
        onChange={(event) => update(setSortBy)(event.target.value)}
        aria-label={t("orders.sort")}
        className="h-8 appearance-none rounded-full bg-card-2 pl-8 pr-3 text-sm text-ink-2 outline-none md:h-10 md:rounded-xl md:border md:border-line md:bg-card"
      >
        <option value="newest">{t("orders.sortNewest")}</option>
        <option value="oldest">{t("orders.sortOldest")}</option>
        <option value="delivery">{t("orders.sortDelivery")}</option>
        <option value="customer">{t("orders.sortCustomer")}</option>
      </select>
    </label>
  );

  return (
    <AppShell
      feature="orders"
      title={t("orders.title")}
      subtitle={t("orders.subtitle")}
      actions={
        <>
          {canEdit && (
            <HeaderIconButton label={t("nav.newOrder")} href="/orders/new">
              <FilePlus size={21} />
            </HeaderIconButton>
          )}
          <HeaderIconButton label={t("common.refresh")} onClick={() => reload()}>
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </HeaderIconButton>
        </>
      }
      fab={canEdit ? { href: "/upload-orders", label: t("nav.upload"), icon: ScanLine } : null}
    >
      <PageHeading
        eyebrow={t("nav.ordersSection")}
        title={t("orders.heading")}
        subtitle={t("orders.subtitle")}
        actions={
          <>
            <Button variant="secondary" onClick={() => reload()} disabled={loading}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              {t("common.refresh")}
            </Button>
            {canEdit && (
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
            )}
          </>
        }
      />

      {/* Filters */}
      <div className="space-y-3 bg-card px-4 pb-3 pt-3 md:mb-6 md:rounded-2xl md:border md:border-line md:p-4 md:shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="flex h-11 flex-1 items-center gap-3 rounded-full bg-card-2 px-4 md:rounded-xl md:border md:border-line md:bg-card">
            <Search size={19} className="shrink-0 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => update(setSearch)(event.target.value)}
              placeholder={t("orders.searchPlaceholder")}
              aria-label={t("common.search")}
              className="w-full bg-transparent text-[16px] text-ink outline-none placeholder:text-muted md:text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => update(setSearch)("")}
                aria-label={t("common.close")}
                className="text-muted hover:text-ink"
              >
                <X size={17} />
              </button>
            )}
          </label>

          <div className="flex items-center gap-2">
            <PeriodStepper
              className={allMonths || searching ? "flex-1 opacity-50 lg:w-64" : "flex-1 lg:w-64"}
              label={formatMonth(month, locale)}
              onPrev={() => {
                update(setMonth)(shiftMonth(month, -1));
                setAllMonths(false);
              }}
              onNext={() => {
                update(setMonth)(shiftMonth(month, 1));
                setAllMonths(false);
              }}
            />
          </div>
        </div>

        <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          <Chip active={allMonths} onClick={() => update(setAllMonths)(!allMonths)}>
            {t("orders.allMonths")}
          </Chip>
          <span className="h-5 w-px shrink-0 bg-line" />
          <Chip active={review === "all"} onClick={() => update(setReview)("all")}>
            {t("common.all")}
          </Chip>
          <Chip active={review === "review"} onClick={() => update(setReview)("review")}>
            {t("orders.filterReview")}
          </Chip>
          <Chip active={review === "clear"} onClick={() => update(setReview)("clear")}>
            {t("orders.filterOk")}
          </Chip>
          <span className="ml-auto shrink-0">{sortSelect}</span>
        </div>
      </div>

      <ErrorBox error={error} onRetry={() => reload()} className="my-4" />

      {!ready && !error ? (
        <Spinner />
      ) : ready ? (
        <>
          {/* Summary */}
          <p className="border-y border-line bg-card-2 px-4 py-2 text-[13px] text-muted md:hidden">
            {periodLabel} ·{" "}
            {seeMoney
              ? t("orders.monthTotal", { count: stats.count, value: formatMoney(stats.value, locale) })
              : t("common.orderCount", { count: stats.count })}
          </p>
          <div className={seeMoney ? "mb-6 hidden grid-cols-4 gap-4 md:grid" : "hidden"}>
            <StatTile label={t("dash.orders")} value={stats.count} note={periodLabel} />
            <StatTile label={t("dash.value")} value={formatMoney(stats.value, locale)} />
            <StatTile label={t("dash.advance")} value={formatMoney(stats.advance, locale)} />
            <StatTile label={t("dash.balance")} value={formatMoney(stats.balance, locale)} />
          </div>

          {filtered.length === 0 ? (
            <div className="md:rounded-2xl md:border md:border-line md:bg-card">
              <EmptyState
                icon={ClipboardList}
                title={t("orders.empty")}
                help={t("orders.emptyHelp")}
                action={
                  !allMonths && (
                    <Button variant="secondary" onClick={() => update(setAllMonths)(true)}>
                      {t("orders.allMonths")}
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <>
              {/* Phones: chat list with everything */}
              <div className="md:hidden">
                <OrderChatList orders={filtered} />
              </div>

              {/* Desktop: paginated table */}
              <div className="hidden md:block">
                <OrdersTable orders={filtered.slice(start, start + PAGE_SIZE)} />
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted">
                    {t("orders.showing", {
                      from: start + 1,
                      to: Math.min(start + PAGE_SIZE, filtered.length),
                      total: filtered.length,
                    })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      {t("common.prev")}
                    </Button>
                    <span className="px-2 text-sm text-muted">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      {t("common.next")}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      ) : null}
    </AppShell>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersContent />
    </Suspense>
  );
}
