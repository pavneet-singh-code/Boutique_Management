
"use client";

import { ChevronLeft, ChevronRight, Pencil, ClipboardList } from "lucide-react";

function formatCurrency(value) {
  if (value == null || value === "") return "—";

  const number = Number(String(value).replace(/[₹,\s]/g, ""));
  if (!Number.isFinite(number)) return String(value);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatDate(value) {
  if (!value) return "—";

  const text = String(value).trim();

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const indian = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);

  let date;

  if (iso) {
    date = new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3])
    );
  } else if (indian) {
    let year = Number(indian[3]);

    if (indian[3].length === 2) {
      year += year <= 49 ? 2000 : 1900;
    }

    date = new Date(
      year,
      Number(indian[2]) - 1,
      Number(indian[1])
    );
  } else {
    return text;
  }

  // Prevent invalid dates such as 32/13/2026.
  if (
    Number.isNaN(date.getTime()) ||
    date.getDate() !== Number(iso?.[3] ?? indian?.[1]) ||
    date.getMonth() !== Number(iso?.[2] ?? indian?.[2]) - 1
  ) {
    return text;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function OrdersTable({
  orders = [],
  onEdit,
  page,
  setPage,
  pageSize = 10,
}) {
  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
  const currentPage = Math.min(page || 1, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleOrders = orders.slice(startIndex, startIndex + pageSize);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e8dfd3] bg-[#fffdf9] shadow-sm">
      <div className="flex flex-col gap-2 border-b border-[#eee6dc] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-xl text-[#352c24]">
            Order records
          </h2>
          <p className="mt-1 text-xs text-[#968777]">
            Review your customers&apos; orders and payment details.
          </p>
        </div>

        <span className="w-fit rounded-full bg-[#f0e7db] px-3 py-1.5 text-xs font-medium text-[#735a40]">
          {orders.length} {orders.length === 1 ? "order" : "orders"}
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <div className="rounded-2xl bg-[#f3ece2] p-4 text-[#8b7358]">
            <ClipboardList size={28} strokeWidth={1.5} />
          </div>
          <h3 className="mt-4 font-medium text-[#493d31]">
            No orders found
          </h3>
          <p className="mt-1 max-w-sm text-sm text-[#948678]">
            Try another month or change your search and review filters.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead>
                <tr className="bg-[#f8f3ec] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8e7c68]">
                  <th className="px-5 py-3.5">Order</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Design</th>
                  <th className="px-4 py-3.5">Order date</th>
                  <th className="px-4 py-3.5">Delivery</th>
                  <th className="px-4 py-3.5 text-right">Total</th>
                  <th className="px-4 py-3.5 text-right">Advance</th>
                  <th className="px-4 py-3.5">Review</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#f0e8de]">
                {visibleOrders.map((order) => {
                  const needsReview = Boolean(order.needs_review);

                  return (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-[#fcf8f2]"
                    >
                      <td className="px-5 py-4">
                        <span className="font-medium text-[#493d31]">
                          {order.order_number || `#${order.id}`}
                        </span>
                        {order.filename && (
                          <p className="mt-1 max-w-[140px] truncate text-[10px] text-[#a29484]">
                            {order.filename}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <p className="max-w-[170px] truncate text-sm font-medium text-[#352c24]">
                          {order.customer_name || "Unknown customer"}
                        </p>
                        {order.contact_number && (
                          <p className="mt-1 text-xs text-[#978979]">
                            {order.contact_number}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className="block max-w-[180px] truncate text-sm text-[#746657]"
                          title={order.what_to_design || ""}
                        >
                          {order.what_to_design || "—"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm text-[#746657]">
                        {formatDate(order.order_date)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm text-[#746657]">
                        {formatDate(order.deliver_date)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium text-[#493d31]">
                        {formatCurrency(order.total_amount)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-[#746657]">
                        {formatCurrency(order.advance_payment)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            needsReview
                              ? "bg-[#f6e8dc] text-[#9b5e38]"
                              : "bg-[#e9eee5] text-[#59704d]"
                          }`}
                        >
                          {needsReview ? "Needs review" : "No review needed"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof onEdit === "function") {
                              onEdit(order);
                            } else {
                              console.error(
                                "OrdersTable: onEdit was not provided as a function."
                              );
                            }
                          }}
                          aria-label={`Edit order ${order.order_number || order.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#e7ded2] px-3 py-2 text-xs font-medium text-[#725b43] transition hover:border-[#cdbba5] hover:bg-[#f3ece2]"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#eee6dc] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#948678]">
              Showing {startIndex + 1}–
              {Math.min(startIndex + pageSize, orders.length)} of{" "}
              {orders.length} orders
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage?.(currentPage - 1)}
                className="flex items-center gap-1 rounded-lg border border-[#e7ded2] px-3 py-2 text-xs text-[#725b43] transition hover:bg-[#f3ece2] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={15} />
                Previous
              </button>

              <span className="px-2 text-xs text-[#8e7c68]">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage?.(currentPage + 1)}
                className="flex items-center gap-1 rounded-lg border border-[#e7ded2] px-3 py-2 text-xs text-[#725b43] transition hover:bg-[#f3ece2] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
