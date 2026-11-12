"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  CircleHelp,
  Database,
  DatabaseBackup,
  Download,
  Hash,
  Languages,
  BriefcaseBusiness,
  ChartNoAxesColumn,
  History,
  Users,
  LogOut,
  ReceiptIndianRupee,
  UsersRound,
  Scissors,
  Smartphone,
  Wifi,
  WifiOff,
} from "lucide-react";
import AppShell from "../../components/AppShell";
import BoutiqueDetails from "../../components/BoutiqueDetails";
import MyProfile from "../../components/MyProfile";
import { Card, LanguageToggle, PageHeading, cx } from "../../components/ui";
import { downloadBackup, logout, pingServer } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { groupCustomers } from "../../lib/orders";
import { useOrders } from "../../lib/useOrders";
import { can, useMe } from "../../lib/roles";

function Row({ icon: Icon, title, help, children, href, onClick, danger }) {
  const body = (
    <>
      <span
        className={cx(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          danger ? "bg-danger-soft text-danger" : "bg-card-2 text-ink-2"
        )}
      >
        <Icon size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cx("block text-[16px]", danger ? "text-danger" : "text-ink")}>
          {title}
        </span>
        {help && <span className="block text-[13.5px] leading-5 text-muted">{help}</span>}
      </span>
      {children}
      {(href || onClick) && !children && <ChevronRight size={18} className="text-muted" />}
    </>
  );
  const className = "flex w-full items-center gap-4 px-4 py-3.5 text-left md:px-5";
  if (href) {
    return (
      <Link href={href} className={cx(className, "transition hover:bg-card-2")}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cx(className, "transition hover:bg-card-2")}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}

export default function SettingsPage() {
  const router = useRouter();
  const { t, tError } = useI18n();
  const me = useMe();
  const role = me?.role;
  const staff = can(role, "editOrders");
  const { orders, ready } = useOrders({ enabled: staff });
  const [online, setOnline] = useState(null);
  const [backup, setBackup] = useState({ busy: false, message: "", error: false });

  const saveBackup = async () => {
    setBackup({ busy: true, message: t("backup.downloading"), error: false });
    try {
      const name = await downloadBackup();
      setBackup({ busy: false, message: t("backup.done", { name }), error: false });
    } catch (err) {
      setBackup({ busy: false, message: tError(err), error: true });
    }
  };

  useEffect(() => {
    let cancelled = false;
    pingServer().then((ok) => {
      if (!cancelled) setOnline(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <AppShell title={t("settings.title")} subtitle={t("settings.subtitle")}>
      <div className="mx-auto max-w-2xl space-y-3 md:space-y-5">
        <PageHeading
          eyebrow={t("nav.management")}
          title={t("settings.title")}
          subtitle={t("settings.subtitle")}
        />

        {/* Who is logged in (like WhatsApp's settings header) */}
        <MyProfile />

        <Card className="divide-y divide-line overflow-hidden rounded-none border-x-0 md:rounded-2xl md:border-x">
          <Row icon={Languages} title={t("settings.language")} help={t("settings.languageHelp")} />
          <div className="px-4 pb-4 pl-[72px] md:px-5 md:pl-[76px]">
            <LanguageToggle size="lg" />
          </div>
        </Card>

        {can(role, "team") && (
          <Card className="divide-y divide-line overflow-hidden rounded-none border-x-0 md:rounded-2xl md:border-x">
            <Row icon={UsersRound} title={t("team.title")} help={t("team.subtitle")} href="/team" />
            <Row icon={History} title={t("activity.title")} help={t("activity.subtitle")} href="/activity" />
          </Card>
        )}

        {can(role, "boutiqueSettings") && <BoutiqueDetails />}

        <Card className="divide-y divide-line overflow-hidden rounded-none border-x-0 md:rounded-2xl md:border-x">
          {can(role, "customers") && (
            <Row icon={Users} title={t("nav.customers")} help={t("customers.subtitle")} href="/customers" />
          )}
          {can(role, "myWork") && role !== "worker" && role !== "social_media" && (
            <Row icon={BriefcaseBusiness} title={t("nav.myWork")} help={t("mywork.empty")} href="/my-work" />
          )}
          {can(role, "reports") && (
            <Row
              icon={ChartNoAxesColumn}
              title={t("tab.reports")}
              help={`${t("nav.monthly")} · ${t("nav.yearly")}`}
              href="/monthly-review"
            />
          )}
          {can(role, "bills") && (
            <Row
              icon={ReceiptIndianRupee}
              title={t("nav.bills")}
              help={t("bills.subtitle")}
              href="/bills"
            />
          )}
          {can(role, "export") && (
            <Row
              icon={Download}
              title={t("nav.export")}
              help={t("export.subtitle")}
              href="/export-orders"
            />
          )}
          {can(role, "dataCheck") && (
            <Row
              icon={Hash}
              title={t("check.title")}
              help={t("check.navHelp")}
              href="/orders/data-check"
            />
          )}
          {can(role, "backup") && (
            <Row
              icon={DatabaseBackup}
              title={t("backup.title")}
              help={backup.message || t("backup.help")}
              onClick={backup.busy ? undefined : saveBackup}
              danger={backup.error}
            />
          )}
          {!can(role, "allActivity") && (
            <Row icon={History} title={t("activity.title")} help={t("activity.mine")} href="/activity" />
          )}
          {staff && (
            <Row
              icon={Database}
              title={t("settings.data")}
              help={
                ready
                  ? `${t("settings.ordersStored")}: ${orders.length} · ${t("settings.customersStored")}: ${groupCustomers(orders).length}`
                  : t("common.loading")
              }
            />
          )}
          <Row
            icon={online === false ? WifiOff : Wifi}
            title={t("settings.server")}
            help={
              online === null
                ? t("settings.checking")
                : online
                  ? t("settings.serverOnline")
                  : t("settings.serverOffline")
            }
          >
            <span
              className={cx(
                "h-2.5 w-2.5 rounded-full",
                online === null ? "bg-line" : online ? "bg-accent" : "bg-danger"
              )}
            />
          </Row>
        </Card>

        <Card className="overflow-hidden rounded-none border-x-0 md:rounded-2xl md:border-x">
          {staff && (
          <>
          <Row icon={CircleHelp} title={t("settings.help")} />
          <ol className="space-y-2 px-4 pb-4 pl-[72px] text-[14.5px] leading-6 text-ink-2 md:px-5 md:pl-[76px]">
            {["settings.help1", "settings.help2", "settings.help3", "settings.help4"].map(
              (key, index) => (
                <li key={key} className="flex gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-soft-ink">
                    {index + 1}
                  </span>
                  {t(key)}
                </li>
              )
            )}
          </ol>
          </>
          )}
          <div className={staff ? "border-t border-line" : ""}>
            <Row icon={Smartphone} title={t("settings.install")} help={t("settings.installHelp")} />
          </div>
        </Card>

        <Card className="overflow-hidden rounded-none border-x-0 md:rounded-2xl md:border-x">
          <Row
            icon={LogOut}
            title={t("nav.logout")}
            help={t("settings.logoutHelp")}
            onClick={handleLogout}
            danger
          />
        </Card>
      </div>
    </AppShell>
  );
}
