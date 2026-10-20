"use client";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function DashboardShell({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f1ea] text-[#1c1c1a]">
      <Sidebar />

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden md:ml-64">
        <TopBar />

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}