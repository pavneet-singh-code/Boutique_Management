"use client";

import { usePathname } from "next/navigation";
import {
  Search,
  Bell,
  ChevronDown,
  Menu,
  UserRound,
} from "lucide-react";

const pageDetails = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Here's what's happening at your studio.",
  },
  "/upload-orders": {
    title: "Upload Orders",
    subtitle: "Extract order details from PDFs and save your records.",
  },
  "/orders": {
    title: "Orders",
    subtitle: "Manage your boutique's order records.",
  },
  "/customers": {
    title: "Customers",
    subtitle: "Keep track of your valued customers.",
  },
  "/monthly-review": {
    title: "Monthly Review",
    subtitle: "Review your studio's monthly performance.",
  },
  "/yearly-review": {
    title: "Yearly Review",
    subtitle: "Your studio's yearly overview.",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Manage your studio preferences.",
  },
};

export default function TopBar() {
  const pathname = usePathname();
  const page = pageDetails[pathname] || {
    title: "Fab_art Studio",
    subtitle: "Boutique management, thoughtfully organised.",
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#e8dfd3] bg-[#faf7f1]/95 backdrop-blur-md">
      <div className="flex min-h-22 items-center justify-between gap-5 px-5 py-4 md:px-8">
        {/* Page title */}
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            aria-label="Toggle sidebar"
            className="hidden rounded-xl border border-[#e6ddd0] p-2.5 text-[#665747] transition hover:bg-[#eee5d9] md:inline-flex"
          >
            <Menu size={19} strokeWidth={1.7} />
          </button>

          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#998875]">
              FAB_ART STUDIO
            </p>
            <h1 className="truncate font-serif text-2xl font-medium tracking-tight text-[#29231d] md:text-[27px]">
              {page.title}
            </h1>
            <p className="mt-1 hidden text-sm text-[#8c8175] sm:block">
              {page.subtitle}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-3 md:gap-5">
          {/* Search */}
          <div className="hidden h-11 w-56 items-center gap-2.5 rounded-xl border border-[#e7ded2] bg-white/80 px-3.5 transition focus-within:border-[#a58d73] lg:flex xl:w-72">
            <Search size={17} className="shrink-0 text-[#988a7a]" />

            <input
              type="search"
              placeholder="Search orders, customers..."
              aria-label="Search orders and customers"
              className="w-full min-w-0 bg-transparent text-sm text-[#332b24] outline-none placeholder:text-[#a69a8d]"
            />

            <span className="whitespace-nowrap rounded-md border border-[#e9e1d7] bg-[#faf7f2] px-1.5 py-1 text-[10px] text-[#9b8d7e]">
              Ctrl K
            </span>
          </div>

          {/* Notifications placeholder */}
          <button
            type="button"
            aria-label="Notifications"
            title="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[#655647] transition hover:bg-[#eee6da]"
          >
            <Bell size={20} strokeWidth={1.7} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-[#faf7f1] bg-[#b96d52]" />
          </button>

          {/* Profile placeholder */}
          <button
            type="button"
            aria-label="Studio profile"
            className="flex items-center gap-2.5 rounded-xl p-1.5 transition hover:bg-[#eee6da]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#796756] font-serif text-lg text-white">
              <UserRound size={19} strokeWidth={1.6} />
            </span>

            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold text-[#342c24]">
                Studio
              </span>
              <span className="mt-0.5 block text-xs text-[#9a8b7a]">
                Administrator
              </span>
            </span>

            <ChevronDown
              size={15}
              className="hidden text-[#8b7b6a] sm:block"
            />
          </button>
        </div>
      </div>
    </header>
  );
}