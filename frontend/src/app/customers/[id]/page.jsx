"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CheckCheck,
  Info,
  MessageCircle,
  Phone,
  Plus,
  ReceiptIndianRupee,
  TriangleAlert,
} from "lucide-react";
import AppShell, { HeaderIconButton } from "../../../components/AppShell";
import { BillStatus } from "../../../components/Bills";
import { Avatar, ErrorBox, Spinner } from "../../../components/ui";
import { getCustomer, orderPath } from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import {
  clean,
  formatDate,
  formatMoney,
  friendlyDate,
  orderDate,
  orderValue,
  parseDate,
  phoneForLinks,
  toISODate,
} from "../../../lib/orders";
import { useResource } from "../../../lib/useResource";

/** An order, shown as a sent chat message. */
function OrderBubble({ order }) {
  const { t, locale } = useI18n();
  const value = orderValue(order);
  const date = orderDate(order);

  return (
    <Link
      href={orderPath(order)}
      className="relative ml-auto block w-fit min-w-[210px] max-w-[85%] rounded-xl rounded-tr-sm bg-bubble-out px-3 pb-1.5 pt-2 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] transition active:opacity-80 md:max-w-[60%]"
    >
      <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-accent-ink">
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
        {order.deliver_date && (
          <p>
            {t("orders.delivery")}: <b className="font-medium">{formatDate(order.deliver_date, locale)}</b>
          </p>
        )}
        {value != null && (
          <p>
            {formatMoney(value, locale)}
            <span className="text-[#667781]"> · {t(`pay.state.${order.payment_state}`)}</span>
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

/** A bill, shown as a received chat message. */
function BillBubble({ bill }) {
  const { t, locale } = useI18n();
  return (
    <Link
      href={`/bills/${bill.id}`}
      className="relative block w-fit min-w-[210px] max-w-[85%] rounded-xl rounded-tl-sm bg-bubble-in px-3 pb-2 pt-2 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] transition active:opacity-80 md:max-w-[60%]"
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold text-[#008069]">
        <ReceiptIndianRupee size={14} />
        {bill.bill_number}
      </p>
      <p className="mt-1 text-[15px] text-[#111b21]">
        {bill.lines.length === 1 ? t("bills.suitOne") : t("bills.suits", { count: bill.lines.length })}
        {" · "}
        <b>{formatMoney(bill.amount_due, locale)}</b> {t("bills.amountDue").toLowerCase()}
      </p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <BillStatus status={bill.status} />
        <span className="text-[11px] text-[#667781]">
          {parseDate(bill.issued_on)?.toLocaleDateString(locale, { day: "numeric", month: "short" })}
        </span>
      </div>
    </Link>
  );
}

export default function CustomerPage() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const loader = useCallback(() => getCustomer(id), [id]);
  const { data: customer, error, reload } = useResource(loader);
  const endRef = useRef(null);

  // Orders and bills in one chat timeline, oldest first.
  const timeline = useMemo(() => {
    if (!customer) return [];
    const items = [
      ...customer.orders.map((order) => ({ kind: "order", item: order, date: orderDate(order), id: `o${order.id}` })),
      ...customer.bills.map((bill) => ({ kind: "bill", item: bill, date: parseDate(bill.issued_on), id: `b${bill.id}` })),
    ].sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
    return items.map((entry, index) => ({
      ...entry,
      showDay: index === 0 || toISODate(entry.date) !== toISODate(items[index - 1].date),
    }));
  }, [customer]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [timeline.length]);

  if (!customer) {
    return (
      <AppShell title={t("customers.title")} back="/customers" hideTabs>
        <ErrorBox error={error} onRetry={reload} className="mt-4" />
        {!error && <Spinner />}
      </AppShell>
    );
  }

  const phone = phoneForLinks(customer.phone);
  const subtitle = t("customers.orders", {
    count: customer.order_count,
    value: formatMoney(customer.total_value, locale),
  });
  const newOrderHref = `/orders/new?customer=${encodeURIComponent(customer.name)}&customerId=${customer.id}${
    customer.phone ? `&phone=${encodeURIComponent(customer.phone)}` : ""
  }`;

  return (
    <AppShell
      title={customer.name}
      subtitle={subtitle}
      back="/customers"
      hideTabs
      mobileTitle={
        <Link href={`/customers/${customer.id}/info`} className="flex min-w-0 items-center gap-2.5">
          <Avatar name={customer.name} seed={`c${customer.id}`} size={38} />
          <span className="min-w-0">
            <span className="block truncate text-[16.5px] font-semibold leading-tight text-ink">{customer.name}</span>
            <span className="block truncate text-xs text-muted">
              {customer.balance_due > 0
                ? t("customers.due", { value: formatMoney(customer.balance_due, locale) })
                : subtitle}
            </span>
          </span>
        </Link>
      }
      actions={
        <>
          {phone && (
            <>
              <HeaderIconButton label={t("common.whatsapp")} href={`https://wa.me/${phone}`}>
                <MessageCircle size={21} />
              </HeaderIconButton>
              <HeaderIconButton label={t("common.call")} href={`tel:+${phone}`}>
                <Phone size={20} />
              </HeaderIconButton>
            </>
          )}
          <HeaderIconButton label={t("customers.info")} href={`/customers/${customer.id}/info`}>
            <Info size={20} />
          </HeaderIconButton>
        </>
      }
    >
      <div className="chat-wallpaper flex min-h-[calc(100dvh-56px)] flex-col md:min-h-[60vh] md:overflow-hidden md:rounded-2xl md:border md:border-line">
        {customer.notes && (
          <Link
            href={`/customers/${customer.id}/info`}
            className="mx-auto mt-3 max-w-[90%] rounded-lg bg-[#fff8c5] px-3 py-1.5 text-center text-xs text-[#54656f] shadow-sm"
          >
            📏 {customer.notes}
          </Link>
        )}
        <div className="flex-1 space-y-2 px-3 py-4 md:px-8">
          {timeline.map(({ kind, item, date, id: key, showDay }) => (
            <Fragment key={key}>
              {showDay && (
                <div className="flex justify-center py-1.5">
                  <span className="rounded-lg bg-white/90 px-3 py-1 text-xs font-medium text-[#54656f] shadow-sm">
                    {date ? friendlyDate(date, t, locale) : "—"}
                  </span>
                </div>
              )}
              {kind === "order" ? <OrderBubble order={item} /> : <BillBubble bill={item} />}
            </Fragment>
          ))}
          <div ref={endRef} />
        </div>

        {/* Like the message box at the bottom of a chat */}
        <div className="pb-safe sticky bottom-0 flex gap-2 px-3 py-2.5 md:px-8">
          <Link
            href={newOrderHref}
            className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full bg-white pl-2 pr-5 text-[15px] text-[#54656f] shadow-sm transition active:opacity-80"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white">
              <Plus size={20} />
            </span>
            <span className="truncate">{t("customers.newOrder", { name: customer.name })}</span>
          </Link>
          {customer.unbilled_count > 0 && (
            <Link
              href={`/bills/new?customer=${customer.id}`}
              aria-label={t("pay.createBill")}
              title={t("pay.createBill")}
              className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-accent px-4 text-[15px] font-medium text-white shadow-sm"
            >
              <ReceiptIndianRupee size={19} />
              <span className="hidden sm:inline">{t("pay.createBill")}</span>
            </Link>
          )}
        </div>
      </div>
    </AppShell>
  );
}
