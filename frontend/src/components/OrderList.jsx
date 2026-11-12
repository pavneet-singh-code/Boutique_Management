"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, TriangleAlert } from "lucide-react";
import { orderEditPath, orderPath } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useCan } from "../lib/roles";
import {
  avatarSeed,
  clean,
  orderValue,
  rawName,
  daysBetween,
  displayName,
  formatDate,
  formatMoney,
  friendlyDate,
  parseDate,
} from "../lib/orders";
import { Avatar, ReviewBadge, cx } from "./ui";
import { LateChip, ProgressBar, StageChip } from "./Work";
import { ReelBadge } from "./Content";
import { isLate, isOpen } from "../lib/work";

/** Short "delivery" hint: "3 days left" / "Due today" / date. */
export function DeliveryHint({ order, className }) {
  const { t, locale } = useI18n();
  const date = parseDate(order.deliver_date);
  if (!date) return null;
  const diff = daysBetween(new Date(), date);
  let text = friendlyDate(date, t, locale);
  let tone = "text-muted";
  if (diff === 0) {
    text = t("order.dueToday");
    tone = "text-accent-ink font-medium";
  } else if (diff > 0 && diff <= 3) {
    tone = "text-accent-ink font-medium";
  }
  return (
    <span className={cx(tone, className)}>
      {t("orders.delivery")}: {text}
    </span>
  );
}

/** One order as a WhatsApp chat-list row. */
export function OrderRow({ order, showDelivery = true, rightText }) {
  const { t, locale } = useI18n();
  const name = displayName(order, t);
  const design = clean(order.what_to_design);
  const extra = clean(order.additional_info);
  const total = orderValue(order);

  return (
    <li>
      <Link
        href={orderPath(order)}
        className="flex items-center gap-3 px-4 py-3 transition hover:bg-card-2 active:bg-card-2"
      >
        <Avatar name={rawName(order)} seed={avatarSeed(order)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[16.5px] font-medium text-ink">
              {name}
              {extra && (
                <span className="ml-1.5 text-sm font-normal text-muted">
                  {extra}
                </span>
              )}
            </p>
            <span className="shrink-0 text-xs text-muted">
              {rightText ?? friendlyDate(order.order_date || order.created_at, t, locale)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className="truncate text-[14.5px] text-muted">
              {order.order_number && (
                <span className="text-ink-2">#{clean(order.order_number)} · </span>
              )}
              {design || "—"}
            </p>
            {order.needs_review ? (
              <span
                className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#f59e0b] px-1 text-white"
                title={t("review.needs")}
              >
                <TriangleAlert size={12} strokeWidth={2.5} />
              </span>
            ) : total != null ? (
              <span className="shrink-0 text-xs font-medium text-ink-2">
                {formatMoney(total, locale)}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            {showDelivery ? (
              <DeliveryHint order={order} className="min-w-0 truncate text-xs" />
            ) : (
              <span />
            )}
            <span className="flex shrink-0 items-center gap-1">
              <ReelBadge content={order.content} />
              {isLate(order) && <LateChip />}
              {order.status && order.status !== "received" && (
                <StageChip status={order.status} step={order.current_step} />
              )}
            </span>
          </div>
          {isOpen(order) && (order.tasks || []).length > 0 && (
            <ProgressBar value={order.progress ?? 0} className="mt-1.5" />
          )}
        </div>
      </Link>
    </li>
  );
}

export function OrderChatList({ orders, showDelivery, rightText }) {
  return (
    <ul className="bg-card md:overflow-hidden md:rounded-2xl md:border md:border-line">
      {orders.map((order) => (
        <OrderRow
          key={order.id}
          order={order}
          showDelivery={showDelivery}
          rightText={rightText?.(order)}
        />
      ))}
    </ul>
  );
}

/** Wide table for tablets / desktop. */
export function OrdersTable({ orders }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const seeMoney = useCan("money");
  const canEdit = useCan("editOrders");

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card shadow-sm">
      <table className="w-full min-w-[1000px] border-collapse text-left">
        <thead>
          <tr className="bg-card-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            <th className="px-5 py-3.5">{t("field.orderNumber")}</th>
            <th className="px-4 py-3.5">{t("field.customer")}</th>
            <th className="px-4 py-3.5">{t("field.design")}</th>
            <th className="px-4 py-3.5">{t("field.orderDate")}</th>
            <th className="px-4 py-3.5">{t("orders.delivery")}</th>
            <th className="px-4 py-3.5">{t("stage.label")}</th>
            {seeMoney && (
              <>
                <th className="px-4 py-3.5 text-right">{t("field.total")}</th>
                <th className="px-4 py-3.5 text-right">{t("pay.received")}</th>
                <th className="px-4 py-3.5">{t("pay.title")}</th>
              </>
            )}
            <th className="px-4 py-3.5">{t("field.needsReview")}</th>
            <th className="px-5 py-3.5 text-right">
              <span className="sr-only">{t("common.edit")}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {orders.map((order) => (
            <tr
              key={order.id}
              onClick={() => router.push(orderPath(order))}
              className="cursor-pointer transition-colors hover:bg-card-2/60"
            >
              <td className="px-5 py-3.5">
                <span className="font-medium text-ink">
                  {clean(order.order_number) || `#${order.id}`}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={rawName(order)}
                    seed={avatarSeed(order)}
                    size={34}
                  />
                  <div className="min-w-0">
                    <p className="max-w-[180px] truncate text-sm font-medium text-ink">
                      {displayName(order, t)}
                    </p>
                    {clean(order.additional_info) && (
                      <p className="max-w-[180px] truncate text-xs text-muted">
                        {clean(order.additional_info)}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <span
                  className="block max-w-[220px] truncate text-sm text-ink-2"
                  title={clean(order.what_to_design)}
                >
                  {clean(order.what_to_design) || "—"}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-sm text-ink-2">
                {formatDate(order.order_date, locale)}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-sm text-ink-2">
                {formatDate(order.deliver_date, locale)}
              </td>
              <td className="px-4 py-3.5">
                <span className="flex flex-col items-start gap-1">
                  <span className="flex gap-1">
                    <StageChip status={order.status} step={order.current_step} />
                    {isLate(order) && <LateChip />}
                  </span>
                  {isOpen(order) && (order.tasks || []).length > 0 && (
                    <ProgressBar value={order.progress ?? 0} className="w-20" />
                  )}
                </span>
              </td>
              {seeMoney && (
              <>
              <td className="whitespace-nowrap px-4 py-3.5 text-right text-sm font-medium text-ink">
                {formatMoney(orderValue(order), locale)}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-right text-sm text-ink-2">
                {formatMoney(order.received ?? 0, locale)}
              </td>
              <td className="whitespace-nowrap px-4 py-3.5 text-xs text-ink-2">
                {t(`pay.state.${order.payment_state || "none"}`)}
                {order.bill_number && <span className="block text-muted">{order.bill_number}</span>}
              </td>
              </>
              )}
              <td className="px-4 py-3.5">
                <ReviewBadge needsReview={Boolean(order.needs_review)} />
              </td>
              <td className="px-4 py-3.5 text-right">
                {canEdit && (
                <Link
                  href={orderEditPath(order)}
                  onClick={(event) => event.stopPropagation()}
                  aria-label={t("common.edit")}
                  title={t("common.edit")}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-2 transition hover:bg-card-2"
                >
                  <Pencil size={14} />
                </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
