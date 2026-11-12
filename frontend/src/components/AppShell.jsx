"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  History,
  Lock,
  CalendarRange,
  ChartNoAxesColumn,
  ClipboardList,
  Download,
  FilePlus,
  House,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Plus,
  ReceiptIndianRupee,
  Scissors,
  Settings,
  Upload,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import { getToken, logout, refreshMe } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { can, homeFor, useMe } from "../lib/roles";
import { EmployeeAvatar, LanguageToggle, LinkButton, cx } from "./ui";

const sidebarSections = [
  {
    heading: "nav.overview",
    items: [
      { label: "nav.dashboard", path: "/dashboard", icon: LayoutDashboard, feature: "reports" },
      { label: "nav.myWork", path: "/my-work", icon: BriefcaseBusiness, feature: "myWork" },
      { label: "nav.calendar", path: "/calendar", icon: CalendarCheck },
      { label: "nav.monthly", path: "/monthly-review", icon: CalendarDays, feature: "reports" },
      { label: "nav.yearly", path: "/yearly-review", icon: CalendarRange, feature: "reports" },
    ],
  },
  {
    heading: "nav.ordersSection",
    items: [
      { label: "nav.orders", path: "/orders", icon: ClipboardList, exact: true, feature: "orders" },
      { label: "nav.pending", path: "/pending", icon: ListTodo, feature: "editOrders" },
      { label: "nav.upload", path: "/upload-orders", icon: Upload, feature: "upload" },
      { label: "nav.newOrder", path: "/orders/new", icon: FilePlus, feature: "editOrders" },
      { label: "nav.bills", path: "/bills", icon: ReceiptIndianRupee, feature: "bills" },
      { label: "nav.export", path: "/export-orders", icon: Download, feature: "export" },
    ],
  },
  {
    heading: "nav.management",
    items: [
      { label: "nav.customers", path: "/customers", icon: Users, feature: "customers" },
      { label: "nav.team", path: "/team", icon: UsersRound, feature: "team" },
      { label: "nav.activity", path: "/activity", icon: History },
      { label: "nav.settings", path: "/settings", icon: Settings },
    ],
  },
];

const ALL_TABS = {
  home: { label: "tab.home", path: "/dashboard", icon: House, match: ["/dashboard"] },
  orders: {
    label: "tab.orders",
    path: "/orders",
    icon: ClipboardList,
    match: ["/orders", "/upload-orders", "/bills"],
  },
  customers: { label: "tab.customers", path: "/customers", icon: Users, match: ["/customers"] },
  pending: { label: "tab.pending", path: "/pending", icon: ListTodo, match: ["/pending"] },
  calendar: { label: "tab.calendar", path: "/calendar", icon: CalendarCheck, match: ["/calendar"] },
  reports: {
    label: "tab.reports",
    path: "/monthly-review",
    icon: ChartNoAxesColumn,
    match: ["/monthly-review", "/yearly-review"],
  },
  settings: {
    label: "tab.settings",
    path: "/settings",
    icon: Settings,
    match: ["/settings", "/export-orders", "/team", "/activity", "/monthly-review", "/yearly-review", "/customers"],
  },
  myWork: { label: "tab.myWork", path: "/my-work", icon: BriefcaseBusiness, match: ["/my-work"] },
  profile: {
    label: "tab.profile",
    path: "/settings",
    icon: UserRound,
    match: ["/settings", "/activity"],
  },
};

const TABS_BY_ROLE = {
  owner: ["home", "orders", "pending", "calendar", "settings"],
  uploader: ["home", "orders", "pending", "calendar", "settings"],
  social_media: ["orders", "myWork", "calendar", "profile"],
  worker: ["myWork", "calendar", "profile"],
};

function tabsFor(role) {
  return (TABS_BY_ROLE[role] || TABS_BY_ROLE.owner).map((key) => ALL_TABS[key]);
}

function matches(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function Sidebar() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();
  const sections = sidebarSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.feature || can(me?.role, item.feature)),
    }))
    .filter((section) => section.items.length > 0);

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
        {sections.map((section, index) => (
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
        {me && (
          <Link
            href="/settings"
            className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-[#f0e9df]"
          >
            <EmployeeAvatar employee={me} size={34} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{me.name}</span>
              <span className="block truncate text-xs text-muted">
                {me.employee_code} · {t(`role.${me.role}`)}
              </span>
            </span>
          </Link>
        )}
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

function TopBar({ title, subtitle, actions }) {
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
        <div className="flex items-center gap-2">
          {actions && <div className="flex items-center">{actions}</div>}
          <LanguageToggle />
        </div>
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
  const me = useMe();
  const tabs = tabsFor(me?.role);

  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card md:hidden"
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match.some((path) => matches(pathname, path));
          return (
            <Link
              key={tab.label}
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
function NoAccess({ role }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-card-2 text-muted">
        <Lock size={26} />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-ink">{t("noAccess.title")}</h2>
      <p className="mt-1 text-sm text-muted">{t("noAccess.body")}</p>
      <LinkButton href={homeFor(role)} className="mt-5">
        {t("noAccess.home")}
      </LinkButton>
    </div>
  );
}

/**
 * `feature` (see lib/roles.js) decides who may open the screen,
 * e.g. feature="customers" keeps workers out. No feature = everyone.
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
  feature,
  children,
}) {
  const router = useRouter();
  const me = useMe();

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    // Keep name / role up to date (they may have changed on another phone).
    refreshMe().catch(() => {});
  }, [router]);

  const allowed = !feature || !me || can(me.role, feature);

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <Sidebar />
      <div className="flex min-h-dvh min-w-0 flex-col md:ml-64">
        {/* Detail screens have no page heading on desktop, so their buttons go here. */}
        <TopBar title={title} subtitle={subtitle} actions={hideTabs ? actions : null} />
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
          <div className="mx-auto w-full max-w-[1400px]">
            {allowed ? children : <NoAccess role={me?.role} />}
          </div>
        </main>
        {!hideTabs && <BottomNav />}
        {fab && !hideTabs && allowed && <Fab {...fab} />}
      </div>
    </div>
  );
}
