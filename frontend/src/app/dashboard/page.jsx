"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Upload,
  Download,
  Settings,
  LogOut,
  Search,
  Bell,
  Plus,
  ArrowUpRight,
  Clock3,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";

import { logout } from "../../lib/api";
import Sidebar from "../../components/Sidebar";


const mockOrders = [
  {
    id: 1,
    orderNumber: "26833",
    customer: "Sunita Devi",
    design: "Beta Ka Salwar",
    date: "16/08/26",
    delivery: "27/08/26",
    status: "Completed",
  },
  {
    id: 2,
    orderNumber: "26834",
    customer: "Neha Sharma",
    design: "Ladies Suit",
    date: "17/08/26",
    delivery: "29/08/26",
    status: "Needs Review",
  },
  {
    id: 3,
    orderNumber: "26835",
    customer: "Kavita Singh",
    design: "Blouse",
    date: "18/08/26",
    delivery: "31/08/26",
    status: "Processing",
  },
  {
    id: 4,
    orderNumber: "26836",
    customer: "Meena Kumari",
    design: "Anarkali Suit",
    date: "18/08/26",
    delivery: "02/09/26",
    status: "Completed",
  },
  {
    id: 5,
    orderNumber: "26837",
    customer: "Riya Verma",
    design: "Lehenga",
    date: "19/08/26",
    delivery: "04/09/26",
    status: "Needs Review",
  },
];


export default function DashboardPage() {
  const router = useRouter();

  const [activePage, setActivePage] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);


  useEffect(() => {
    const token = sessionStorage.getItem("fab_art_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setCheckingAuth(false);
  }, [router]);


  const handleLogout = () => {
    logout();
    router.replace("/login");
  };


  const filteredOrders = mockOrders.filter((order) => {
    const query = search.toLowerCase();

    return (
      order.customer.toLowerCase().includes(query) ||
      order.orderNumber.toLowerCase().includes(query) ||
      order.design.toLowerCase().includes(query)
    );
  });


  return (
    <main className="min-h-screen bg-[#f5f1ea] text-[#1c1c1a] flex">


      {/* ================================================= */}
      {/* SIDEBAR */}
      {/* ================================================= */}

      <aside className="hidden lg:flex w-62.5 min-h-screen border-r border-[#ded8ce] bg-[#f8f5ef] flex-col">


        {/* Logo */}

        <div className="px-7 pt-8 pb-10">
          <p className="text-sm tracking-[0.3em] font-medium">
            FAB_ART
          </p>

          <p className="text-xs text-[#8b867e] mt-2">
            Private Studio
          </p>
        </div>


        {/* Navigation */}

        <nav className="px-4 flex-1">

          <NavItem
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            active={activePage === "Dashboard"}
            onClick={() => setActivePage("Dashboard")}
          />

          <NavItem
            icon={<FileText size={18} />}
            label="Orders"
            active={activePage === "Orders"}
            onClick={() => setActivePage("Orders")}
          />

          <NavItem
            icon={<Upload size={18} />}
            label="Upload Order"
            active={activePage === "Upload Order"}
            onClick={() => setActivePage("Upload Order")}
          />

          <NavItem
            icon={<Download size={18} />}
            label="Export"
            active={activePage === "Export"}
            onClick={() => setActivePage("Export")}
          />

        </nav>


        {/* Bottom */}

        <div className="px-4 pb-6">

          <NavItem
            icon={<Settings size={18} />}
            label="Settings"
            active={activePage === "Settings"}
            onClick={() => setActivePage("Settings")}
          />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 mt-2 rounded-xl text-sm text-[#77736c] hover:bg-[#eee9e0] hover:text-[#1c1c1a] transition"
          >
            <LogOut size={18} />
            Logout
          </button>

        </div>

      </aside>


      {/* ================================================= */}
      {/* MAIN */}
      {/* ================================================= */}

      <section className="flex-1 min-w-0">


        {/* Header */}

        <header className="h-[82px] border-b border-[#ded8ce] flex items-center justify-between px-6 md:px-10">


          <div>

            <p className="text-sm text-[#8b867e]">
              Private workspace
            </p>

            <h1 className="text-xl font-medium mt-1">
              {activePage}
            </h1>

          </div>


          <div className="flex items-center gap-4">

            {/* Search */}

            <div className="hidden md:flex items-center gap-2 bg-white/60 border border-[#ded8ce] rounded-xl px-3 h-10 w-[230px]">

              <Search
                size={16}
                className="text-[#99938a]"
              />

              <input
                type="text"
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent outline-none text-sm w-full placeholder:text-[#aaa49c]"
              />

            </div>


            {/* Notification */}

            <button className="w-10 h-10 rounded-xl border border-[#ded8ce] bg-white/50 flex items-center justify-center hover:bg-white transition">

              <Bell size={17} />

            </button>

          </div>

        </header>


        {/* Content */}

        <div className="p-6 md:p-10 max-w-[1500px]">


          {/* Welcome */}

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">

            <div>

              <p className="text-sm text-[#8b867e] mb-2">
                Overview
              </p>

              <h2 className="text-3xl md:text-4xl font-light tracking-tight">
                Good evening.
              </h2>

              <p className="text-[#77736c] mt-2">
                Here's what's happening with your orders.
              </p>

            </div>


            <button
              onClick={() => setActivePage("Upload Order")}
              className="inline-flex items-center justify-center gap-2 bg-[#1c1c1a] text-white px-5 h-12 rounded-xl text-sm font-medium hover:bg-[#30302d] transition"
            >
              <Plus size={17} />
              New Order
            </button>

          </div>


          {/* ================================================= */}
          {/* STATS */}
          {/* ================================================= */}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">

            <StatCard
              title="Total Orders"
              value="128"
              subtitle="+12 this month"
              icon={<FileText size={19} />}
            />

            <StatCard
              title="Processing"
              value="24"
              subtitle="Currently active"
              icon={<Clock3 size={19} />}
            />

            <StatCard
              title="Completed"
              value="96"
              subtitle="75% of all orders"
              icon={<CheckCircle2 size={19} />}
            />

            <StatCard
              title="Needs Review"
              value="8"
              subtitle="Requires attention"
              icon={<AlertCircle size={19} />}
              warning
            />

          </div>


          {/* ================================================= */}
          {/* UPLOAD CARD */}
          {/* ================================================= */}

          <div className="bg-[#1c1c1a] text-white rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden">


            <div className="relative z-10 max-w-xl">

              <p className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">
                Handwritten → Digital
              </p>

              <h3 className="text-2xl md:text-3xl font-light">
                Turn your handwritten orders into organized records.
              </h3>

              <p className="text-white/60 text-sm mt-3 leading-6">
                Upload an order PDF and let the studio extract the
                information automatically.
              </p>

              <button
                onClick={() => setActivePage("Upload Order")}
                className="mt-6 inline-flex items-center gap-2 bg-white text-[#1c1c1a] px-5 h-11 rounded-xl text-sm font-medium hover:bg-[#f5f1ea] transition"
              >
                <Upload size={16} />
                Upload PDF
              </button>

            </div>


            {/* Decorative circle */}

            <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full border border-white/10" />

            <div className="absolute -right-8 -bottom-32 w-80 h-80 rounded-full border border-white/10" />

          </div>


          {/* ================================================= */}
          {/* ORDERS */}
          {/* ================================================= */}

          <div className="bg-white/50 border border-[#ded8ce] rounded-2xl overflow-hidden">


            {/* Table Header */}

            <div className="px-6 py-5 border-b border-[#ded8ce] flex items-center justify-between">

              <div>

                <h3 className="font-medium">
                  Recent Orders
                </h3>

                <p className="text-xs text-[#8b867e] mt-1">
                  Your latest boutique orders
                </p>

              </div>


              <button
                onClick={() => setActivePage("Orders")}
                className="text-sm flex items-center gap-1 text-[#77736c] hover:text-[#1c1c1a]"
              >
                View all
                <ArrowUpRight size={15} />
              </button>

            </div>


            {/* Table */}

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead>

                  <tr className="text-left text-xs text-[#8b867e] border-b border-[#ded8ce]">

                    <th className="px-6 py-4 font-medium">
                      Order
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Customer
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Design
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Order Date
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Delivery
                    </th>

                    <th className="px-6 py-4 font-medium">
                      Status
                    </th>

                    <th className="px-6 py-4">
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {filteredOrders.map((order) => (

                    <tr
                      key={order.id}
                      className="border-b border-[#eee9e0] last:border-0 hover:bg-white/60 transition"
                    >

                      <td className="px-6 py-4 font-medium">
                        #{order.orderNumber}
                      </td>

                      <td className="px-6 py-4">
                        {order.customer}
                      </td>

                      <td className="px-6 py-4 text-[#625e58]">
                        {order.design}
                      </td>

                      <td className="px-6 py-4 text-[#625e58]">
                        {order.date}
                      </td>

                      <td className="px-6 py-4 text-[#625e58]">
                        {order.delivery}
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={order.status} />
                      </td>

                      <td className="px-6 py-4 text-right">

                        <button className="w-8 h-8 rounded-lg hover:bg-[#eee9e0] flex items-center justify-center">

                          <MoreHorizontal size={17} />

                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}


/* ================================================= */
/* COMPONENTS */
/* ================================================= */


function NavItem({
  icon,
  label,
  active,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm mb-1 transition ${
        active
          ? "bg-[#e9e3d9] text-[#1c1c1a] font-medium"
          : "text-[#77736c] hover:bg-[#eee9e0] hover:text-[#1c1c1a]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}


function StatCard({
  title,
  value,
  subtitle,
  icon,
  warning = false,
}) {
  return (
    <div className="bg-white/50 border border-[#ded8ce] rounded-2xl p-5">

      <div className="flex items-start justify-between">

        <div className="w-9 h-9 rounded-lg bg-[#eee9e0] flex items-center justify-center">
          {icon}
        </div>

        {warning && (
          <span className="text-[10px] uppercase tracking-wider text-[#9b6b35]">
            Attention
          </span>
        )}

      </div>

      <p className="text-3xl font-light mt-5">
        {value}
      </p>

      <p className="text-sm font-medium mt-1">
        {title}
      </p>

      <p className="text-xs text-[#8b867e] mt-1">
        {subtitle}
      </p>

    </div>
  );
}


function StatusBadge({ status }) {

  const styles = {
    Completed:
      "bg-[#e7eee5] text-[#55704e]",

    Processing:
      "bg-[#eee9df] text-[#7a6a50]",

    "Needs Review":
      "bg-[#f3e7d9] text-[#956b3d]",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
        styles[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}