"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  ChartNoAxesColumn,
  ClipboardList,
  Download,
  FilePlus,
  House,
  LayoutDashboard,
  LogOut,
  Plus,
  Scissors,
  Settings,
  Upload,
  Users,
} from "lucide-react";
import { getToken, logout } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { LanguageToggle, cx } from "./ui";

const sidebarSections = [
  {
    heading: "nav.overview",
    items: [
      { label: "nav.dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "nav.monthly", path: "/monthly-review", icon: CalendarDays },
      { label: "nav.yearly", path: "/yearly-review", icon: CalendarRange },
    ],
  },
  {
    heading: "nav.ordersSection",
    items: [
      { label: "nav.orders", path: "/orders", icon: ClipboardList, exact: true },
      { label: "nav.upload", path: "/upload-orders", icon: Upload },
      { label: "nav.newOrder", path: "/orders/new", icon: FilePlus },
      { label: "nav.export", path: "/export-orders", icon: Download },
    ],
  },
  {
    heading: "nav.management",
    items: [
      { label: "nav.customers", path: "/customers", icon: Users },
      { label: "nav.settings", path: "/settings", icon: Settings },
    ],
  },
];

const tabs = [
  { label: "tab.home", path: "/dashboard", icon: House, match: ["/dashboard"] },
  {
    label: "tab.orders",
    path: "/orders",
    icon: ClipboardList,
    match: ["/orders", "/upload-orders"],
  },
  { label: "tab.customers", path: "/customers", icon: Users, match: ["/customers"] },
  {
    label: "tab.reports",
    path: "/monthly-review",
    icon: ChartNoAxesColumn,
    match: ["/monthly-review", "/yearly-review"],
  },
  {
    label: "tab.settings",
    path: "/settings",
    icon: Settings,
    match: ["/settings", "/export-orders"],
  },
];

function matches(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function Sidebar() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-[#faf7f1] md:flex">
      <Link href="/dashboard" className="flex items-center gap-3 px-6 pb-7 pt-8">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#e5d8c6] bg-[#eee5d8] text-[#725c45]">
          <Scissors size={22} strokeWidth={1.6} />
        </span>
        <span className="min-w-0">
          <span className="block font-serif text-[22px] leading-tight tracking-tight text-[#30271f]">
            {t("app.name")}
          </span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94816c]">
            {t("app.tagline")}
          </span>
        </span>
      </Link>

      <div className="mx-5 border-t border-line" />

      <nav className="flex-1 overflow-y-auto px-4 py-6">
        {sidebarSections.map((section, index) => (
          <div key={section.heading} className={index === 0 ? "" : "mt-7"}>
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a08e7b]">
              {t(section.heading)}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = item.exact
                  ? pathname === item.path ||
                    (/^\/orders\/\d+/.test(pathname) && item.path === "/orders")
                  : matches(pathname, item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition",
                      active
                        ? "bg-[#eae0d2] font-semibold text-[#493727] ring-1 ring-inset ring-[#e1d3c1]"
                        : "font-medium text-[#706355] hover:bg-[#f0e9df] hover:text-[#493727]"
                    )}
                  >
                    <Icon
                      size={18}
                      strokeWidth={active ? 2.1 : 1.7}
                      className={active ? "text-[#80664b]" : "text-[#9b8975]"}
                    />
                    <span className="text-[13.5px]">{t(item.label)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-line px-4 py-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[#827366] transition hover:bg-[#eee4d8] hover:text-[#704a3e]"
        >
          <LogOut size={18} strokeWidth={1.7} />
          <span className="text-sm font-medium">{t("nav.logout")}</span>
        </button>
      </div>
    </aside>
  );
}

function TopBar({ title, subtitle }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-30 hidden border-b border-line bg-[#faf7f1]/95 backdrop-blur-md md:block">
      <div className="flex min-h-20 items-center justify-between gap-5 px-8 py-4">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#998875]">
            {t("app.name")}
          </p>
          <p className="truncate font-serif text-2xl text-ink">{title}</p>
          {subtitle && (
            <p className="mt-0.5 hidden text-sm text-muted lg:block">{subtitle}</p>
          )}
        </div>
        <LanguageToggle />
      </div>
    </header>
  );
}

export function HeaderIconButton({ label, href, onClick, children }) {
  const className =
    "flex h-10 w-10 items-center justify-center rounded-full text-ink-2 transition hover:bg-card-2 active:bg-card-2";
  if (href) {
    return (
      <a href={href} aria-label={label} title={label} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  );
}

function MobileHeader({ title, mobileTitle, brand, back, actions }) {
  const { t } = useI18n();
  const router = useRouter();

  const goBack = () => {
    if (typeof back === "string") router.push(back);
    else router.back();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card md:hidden">
      <div className="flex h-14 items-center gap-1 px-2">
        {back ? (
          <HeaderIconButton label={t("common.back")} onClick={goBack}>
            <ArrowLeft size={22} />
          </HeaderIconButton>
        ) : (
          <span className="w-2" />
        )}
        <div className="min-w-0 flex-1 px-1">
          {mobileTitle || (
            <h1
              className={cx(
                "truncate",
                brand
                  ? "text-[22px] font-bold tracking-tight text-accent"
                  : "text-[19px] font-semibold text-ink"
              )}
            >
              {title}
            </h1>
          )}
        </div>
        {actions && <div className="flex items-center">{actions}</div>}
      </div>
    </header>
  );
}

function BottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card md:hidden"
    >
      <div className="grid grid-cols-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match.some((path) => matches(pathname, path));
          return (
            <Link
              key={tab.path}
              href={tab.path}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center gap-1 pb-2 pt-2.5"
            >
              <span
                className={cx(
                  "flex h-8 w-14 items-center justify-center rounded-full transition",
                  active ? "bg-accent-soft text-accent-soft-ink" : "text-ink-2"
                )}
              >
                <Icon size={21} strokeWidth={active ? 2.3 : 1.8} />
              </span>
              <span
                className={cx(
                  "text-[11.5px] leading-none",
                  active ? "font-semibold text-ink" : "text-ink-2"
                )}
              >
                {t(tab.label)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Fab({ href, label, icon: Icon = Plus }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-black/20 transition active:scale-95 md:hidden"
    >
      <Icon size={24} />
    </Link>
  );
}

/**
 * Page frame. Phones: WhatsApp-style app bar + bottom tabs + floating button.
 * Tablets/desktop: sidebar + top bar.
 */
export default function AppShell({
  title,
  subtitle,
  mobileTitle,
  brand = false,
  back,
  actions,
  fab,
  hideTabs = false,
  children,
}) {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <Sidebar />
      <div className="flex min-h-dvh min-w-0 flex-col md:ml-64">
        <TopBar title={title} subtitle={subtitle} />
        <MobileHeader
          title={title}
          mobileTitle={mobileTitle}
          brand={brand}
          back={back}
          actions={actions}
        />
        <main
          className={cx(
            "min-w-0 flex-1 md:px-8 md:py-7",
            hideTabs ? "pb-6" : "pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-10"
          )}
        >
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
        {!hideTabs && <BottomNav />}
        {fab && !hideTabs && <Fab {...fab} />}
      </div>
    </div>
  );
}
