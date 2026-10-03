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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { logout } from "../lib/api";

export default function Sidebar() {
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <aside className="w-64 min-h-screen bg-[#1c1c1a] text-white flex flex-col">
      {/* Logo */}
      <div className="px-7 py-8">
        <p className="text-sm tracking-[0.3em] font-medium">
          FAB_ART
        </p>

        <p className="text-xs text-white/40 mt-1">
          Studio Management
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">

        {/* Main */}
        <p className="px-3 mb-3 text-[10px] uppercase tracking-[0.2em] text-white/30">
          Main
        </p>

        <div className="space-y-1">
          <NavItem
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            onClick={() => router.push("/dashboard")}
          />

          <NavItem
            icon={<CalendarDays size={18} />}
            label="Monthly Review"
            onClick={() => router.push("/monthly-review")}
          />

          <NavItem
            icon={<CalendarRange size={18} />}
            label="Yearly Review"
            onClick={() => router.push("/yearly-review")}
          />
        </div>

        {/* Orders */}
        <p className="px-3 mt-8 mb-3 text-[10px] uppercase tracking-[0.2em] text-white/30">
          Orders
        </p>

        <div className="space-y-1">
          <NavItem
            icon={<ShoppingBag size={18} />}
            label="Orders"
            onClick={() => router.push("/orders")}
          />

          <NavItem
            icon={<Upload size={18} />}
            label="Upload Orders"
            onClick={() => router.push("/upload-orders")}
          />

          <NavItem
            icon={<Download size={18} />}
            label="Export Orders"
            onClick={() => router.push("/export-orders")}
          />
        </div>

        {/* Management */}
        <p className="px-3 mt-8 mb-3 text-[10px] uppercase tracking-[0.2em] text-white/30">
          Management
        </p>

        <div className="space-y-1">
          <NavItem
            icon={<Users size={18} />}
            label="Customers"
            onClick={() => router.push("/customers")}
          />

          <NavItem
            icon={<Settings size={18} />}
            label="Settings"
            onClick={() => router.push("/settings")}
          />
        </div>
      </nav>

      {/* Logout */}
      <div className="px-4 pb-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition"
        >
          <LogOut size={18} />

          <span className="text-sm">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-white/55 hover:text-white hover:bg-white/5 transition"
    >
      {icon}

      <span>{label}</span>
    </button>
  );
}