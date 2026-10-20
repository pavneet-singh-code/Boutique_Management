"use client";

import { Search, CalendarDays, SlidersHorizontal, X } from "lucide-react";

export default function OrderFilters({
  search,
  setSearch,
  month,
  setMonth,
  allMonths,
  setAllMonths,
  reviewFilter,
  setReviewFilter,
  sortBy,
  setSortBy,
}) {
  return (
    <section className="rounded-2xl border border-[#e8dfd3] bg-[#fffdf9] p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex h-11 flex-1 items-center gap-3 rounded-xl border border-[#e7ded2] bg-white px-3.5 focus-within:border-[#a58d73]">
            <Search size={18} className="shrink-0 text-[#998875]" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, order number, or design..."
              aria-label="Search orders"
              className="w-full bg-transparent text-sm text-[#352c24] outline-none placeholder:text-[#aa9d8e]"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="text-[#8c7d6c] hover:text-[#352c24]"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <label className="flex h-11 items-center gap-2 rounded-xl border border-[#e7ded2] bg-white px-3.5">
            <CalendarDays size={17} className="text-[#998875]" />
            <span className="whitespace-nowrap text-sm text-[#756758]">
              Month
            </span>
            <input
              type="month"
              value={month}
              disabled={allMonths}
              onChange={(event) => setMonth(event.target.value)}
              className="min-w-0 bg-transparent text-sm text-[#352c24] outline-none disabled:opacity-40"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#eee6dc] pt-4 sm:flex-row sm:flex-wrap sm:items-center">
          <label className="flex items-center gap-2 text-sm text-[#66594b]">
            <input
              type="checkbox"
              checked={allMonths}
              onChange={(event) => setAllMonths(event.target.checked)}
              className="accent-[#80664b]"
            />
            Show all months
          </label>

          <div className="hidden h-5 w-px bg-[#e8dfd3] sm:block" />

          <label className="flex items-center gap-2 text-sm text-[#66594b]">
            <SlidersHorizontal size={16} className="text-[#998875]" />
            Review
            <select
              value={reviewFilter}
              onChange={(event) => setReviewFilter(event.target.value)}
              className="rounded-lg border border-[#e7ded2] bg-white px-2.5 py-2 text-sm text-[#493d31] outline-none focus:border-[#a58d73]"
            >
              <option value="all">All orders</option>
              <option value="review">Needs review</option>
              <option value="clear">Reviewed / no review needed</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-[#66594b] sm:ml-auto">
            Sort by
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-lg border border-[#e7ded2] bg-white px-2.5 py-2 text-sm text-[#493d31] outline-none focus:border-[#a58d73]"
            >
              <option value="newest">Newest order date</option>
              <option value="oldest">Oldest order date</option>
              <option value="delivery">Upcoming delivery</option>
              <option value="customer">Customer name</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}