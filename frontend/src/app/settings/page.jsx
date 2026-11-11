"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  CircleHelp,
  Database,
  Download,
  Languages,
  LogOut,
  Scissors,
  Smartphone,
  Wifi,
  WifiOff,
} from "lucide-react";
import AppShell from "../../components/AppShell";
import { Card, LanguageToggle, PageHeading, cx } from "../../components/ui";
import { logout, pingServer } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { groupCustomers } from "../../lib/orders";
import { useOrders } from "../../lib/useOrders";

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
  const { t } = useI18n();
  const { orders, ready } = useOrders();
  const [online, setOnline] = useState(null);

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

        {/* Profile, like WhatsApp's settings header */}
        <div className="flex items-center gap-4 border-b border-line bg-card px-4 py-4 md:rounded-2xl md:border md:px-5 md:shadow-sm">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white">
            <Scissors size={28} />
          </span>
          <span>
            <span className="block text-xl font-semibold text-ink">{t("app.name")}</span>
            <span className="block text-sm text-muted">{t("app.tagline")}</span>
          </span>
        </div>

        <Card className="divide-y divide-line overflow-hidden rounded-none border-x-0 md:rounded-2xl md:border-x">
          <Row icon={Languages} title={t("settings.language")} help={t("settings.languageHelp")} />
          <div className="px-4 pb-4 pl-[72px] md:px-5 md:pl-[76px]">
            <LanguageToggle size="lg" />
          </div>
        </Card>

        <Card className="divide-y divide-line overflow-hidden rounded-none border-x-0 md:rounded-2xl md:border-x">
          <Row
            icon={Download}
            title={t("nav.export")}
            help={t("export.subtitle")}
            href="/export-orders"
          />
          <Row
            icon={Database}
            title={t("settings.data")}
            help={
              ready
                ? `${t("settings.ordersStored")}: ${orders.length} · ${t("settings.customersStored")}: ${groupCustomers(orders).length}`
                : t("common.loading")
            }
          />
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
          <div className="border-t border-line">
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
