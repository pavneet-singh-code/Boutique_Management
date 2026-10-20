"use client";

import {
  LayoutDashboard,
  CalendarDays,
  CalendarRange,
  ShoppingBag,
  Upload,
  Download,
  Users,
  Settings,
  LogOut,
  Scissors,
  ChevronRight,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "../lib/api";

const navigation = [
  {
    heading: "OVERVIEW",
    items: [
      {
        label: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "Monthly Review",
        path: "/monthly-review",
        icon: CalendarDays,
      },
      {
        label: "Yearly Review",
        path: "/yearly-review",
        icon: CalendarRange,
      },
    ],
  },
  {
    heading: "ORDERS",
    items: [
      {
        label: "All Orders",
        path: "/orders",
        icon: ShoppingBag,
      },
      {
        label: "Upload Orders",
        path: "/upload-orders",
        icon: Upload,
      },
      {
        label: "Export Orders",
        path: "/export-orders",
        icon: Download,
      },
    ],
  },
  {
    heading: "MANAGEMENT",
    items: [
      {
        label: "Customers",
        path: "/customers",
        icon: Users,
      },
      {
        label: "Settings",
        path: "/settings",
        icon: Settings,
      },
    ],
  },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[#e7ded1] bg-[#faf7f1] md:flex">
      {/* Brand */}
      <div className="px-6 pb-7 pt-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#e5d8c6] bg-[#eee5d8] text-[#725c45]">
            <Scissors size={22} strokeWidth={1.6} />
          </div>

          <div className="min-w-0">
            <h2 className="font-serif text-[22px] leading-tight tracking-tight text-[#30271f]">
              Fab_art Studio
            </h2>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#94816c]">
              BOUTIQUE MANAGEMENT
            </p>
          </div>
        </div>
      </div>

      <div className="mx-5 border-t border-[#e9e0d5]" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        {navigation.map((section, sectionIndex) => (
          <div
            key={section.heading}
            className={sectionIndex === 0 ? "" : "mt-7"}
          >
            <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.18em] text-[#a08e7b]">
              {section.heading}
            </p>

            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;

                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => router.push(item.path)}
                    aria-current={isActive ? "page" : undefined}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200 ${
                      isActive
                        ? "bg-[#eae0d2] font-semibold text-[#493727] shadow-sm ring-1 ring-inset ring-[#e1d3c1]"
                        : "font-medium text-[#706355] hover:bg-[#f0e9df] hover:text-[#493727]"
                    }`}
                  >
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.1 : 1.7}
                      className={`shrink-0 transition-colors ${
                        isActive
                          ? "text-[#80664b]"
                          : "text-[#9b8975] group-hover:text-[#80664b]"
                      }`}
                    />

                    <span className="flex-1 text-[13px]">
                      {item.label}
                    </span>

                    {isActive && (
                      <ChevronRight
                        size={15}
                        className="shrink-0 text-[#92785b]"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-[#e7ded1] px-4 py-4">
        <button
          type="button"
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[#827366] transition-colors hover:bg-[#eee4d8] hover:text-[#704a3e]"
        >
          <LogOut
            size={18}
            strokeWidth={1.7}
            className="transition-transform group-hover:-translate-x-0.5"
          />

          <span className="flex-1 text-left text-sm font-medium">
            Log out
          </span>
        </button>

        <p className="mt-2 px-3 text-[10px] text-[#b0a191]">
          Fab_art Studio · Workspace
        </p>
      </div>
    </aside>
  );
}