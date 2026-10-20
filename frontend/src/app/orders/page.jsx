"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, AlertCircle, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import DashboardShell from "../../components/DashboardShell";
import OrderStats from "../../components/orders/OrderStats";
import OrderFilters from "../../components/orders/OrderFilters";
import OrdersTable from "../../components/orders/OrdersTable";
import OrderDetailsModal from "../../components/orders/OrderDetailsModal";
import { getOrders } from "../../lib/api";


function parseOrderDate(value) {
  if (!value) return null;

  const text = String(value).trim();

  // YYYY-MM-DD
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (match) {
    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  // DD/MM/YYYY or DD/MM/YY
  match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);

  if (match) {
    let year = Number(match[3]);

    if (match[3].length === 2) {
      year += year <= 49 ? 2000 : 1900;
    }

    const date = new Date(
      year,
      Number(match[2]) - 1,
      Number(match[1])
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function getMonthKey(value) {
  const date = parseOrderDate(value);

  if (!date) return null;

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentMonth() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [search, setSearch] = useState(
    () => searchParams.get("search") || ""
  );

  const [month, setMonth] = useState(
    () => searchParams.get("month") || getCurrentMonth()
  );

  const [allMonths, setAllMonths] = useState(
    () => searchParams.get("allMonths") === "true"
  );

  const [reviewFilter, setReviewFilter] = useState(
    () => searchParams.get("review") || "all"
  );

  const [sortBy, setSortBy] = useState(
    () => searchParams.get("sort") || "newest"
  );

  const [page, setPage] = useState(
    () => Math.max(1, Number(searchParams.get("page")) || 1)
  );

  const skipFirstFilterReset = useRef(true);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getOrders();

      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.orders)
          ? result.orders
          : Array.isArray(result?.data)
            ? result.data
            : null;

      if (!list) {
        throw new Error("The server returned an unexpected orders response.");
      }

      setOrders(list);
    } catch (err) {
      setError(err?.message || "Unable to load orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = orders.filter((order) => {
      const matchesMonth =
        allMonths || getMonthKey(order.order_date) === month;

      const searchableText = [
        order.order_number,
        order.customer_name,
        order.contact_number,
        order.what_to_design,
        order.additional_info,
        order.filename,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesReview =
        reviewFilter === "all" ||
        (reviewFilter === "review" && Boolean(order.needs_review)) ||
        (reviewFilter === "clear" && !Boolean(order.needs_review));

      return matchesMonth && matchesSearch && matchesReview;
    });

    return filtered.sort((a, b) => {
      const dateA = parseOrderDate(a.order_date)?.getTime() ?? 0;
      const dateB = parseOrderDate(b.order_date)?.getTime() ?? 0;

      if (sortBy === "oldest") return dateA - dateB;

      if (sortBy === "delivery") {
        const deliveryA = parseOrderDate(a.deliver_date)?.getTime() ?? Infinity;
        const deliveryB = parseOrderDate(b.deliver_date)?.getTime() ?? Infinity;
        return deliveryA - deliveryB;
      }

      if (sortBy === "customer") {
        return String(a.customer_name || "").localeCompare(
          String(b.customer_name || "")
        );
      }

      return dateB - dateA;
    });
  }, [orders, search, month, allMonths, reviewFilter, sortBy]);

  useEffect(() => {
    if (skipFirstFilterReset.current) {
      skipFirstFilterReset.current = false;
      return;
    }

    setPage(1);
  }, [search, month, allMonths, reviewFilter, sortBy]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (search) params.set("search", search);
    if (month) params.set("month", month);
    if (allMonths) params.set("allMonths", "true");
    if (reviewFilter !== "all") params.set("review", reviewFilter);
    if (sortBy !== "newest") params.set("sort", sortBy);
    if (page > 1) params.set("page", String(page));

    const query = params.toString();
    const nextUrl = query ? `/orders?${query}` : "/orders";

    const currentUrl =
      window.location.pathname + window.location.search;

    if (currentUrl !== nextUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [
    search,
    month,
    allMonths,
    reviewFilter,
    sortBy,
    page,
    router,
  ]);

  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        {/* Page heading */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9a846b]">
              ORDER MANAGEMENT
            </p>

            <h1 className="mt-2 font-serif text-3xl tracking-tight text-[#352c24] md:text-4xl">
              All Orders
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#867869]">
              Keep track of customer orders, delivery dates, payments, and
              records that need review.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e3d8ca] bg-[#fffdf9] px-4 py-2.5 text-sm font-medium text-[#6f5a44] transition hover:bg-[#f2e9dd] disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => router.push("/upload-orders")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#796756] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#665442]"
            >
              <Plus size={17} />
              Upload orders
            </button>
          </div>
        </section>

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-[#ecd0c4] bg-[#fbf0eb] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0 text-[#a45d46]"
              />
              <div>
                <p className="text-sm font-semibold text-[#874d3a]">
                  Couldn't load orders
                </p>
                <p className="mt-1 wrap-break-word text-sm text-[#956d5c]">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadOrders}
              className="self-start rounded-lg border border-[#e2c4b7] px-3 py-2 text-sm text-[#874d3a] hover:bg-[#f7e4dc] sm:self-center"
            >
              Try again
            </button>
          </div>
        )}

        {/* Statistics */}
        {!error && (
          <OrderStats orders={filteredOrders} />
        )}

        {/* Search and filters */}
        <OrderFilters
          search={search}
          setSearch={setSearch}
          month={month}
          setMonth={setMonth}
          allMonths={allMonths}
          setAllMonths={setAllMonths}
          reviewFilter={reviewFilter}
          setReviewFilter={setReviewFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />

        {/* Orders table */}
        {loading ? (
          <div className="rounded-2xl border border-[#e8dfd3] bg-[#fffdf9] px-6 py-16 text-center">
            <RefreshCw
              size={24}
              className="mx-auto animate-spin text-[#92785b]"
            />
            <p className="mt-4 text-sm text-[#867869]">
              Loading your orders...
            </p>
          </div>
        ) : !error ? (
          <OrdersTable
            orders={filteredOrders}
            onEdit={(order) => {
              const query = searchParams.toString();
              const returnTo = query ? `/orders?${query}` : "/orders";

              router.push(
                `/orders/${order.id}/edit?returnTo=${encodeURIComponent(returnTo)}`
              );
            }}    
            page={page}
            setPage={setPage}
            pageSize={10}
          />
        ) : null}
      </div>

      <OrderDetailsModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </DashboardShell>
  );
}