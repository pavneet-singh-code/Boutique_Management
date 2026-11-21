"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  Clapperboard,
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
import { DoodleBackdrop } from "./Doodles";
import Toaster from "./Toaster";

const sidebarSections = [
  {
    heading: "nav.overview",
    items: [
      { label: "nav.dashboard", path: "/dashboard", icon: LayoutDashboard, feature: "reports" },
      { label: "nav.myWork", path: "/my-work", icon: BriefcaseBusiness, feature: "myWork" },
      { label: "nav.calendar", path: "/calendar", icon: CalendarCheck },
      { label: "nav.content", path: "/content", icon: Clapperboard, feature: "contentView" },
      { label: "nav.monthly", path: "/monthly-review", icon: CalendarDays, feature: "earnings" },
      { label: "nav.yearly", path: "/yearly-review", icon: CalendarRange, feature: "earnings" },
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
  plan: { label: "tab.plan", path: "/content", icon: Clapperboard, match: ["/content"] },
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
    match: ["/settings", "/activity", "/calendar"],
  },
};

const TABS_BY_ROLE = {
  owner: ["home", "orders", "pending", "calendar", "settings"],
  uploader: ["home", "orders", "pending", "calendar", "settings"],
  social_media: ["plan", "orders", "myWork", "profile"],
  worker: ["myWork", "calendar", "profile"],
};

function tabsFor(role) {
  return (TABS_BY_ROLE[role] || TABS_BY_ROLE.owner).map((key) => ALL_TABS[key]);
}

function matches(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

// Every screen draws its own sidebar, so remember how far it was scrolled.
let sidebarScroll = null;

function Sidebar() {
  const { t } = useI18n();
  const navRef = useRef(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    if (sidebarScroll !== null) {
      nav.scrollTop = sidebarScroll;
    } else {
      // First visit: make sure the current page's item is in view.
      nav.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest" });
    }
  }, []);
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
    <aside className="glass fixed inset-y-3 left-3 z-40 hidden w-60 flex-col rounded-[2rem] shadow-md ring-1 ring-white md:flex">
      <Link href="/dashboard" className="press m-3 flex items-center gap-3 rounded-[1.6rem] bg-sand p-3">
        <Image
          src="/brand/icon-96.png"
          alt=""
          width={48}
          height={48}
          priority
          className="h-12 w-12 shrink-0 rounded-full bg-white p-0.5 shadow-sm ring-2 ring-white"
        />
        <span className="min-w-0">
          <span className="block font-display text-xl font-bold leading-tight text-ink">
            {t("app.name")}
          </span>
          <span className="block text-[11px] font-semibold text-accent-soft-ink/80">
            {t("app.tagline")}
          </span>
        </span>
      </Link>

      <nav
        ref={navRef}
        onScroll={(event) => {
          sidebarScroll = event.currentTarget.scrollTop;
        }}
        className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-3 pb-6 pt-2 [mask-image:linear-gradient(to_bottom,black_88%,transparent)]"
      >
        {sections.map((section, index) => (
          <div key={section.heading} className={index === 0 ? "" : "mt-5"}>
            <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted/80">
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
                      "press group flex items-center gap-3 rounded-full px-2 py-1.5",
                      active
                        ? "bg-cocoa font-bold text-white shadow-md shadow-accent/25"
                        : "font-semibold text-ink-2 hover:bg-accent-soft/70"
                    )}
                  >
                    <span
                      className={cx(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        active ? "bg-white/25" : "bg-card shadow-sm ring-1 ring-line"
                      )}
                    >
                      <Icon
                        size={16}
                        strokeWidth={active ? 2.4 : 2}
                        className={active ? "text-white" : "text-accent-ink"}
                      />
                    </span>
                    <span className="text-[14px]">{t(item.label)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-3">
        {me && (
          <Link
            href="/settings"
            className="press mb-1 flex items-center gap-3 rounded-full bg-taupe-soft px-2 py-2"
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
          className="press flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-muted hover:bg-danger-soft hover:text-danger"
        >
          <LogOut size={18} strokeWidth={2} />
          <span className="text-sm font-semibold">{t("nav.logout")}</span>
        </button>
      </div>
    </aside>
  );
}

/**
 * Tablet / laptop bar. List screens show their own big heading, so here they
 * only get the language switch; detail screens (no heading) show their title.
 */
function TopBar({ title, subtitle, actions, showTitle }) {
  if (!showTitle) {
    return (
      <header className="pointer-events-none sticky top-3 z-30 hidden justify-end px-6 md:flex lg:px-8">
        <div className="glass pointer-events-auto rounded-full p-1 shadow-sm ring-1 ring-white">
          <LanguageToggle />
        </div>
      </header>
    );
  }
  return (
    <header className="sticky top-3 z-30 hidden px-6 md:block lg:px-8">
      <div className="glass flex min-h-16 items-center justify-between gap-5 rounded-full py-2.5 pl-7 pr-3 shadow-sm ring-1 ring-white">
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold leading-tight text-ink">{title}</p>
          {subtitle && (
            <p className="hidden truncate text-xs font-medium text-muted lg:block">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions && <div className="flex items-center gap-1.5">{actions}</div>}
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}

export function HeaderIconButton({ label, href, onClick, children }) {
  const className =
    "press flex h-10 w-10 items-center justify-center rounded-full bg-card text-ink-2 shadow-sm ring-1 ring-line hover:text-accent-ink";
  if (href) {
    // Pages inside the app use Link (no reload); phone / WhatsApp links stay plain.
    if (href.startsWith("/")) {
      return (
        <Link href={href} aria-label={label} title={label} className={className}>
          {children}
        </Link>
      );
    }
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
    <header className="glass sticky top-0 z-30 md:hidden">
      <div className="flex h-16 items-center gap-2 px-3">
        {back ? (
          <HeaderIconButton label={t("common.back")} onClick={goBack}>
            <ArrowLeft size={22} />
          </HeaderIconButton>
        ) : (
          <span className="w-2" />
        )}
        <div className="min-w-0 flex-1 px-1">
          {mobileTitle || (brand ? (
            <h1 className="flex items-center gap-2 truncate font-display text-2xl font-bold text-ink">
              <Image src="/brand/icon-96.png" alt="" width={32} height={32} priority className="h-8 w-8 rounded-full bg-white shadow-sm" />
              {title}
            </h1>
          ) : (
            <h1
              className={cx(
                "truncate font-display",
                brand
                  ? "text-2xl font-bold text-ink"
                  : "text-[21px] font-bold text-ink"
              )}
            >
              {title}
            </h1>
          ))}
        </div>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </div>
    </header>
  );
}

/**
 * Everything this person can open, for the phone's tab bar: their main tabs
 * first (short names), then every other screen from the sidebar.
 */
function phoneTabsFor(role) {
  const items = tabsFor(role).map((tab) => ({ label: tab.label, path: tab.path, icon: tab.icon }));
  const seen = new Set(items.map((item) => item.path));
  for (const section of sidebarSections) {
    for (const item of section.items) {
      if (seen.has(item.path) || (item.feature && !can(role, item.feature))) continue;
      seen.add(item.path);
      items.push({ label: item.label, path: item.path, icon: item.icon });
    }
  }
  return items;
}

/** The tab for this page: the longest path that matches (so /orders/new is "Add order", not "Orders"). */
function activePath(pathname, items) {
  let best = null;
  for (const item of items) {
    if (matches(pathname, item.path) && (!best || item.path.length > best.length)) best = item.path;
  }
  return best;
}

// The tab bar is drawn again on every screen, so remember where it was scrolled.
let tabBarScroll = null;

function BottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const me = useMe();
  const tabs = phoneTabsFor(me?.role);
  const current = activePath(pathname, tabs);
  const scroller = useRef(null);

  // Keep the scroll position between screens, and make sure the open screen's tab is visible.
  useLayoutEffect(() => {
    const bar = scroller.current;
    if (!bar) return;
    if (tabBarScroll !== null) bar.scrollLeft = tabBarScroll;
    const active = bar.querySelector('[aria-current="page"]');
    if (active) {
      const left = active.offsetLeft;
      const right = left + active.offsetWidth;
      if (left < bar.scrollLeft || right > bar.scrollLeft + bar.clientWidth) {
        bar.scrollLeft = left - (bar.clientWidth - active.offsetWidth) / 2;
      }
    }
  }, [pathname, tabs.length]);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 md:hidden"
    >
      <div className="glass overflow-hidden rounded-full shadow-lg ring-1 ring-white">
        <div
          ref={scroller}
          onScroll={(event) => {
            tabBarScroll = event.currentTarget.scrollLeft;
          }}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain p-1.5 [mask-image:linear-gradient(to_right,transparent,black_14px,black_calc(100%-14px),transparent)]"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.path === current;
            return (
              <Link
                key={tab.path}
                href={tab.path}
                aria-current={active ? "page" : undefined}
                className="press flex w-[4.3rem] shrink-0 snap-start flex-col items-center gap-0.5 rounded-full py-1"
              >
                <span
                  className={cx(
                    "flex h-9 w-9 items-center justify-center rounded-full transition",
                    active ? "bg-cocoa text-white shadow-md shadow-accent/30" : "text-ink-2"
                  )}
                >
                  <Icon size={19} strokeWidth={active ? 2.4 : 1.9} />
                </span>
                <span
                  className={cx(
                    "line-clamp-2 w-full px-0.5 text-center text-[10.5px] leading-tight",
                    active ? "font-bold text-accent-ink" : "font-semibold text-muted"
                  )}
                >
                  {t(tab.label)}
                </span>
              </Link>
            );
          })}
        </div>
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
      className="press bg-cocoa fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-4 z-40 flex h-15 w-15 items-center justify-center rounded-full text-white shadow-lg shadow-accent/40 ring-4 ring-white/70 md:hidden"
    >
      <Icon size={25} strokeWidth={2.3} />
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
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-taupe-soft text-taupe-ink">
        <Lock size={26} />
      </span>
      <h2 className="mt-4 font-display text-xl font-bold text-ink">{t("noAccess.title")}</h2>
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
    <div className="min-h-dvh text-ink">
      <DoodleBackdrop />
      <Toaster />
      <Sidebar />
      <div className="flex min-h-dvh min-w-0 flex-col md:ml-[16.5rem]">
        {/* Detail screens have no page heading on desktop, so their buttons go here. */}
        <TopBar title={title} subtitle={subtitle} actions={hideTabs ? actions : null} showTitle={hideTabs} />
        <MobileHeader
          title={title}
          mobileTitle={mobileTitle}
          brand={brand}
          back={back}
          actions={actions}
        />
        <main
          className={cx(
            "min-w-0 flex-1 md:px-6 md:py-7 lg:px-8",
            hideTabs ? "pb-8" : "pb-[calc(110px+env(safe-area-inset-bottom))] md:pb-10"
          )}
        >
          <div className="page-enter mx-auto w-full max-w-[1400px]">
            {allowed ? children : <NoAccess role={me?.role} />}
          </div>
        </main>
        {!hideTabs && <BottomNav />}
        {fab && !hideTabs && allowed && <Fab {...fab} />}
      </div>
    </div>
  );
}
