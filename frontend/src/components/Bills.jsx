"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CircleCheck,
  CircleDashed,
  FileText,
  LoaderCircle,
  ReceiptIndianRupee,
  Wallet,
} from "lucide-react";
import { createBill, getCustomer, updateBill } from "../lib/api";
import { upiLink, upiQrDataUrl } from "../lib/bill";
import { useI18n } from "../lib/i18n";
import {
  amount,
  clean,
  formatDate,
  formatMoney,
  toISODate,
} from "../lib/orders";
import { useResource } from "../lib/useResource";
import { Button, Card, EmptyState, Notice, Spinner, cx } from "./ui";

/* ---------------- Status chip ---------------- */

export function BillStatus({ status }) {
  const { t } = useI18n();
  const tones = {
    draft: "bg-card-2 text-ink-2",
    sent: "bg-warn-soft text-warn-ink",
    paid: "bg-accent-soft text-accent-soft-ink",
  };
  return (
    <span
      className={cx(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[status],
      )}
    >
      {t(`bills.status.${status}`)}
    </span>
  );
}

/* ---------------- The bill itself (screen + print) ---------------- */

export function BillDocument({ bill, settings }) {
  const { t, locale } = useI18n();
  const link = upiLink(settings, bill);
  const [qr, setQr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    upiQrDataUrl(link, 240).then((url) => !cancelled && setQr(url));
    return () => {
      cancelled = true;
    };
  }, [link]);

  const contact = [clean(settings?.phone), clean(settings?.address)]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="print-area overflow-hidden rounded-2xl border border-line bg-white text-[#111b21] shadow-sm">
      <div className="h-2 bg-[#8c5d4c]" />
      <div className="p-5 md:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- printed bill: plain img prints reliably */}
            <img src="/brand/mark.png" alt="" className="h-16 w-16 shrink-0" />
            <div>
              <h2 className="text-2xl font-bold">
                {clean(settings?.boutique_name) || "Fab_art Studio"}
              </h2>
              {contact && (
                <p className="mt-1 text-sm text-[#667781]">{contact}</p>
              )}
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">
              {t("bills.number")} {bill.bill_number}
            </p>
            <p className="text-[#667781]">
              {formatDate(bill.issued_on, locale)}
            </p>
            <div className="mt-1 print:hidden">
              <BillStatus status={bill.status} />
            </div>
          </div>
        </header>

        <p className="mt-5 text-[15px]">
          <span className="text-[#667781]">{t("bills.customer")}: </span>
          <span className="font-semibold">{bill.customer.name}</span>
          {bill.customer.phone && (
            <span className="text-[#667781]"> · {bill.customer.phone}</span>
          )}
        </p>

        <table className="mt-4 w-full border-collapse text-[15px]">
          <tbody>
            {bill.lines.map((line) => (
              <tr key={line.order_id} className="border-t border-[#e9edef]">
                <td className="whitespace-nowrap py-3 pr-3 align-top text-sm font-semibold text-[#8a5644]">
                  #{line.order_number || line.order_id}
                </td>
                <td className="py-3 pr-3 align-top">
                  {clean(line.what_to_design) || "—"}
                </td>
                <td className="whitespace-nowrap py-3 text-right align-top font-semibold tabular-nums">
                  {formatMoney(line.final_total, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-2 space-y-2 border-t border-[#e9edef] pt-4 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-[#3b4a54]">{t("bills.subtotal")}</dt>
            <dd className="tabular-nums">
              {formatMoney(bill.subtotal, locale)}
            </dd>
          </div>
          {bill.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-[#3b4a54]">{t("pay.discount")}</dt>
              <dd className="tabular-nums">
                − {formatMoney(bill.discount, locale)}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-[#3b4a54]">{t("bills.lessAdvance")}</dt>
            <dd className="tabular-nums">
              − {formatMoney(bill.advance_total, locale)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-[#e9edef] pt-3 text-xl font-bold">
            <dt>{t("bills.amountDue")}</dt>
            <dd className="tabular-nums">
              {formatMoney(bill.amount_due, locale)}
            </dd>
          </div>
        </dl>

        {bill.status === "paid" && (
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-[#f4e6df] px-4 py-2.5 text-sm font-medium text-[#6e4234]">
            <CircleCheck size={17} />
            {t("bills.paidOn", { date: formatDate(bill.paid_on, locale) })}
          </p>
        )}

        {bill.amount_due > 0 && bill.status !== "paid" && (
          <div className="mt-6 flex flex-col items-center text-center">
            {qr ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qr}
                  alt="UPI QR"
                  width={200}
                  height={200}
                  className="h-[200px] w-[200px]"
                />
                <p className="mt-2 text-sm text-[#3b4a54]">
                  {t("bills.scanToPay")}
                </p>
                <p className="text-sm font-medium">{clean(settings.upi_id)}</p>
              </>
            ) : !link ? (
              <p className="text-sm text-[#667781] print:hidden">
                {t("bills.noUpi")}
              </p>
            ) : null}
          </div>
        )}

        <p className="mt-6 text-center font-semibold">
          {clean(settings?.bill_note) || t("bills.thanks")}
        </p>
      </div>
    </article>
  );
}

/* ---------------- Choose suits + prices (new / edit bill) ---------------- */

export function BillEditor({ customerId, bill, preselect = [], onSaved }) {
  const { t, locale, tError } = useI18n();
  const loader = useCallback(() => getCustomer(customerId), [customerId]);
  const { data: customer, error } = useResource(
    loader,
    true,
    `customer:${customerId}`,
  );

  const [lines, setLines] = useState(null); // { [orderId]: { on, price } }
  const [discount, setDiscount] = useState(
    bill?.discount ? String(bill.discount) : "",
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const available = useMemo(
    () =>
      (customer?.orders || []).filter(
        (o) => !o.bill_id || (bill && o.bill_id === bill.id),
      ),
    [customer, bill],
  );

  // Fill in the choices once the customer's orders have loaded.
  if (customer && lines === null) {
    const initial = {};
    for (const order of available) {
      const onBill = bill?.lines.find((line) => line.order_id === order.id);
      initial[order.id] = {
        on: Boolean(onBill) || preselect.includes(String(order.id)),
        price: String(
          onBill?.final_total ??
            order.final_total ??
            order.estimated_total ??
            "",
        ),
      };
    }
    setLines(initial);
  }

  if (error) return <Notice tone="error">{tError(error)}</Notice>;
  if (!customer || lines === null) return <Spinner />;
  if (available.length === 0) {
    return <EmptyState icon={FileText} title={t("bills.noUnbilled")} />;
  }

  const chosen = available.filter((o) => lines[o.id]?.on);
  const subtotal = chosen.reduce(
    (sum, o) => sum + (amount(lines[o.id].price) ?? 0),
    0,
  );
  const advance = chosen.reduce((sum, o) => sum + (o.advance_amount || 0), 0);
  const disc = Math.min(amount(discount) ?? 0, subtotal);
  const due = Math.max(0, subtotal - disc - advance);

  const update = (id, changes) =>
    setLines((prev) => ({ ...prev, [id]: { ...prev[id], ...changes } }));

  const save = async () => {
    if (chosen.length === 0) {
      setSaveError(t("bills.mustPickSuit"));
      return;
    }
    setSaving(true);
    setSaveError("");
    const payload = {
      discount: amount(discount) ?? 0,
      lines: chosen.map((o) => ({
        order_id: o.id,
        final_total: amount(lines[o.id].price) ?? 0,
      })),
    };
    try {
      const saved = bill
        ? await updateBill(bill.id, payload)
        : await createBill({
            ...payload,
            customer_id: customer.id,
            issued_on: toISODate(new Date()),
          });
      onSaved(saved);
    } catch (err) {
      setSaveError(tError(err));
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3 md:px-5">
          <h2 className="font-semibold text-ink">{t("bills.chooseSuits")}</h2>
          <p className="text-sm text-muted">{t("bills.chooseSuitsHelp")}</p>
        </div>
        <ul className="divide-y divide-line">
          {available.map((order) => {
            const line = lines[order.id];
            return (
              <li
                key={order.id}
                className={cx("px-4 py-3 md:px-5", !line.on && "opacity-60")}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={line.on}
                    onChange={(event) =>
                      update(order.id, { on: event.target.checked })
                    }
                    className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-accent-ink">
                      #{order.order_number || order.id}
                      <span className="ml-2 font-normal text-muted">
                        {formatDate(order.order_date, locale)}
                      </span>
                    </span>
                    <span className="block text-[15px] text-ink">
                      {clean(order.what_to_design) || "—"}
                    </span>
                    {order.advance_amount ? (
                      <span className="block text-xs text-muted">
                        {t("pay.advance")}:{" "}
                        {formatMoney(order.advance_amount, locale)}
                      </span>
                    ) : null}
                  </span>
                </label>
                {line.on && (
                  <label className="mt-2 flex items-center justify-end gap-2 pl-8">
                    <span className="text-xs text-muted">
                      {t("bills.finalPrice")}
                    </span>
                    <input
                      inputMode="decimal"
                      value={line.price}
                      onChange={(event) =>
                        update(order.id, { price: event.target.value })
                      }
                      className="h-11 w-36 rounded-xl border border-line bg-card px-3 text-right text-[16px] font-semibold outline-none focus:border-accent md:text-sm"
                    />
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="space-y-2 p-4 text-[15px] md:p-5">
        <div className="flex justify-between">
          <span className="text-muted">
            {t("bills.subtotal")} ·{" "}
            {t("bills.selected", { count: chosen.length })}
          </span>
          <span className="tabular-nums">{formatMoney(subtotal, locale)}</span>
        </div>
        <label className="flex items-center justify-between gap-3">
          <span className="text-muted">{t("pay.discount")} (₹)</span>
          <input
            inputMode="decimal"
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
            placeholder="0"
            className="h-10 w-32 rounded-xl border border-line bg-card px-3 text-right text-[16px] outline-none focus:border-accent md:text-sm"
          />
        </label>
        <div className="flex justify-between">
          <span className="text-muted">{t("bills.lessAdvance")}</span>
          <span className="tabular-nums">− {formatMoney(advance, locale)}</span>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-lg font-bold">
          <span>{t("bills.amountDue")}</span>
          <span className="tabular-nums">{formatMoney(due, locale)}</span>
        </div>
      </Card>

      {saveError && <Notice tone="error">{saveError}</Notice>}

      <div className="pb-safe sticky bottom-0 z-20 -mx-4 border-t border-line bg-card/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <Button
          size="lg"
          className="w-full md:w-auto"
          onClick={save}
          disabled={saving}
        >
          {saving ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <ReceiptIndianRupee size={18} />
          )}
          {bill ? t("bills.saveChanges") : t("bills.create")}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Payment steps on an order ---------------- */

function Step({ done, icon: Icon, title, children }) {
  return (
    <li className="flex gap-3 py-3">
      <span
        className={cx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          done ? "bg-accent text-white" : "bg-card-2 text-muted",
        )}
      >
        {done ? <CircleCheck size={18} /> : <Icon size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <div className="text-sm text-ink-2">{children}</div>
      </div>
    </li>
  );
}

export function PaymentSteps({ order }) {
  const { t, locale } = useI18n();
  const on = (date) =>
    date ? ` ${t("pay.onDate", { date: formatDate(date, locale) })}` : "";
  const billed = order.final_total != null;
  const paid = order.payment_state === "paid";

  return (
    <div>
      <ol className="divide-y divide-line">
        <Step
          done={Boolean(order.advance_amount)}
          icon={Wallet}
          title={`1. ${t("pay.step1")}`}
        >
          {order.advance_amount
            ? `${formatMoney(order.advance_amount, locale)}${on(order.advance_date)}`
            : "—"}
          {order.estimated_total != null && (
            <span className="block text-xs text-muted">
              {t("pay.estimate")}: {formatMoney(order.estimated_total, locale)}
            </span>
          )}
        </Step>
        <Step done={billed} icon={FileText} title={`2. ${t("pay.step2")}`}>
          {billed ? (
            <>
              {formatMoney(order.final_total, locale)}
              {on(order.billed_date)}
              {order.bill_id && (
                <Link
                  href={`/bills/${order.bill_id}`}
                  className="ml-2 font-medium text-accent-ink"
                >
                  {t("pay.viewBill", { number: order.bill_number })} →
                </Link>
              )}
            </>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              {t("pay.notBilled")}
              {order.customer_id && (
                <Link
                  href={`/bills/new?customer=${order.customer_id}&orders=${order.id}`}
                  className="font-medium text-accent-ink"
                >
                  {t("pay.createBill")} →
                </Link>
              )}
            </span>
          )}
        </Step>
        <Step done={paid} icon={CircleDashed} title={`3. ${t("pay.step3")}`}>
          {paid
            ? `${formatMoney(order.final_payment_amount ?? 0, locale)}${on(order.final_payment_date)}`
            : billed
              ? `${t("pay.balance")}: ${formatMoney(order.balance, locale)}`
              : "—"}
        </Step>
      </ol>
      <div className="flex justify-between border-t border-line py-3 text-[15px]">
        <span className="text-muted">{t("pay.received")}</span>
        <span className="font-semibold">
          {formatMoney(order.received ?? 0, locale)}
        </span>
      </div>
    </div>
  );
}
