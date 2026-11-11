"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCheck, MessageCircle, Phone, Plus, TriangleAlert, Users } from "lucide-react";
import AppShell, { HeaderIconButton } from "../../../components/AppShell";
import { Avatar, EmptyState, ErrorBox, Spinner } from "../../../components/ui";
import { useI18n } from "../../../lib/i18n";
import {
  amount,
  clean,
  formatDate,
  formatMoney,
  friendlyDate,
  groupCustomers,
  orderDate,
  phoneForLinks,
  toISODate,
} from "../../../lib/orders";
import { useOrders } from "../../../lib/useOrders";

/** One order shown as a sent chat message. */
function OrderBubble({ order }) {
  const { t, locale } = useI18n();
  const total = amount(order.total_amount);
  const advance = amount(order.advance_payment);
  const date = orderDate(order);

  return (
    <Link
      href={`/orders/${order.id}`}
      className="relative ml-auto block w-fit min-w-[200px] max-w-[85%] rounded-xl rounded-tr-sm bg-bubble-out px-3 pb-1.5 pt-2 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] transition active:opacity-80 md:max-w-[60%]"
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-ink">
        #{clean(order.order_number) || order.id}
        {order.needs_review && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-1.5 py-px text-[10.5px] font-medium text-warn-ink">
            <TriangleAlert size={11} />
            {t("review.needs")}
          </span>
        )}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-[15px] leading-6 text-[#111b21]">
        {clean(order.what_to_design) || "—"}
      </p>
      <div className="mt-1.5 space-y-0.5 text-[13px] text-[#3b4a54]">
        {clean(order.deliver_date) && (
          <p>
            {t("orders.delivery")}: <b className="font-medium">{formatDate(order.deliver_date, locale)}</b>
          </p>
        )}
        {total != null && (
          <p>
            {formatMoney(total, locale)}
            {advance != null && (
              <span className="text-[#667781]">
                {" "}
                · {t("field.advance")} {formatMoney(advance, locale)}
              </span>
            )}
          </p>
        )}
      </div>
      <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-[#667781]">
        {date ? date.toLocaleDateString(locale, { day: "numeric", month: "short" }) : ""}
        <CheckCheck
          size={15}
          className={order.needs_review ? "text-[#8696a0]" : "text-[#53bdeb]"}
          aria-label={order.needs_review ? t("review.needs") : t("review.ok")}
        />
      </p>
    </Link>
  );
}

export default function CustomerPage() {
  const { key } = useParams();
  const customerKeyParam = decodeURIComponent(key);
  const { t, locale } = useI18n();
  const { orders, ready, error, reload } = useOrders();
  const endRef = useRef(null);

  const customer = useMemo(
    () => groupCustomers(orders).find((c) => c.key === customerKeyParam),
    [orders, customerKeyParam]
  );

  // Chat order: oldest at the top, newest at the bottom.
  const timeline = useMemo(() => {
    if (!customer) return [];
    const sorted = [...customer.orders].sort(
      (a, b) => (orderDate(a)?.getTime() ?? 0) - (orderDate(b)?.getTime() ?? 0) || a.id - b.id
    );
    return sorted.map((order, index) => {
      const date = orderDate(order);
      const previous = index > 0 ? orderDate(sorted[index - 1]) : undefined;
      return { order, date, showDay: index === 0 || toISODate(date) !== toISODate(previous) };
    });
  }, [customer]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [timeline.length]);

  if (!customer) {
    return (
      <AppShell title={t("customers.title")} back="/customers" hideTabs>
        <ErrorBox error={error} onRetry={() => reload()} className="mt-4" />
        {!ready && !error ? (
          <Spinner />
        ) : ready ? (
          <EmptyState icon={Users} title={t("customers.notFound")} />
        ) : null}
      </AppShell>
    );
  }

  const name = customer.name || t("common.unknownCustomer");
  const phone = phoneForLinks(customer.contact);
  const subtitle = t("customers.orders", {
    count: customer.orders.length,
    value: formatMoney(customer.total, locale),
  });
  const newOrderHref = `/orders/new?customer=${encodeURIComponent(customer.name)}${
    customer.contact ? `&phone=${encodeURIComponent(customer.contact)}` : ""
  }`;

  return (
    <AppShell
      title={name}
      subtitle={subtitle}
      back="/customers"
      hideTabs
      mobileTitle={
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={customer.name} seed={customer.key} size={38} />
          <span className="min-w-0">
            <span className="block truncate text-[16.5px] font-semibold leading-tight text-ink">
              {name}
            </span>
            <span className="block truncate text-xs text-muted">{subtitle}</span>
          </span>
        </span>
      }
      actions={
        phone ? (
          <>
            <HeaderIconButton label={t("common.whatsapp")} href={`https://wa.me/${phone}`}>
              <MessageCircle size={21} />
            </HeaderIconButton>
            <HeaderIconButton label={t("common.call")} href={`tel:+${phone}`}>
              <Phone size={20} />
            </HeaderIconButton>
          </>
        ) : null
      }
    >
      <div className="chat-wallpaper flex min-h-[calc(100dvh-56px)] flex-col md:min-h-[60vh] md:overflow-hidden md:rounded-2xl md:border md:border-line">
        <div className="flex-1 space-y-2 px-3 py-4 md:px-8">
          {timeline.map(({ order, date, showDay }) => {
            return (
              <Fragment key={order.id}>
                {showDay && (
                  <div className="flex justify-center py-1.5">
                    <span className="rounded-lg bg-white/90 px-3 py-1 text-xs font-medium text-[#54656f] shadow-sm">
                      {date ? friendlyDate(date, t, locale) : "—"}
                    </span>
                  </div>
                )}
                <OrderBubble order={order} />
              </Fragment>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Like the message box at the bottom of a chat */}
        <div className="pb-safe sticky bottom-0 px-3 py-2.5 md:px-8">
          <Link
            href={newOrderHref}
            className="flex h-12 items-center gap-3 rounded-full bg-white pl-2 pr-5 text-[15px] text-[#54656f] shadow-sm transition active:opacity-80"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white">
              <Plus size={20} />
            </span>
            <span className="truncate">{t("customers.newOrder", { name })}</span>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
