"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  Clock3,
  PartyPopper,
  RefreshCw,
  TriangleAlert,
  UserX,
} from "lucide-react";
import AppShell, { HeaderIconButton } from "../../components/AppShell";
import { OrderChatList } from "../../components/OrderList";
import { Card, EmptyState, ErrorBox, PageHeading, SectionTitle, Spinner } from "../../components/ui";
import { useI18n } from "../../lib/i18n";
import { formatDate } from "../../lib/orders";
import { useOrders } from "../../lib/useOrders";
import { pendingGroups } from "../../lib/work";

function Group({ icon: Icon, tone, title, help, orders, rightText }) {
  if (orders.length === 0) return null;
  return (
    <section>
      <SectionTitle
        title={
          <span className="flex items-center gap-2">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${tone}`}>
              <Icon size={15} />
            </span>
            {title}
            <span className="text-sm font-normal text-muted">({orders.length})</span>
          </span>
        }
        help={help}
      />
      <OrderChatList orders={orders} rightText={rightText} />
    </section>
  );
}

export default function PendingPage() {
  const { t, locale } = useI18n();
  const { orders, ready, loading, error, reload } = useOrders();
  const groups = useMemo(() => pendingGroups(orders), [orders]);
  const readyUnbilled = groups.ready.filter((o) => !o.bill_id);
  const readyBilled = groups.ready.filter((o) => o.bill_id);
  const total =
    groups.late.length + groups.unassigned.length + groups.soon.length + groups.ready.length;

  return (
    <AppShell
      title={t("pending.title")}
      subtitle={t("pending.subtitle")}
      feature="editOrders"
      actions={
        <HeaderIconButton label={t("common.refresh")} onClick={() => reload()}>
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </HeaderIconButton>
      }
    >
      <PageHeading eyebrow={t("nav.ordersSection")} title={t("pending.title")} subtitle={t("pending.subtitle")} />
      <ErrorBox error={error} onRetry={() => reload()} className="my-4" />

      {!ready && !error ? (
        <Spinner />
      ) : ready ? (
        total === 0 && groups.trials.length === 0 && groups.confirm.length === 0 ? (
          <Card className="mx-4 mt-4 md:mx-0">
            <EmptyState icon={PartyPopper} title={t("pending.allClear")} />
          </Card>
        ) : (
          <div className="space-y-6 pt-4 md:pt-0">
            {groups.confirm.length > 0 && (
              <Link
                href="/orders/check-delivery"
                className="mx-4 flex items-center gap-3 rounded-2xl bg-warn-soft p-4 transition hover:opacity-90 md:mx-0"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f59e0b] text-white">
                  <CircleHelp size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-warn-ink">
                    {t("confirm.banner", { count: groups.confirm.length })}
                  </span>
                  <span className="block text-sm text-warn-ink/80">{t("confirm.bannerHelp")}</span>
                </span>
                <ChevronRight size={20} className="shrink-0 text-warn-ink" />
              </Link>
            )}
            <p className="px-4 text-sm text-muted md:px-0">{t("pending.count", { count: total })}</p>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Group
                icon={TriangleAlert}
                tone="bg-danger-soft text-danger"
                title={t("pending.late")}
                help={t("pending.lateHelp")}
                orders={groups.late}
              />
              <Group
                icon={UserX}
                tone="bg-warn-soft text-warn-ink"
                title={t("pending.unassigned")}
                help={t("pending.unassignedHelp")}
                orders={groups.unassigned}
              />
              <Group
                icon={Clock3}
                tone="bg-[#e6effb] text-[#1e4f91]"
                title={t("pending.soon")}
                orders={groups.soon}
              />
              <Group
                icon={CircleCheck}
                tone="bg-accent-soft text-accent-soft-ink"
                title={t("pending.ready")}
                help={t("pending.readyHelp")}
                orders={readyUnbilled}
              />
              <Group
                icon={CircleCheck}
                tone="bg-accent-soft text-accent-soft-ink"
                title={t("pending.readyPaid")}
                orders={readyBilled}
              />
              <Group
                icon={CalendarClock}
                tone="bg-card-2 text-ink-2"
                title={t("pending.trials")}
                orders={groups.trials}
                rightText={(order) => (
                  <span className="font-medium text-accent-ink">
                    {formatDate(order.trial_date, locale, { day: "numeric", month: "short" })}
                  </span>
                )}
              />
            </div>
          </div>
        )
      ) : null}
    </AppShell>
  );
}
