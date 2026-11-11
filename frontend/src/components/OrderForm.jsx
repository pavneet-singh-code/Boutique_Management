"use client";

import { TriangleAlert } from "lucide-react";
import { useI18n } from "../lib/i18n";
import {
  amount,
  clean,
  formatMoney,
  isUnclear,
  parseDate,
  toISODate,
} from "../lib/orders";
import { cx } from "./ui";

export const ORDER_FIELDS = [
  "order_number",
  "customer_name",
  "additional_info",
  "order_date",
  "deliver_date",
  "contact_number",
  "what_to_design",
  "advance_payment",
  "total_amount",
];

/** Turns an order from the API/scanner into form-friendly values. */
export function toFormValues(order = {}) {
  const form = { needs_review: Boolean(order.needs_review) };
  for (const field of ORDER_FIELDS) form[field] = clean(order[field]);
  form.order_date = toISODate(order.order_date);
  form.deliver_date = toISODate(order.deliver_date);
  return form;
}

/** Turns form values back into an API payload. */
export function toPayload(form) {
  const payload = { needs_review: Boolean(form.needs_review) };
  for (const field of ORDER_FIELDS) {
    const value = String(form[field] ?? "").trim();
    payload[field] = value || null;
  }
  return payload;
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-line bg-card px-3.5 text-[16px] text-ink outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/15 md:text-sm";

function Field({ label, hint, warn, full, children }) {
  return (
    <label className={cx("block", full && "sm:col-span-2")}>
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {warn && (
        <span className="mt-1.5 flex items-center gap-1.5 text-xs text-warn-ink">
          <TriangleAlert size={13} className="shrink-0" />
          {warn}
        </span>
      )}
      {hint && !warn && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Group({ title, children }) {
  return (
    <fieldset className="rounded-2xl border border-line bg-card p-4 md:p-6">
      <legend className="px-1 text-xs font-semibold uppercase tracking-[0.12em] text-accent-ink">
        {title}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/**
 * Editable order details.
 * original: the raw order (to point out values the scanner couldn't read).
 */
export default function OrderForm({ value, onChange, original = {} }) {
  const { t, locale } = useI18n();

  const warnFor = (field) => {
    const raw = original[field];
    if (isUnclear(raw)) return t("review.unclear");
    if ((field === "order_date" || field === "deliver_date") && clean(raw) && !parseDate(raw)) {
      return `${t("review.unclear")}: “${clean(raw)}”`;
    }
    return null;
  };

  const text = (field, props = {}) => (
    <input
      type="text"
      value={value[field] ?? ""}
      onChange={(event) => onChange(field, event.target.value)}
      className={cx(inputClass, "h-12 md:h-11")}
      {...props}
    />
  );

  const total = amount(value.total_amount);
  const advance = amount(value.advance_payment) ?? 0;
  const balance = total != null ? Math.max(0, total - advance) : null;

  return (
    <div className="space-y-4 md:space-y-5">
      <Group title={t("edit.customerSection")}>
        <Field label={t("field.customer")} warn={warnFor("customer_name")}>
          {text("customer_name", { autoComplete: "off", required: true })}
        </Field>
        <Field label={t("field.contact")} warn={warnFor("contact_number")}>
          {text("contact_number", { type: "tel", inputMode: "tel", autoComplete: "off" })}
        </Field>
        <Field label={t("field.additional")} warn={warnFor("additional_info")} full>
          {text("additional_info")}
        </Field>
      </Group>

      <Group title={t("edit.orderSection")}>
        <Field label={t("field.orderNumber")} warn={warnFor("order_number")}>
          {text("order_number", { inputMode: "numeric" })}
        </Field>
        <div className="hidden sm:block" />
        <Field label={t("field.orderDate")} warn={warnFor("order_date")}>
          <input
            type="date"
            value={value.order_date ?? ""}
            onChange={(event) => onChange("order_date", event.target.value)}
            className={cx(inputClass, "h-12 md:h-11")}
          />
        </Field>
        <Field label={t("field.deliverDate")} warn={warnFor("deliver_date")}>
          <input
            type="date"
            value={value.deliver_date ?? ""}
            onChange={(event) => onChange("deliver_date", event.target.value)}
            className={cx(inputClass, "h-12 md:h-11")}
          />
        </Field>
        <Field label={t("field.design")} warn={warnFor("what_to_design")} full>
          <textarea
            rows={3}
            value={value.what_to_design ?? ""}
            onChange={(event) => onChange("what_to_design", event.target.value)}
            className={cx(inputClass, "resize-y py-3 leading-6")}
          />
        </Field>
      </Group>

      <Group title={t("edit.paymentSection")}>
        <Field label={`${t("field.total")} (₹)`} warn={warnFor("total_amount")}>
          {text("total_amount", { inputMode: "decimal" })}
        </Field>
        <Field label={`${t("field.advance")} (₹)`} warn={warnFor("advance_payment")}>
          {text("advance_payment", { inputMode: "decimal" })}
        </Field>
        <div className="flex items-center justify-between rounded-xl bg-card-2 px-4 py-3 sm:col-span-2">
          <span className="text-sm text-muted">{t("field.balance")}</span>
          <span className="text-base font-semibold text-ink">
            {formatMoney(balance, locale)}
          </span>
        </div>
      </Group>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-card p-4 md:p-5">
        <span>
          <span className="block text-[15px] font-medium text-ink">
            {t("field.needsReview")}
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            {t("review.toggleHelp")}
          </span>
        </span>
        <span className="relative inline-flex shrink-0">
          <input
            type="checkbox"
            checked={Boolean(value.needs_review)}
            onChange={(event) => onChange("needs_review", event.target.checked)}
            className="peer sr-only"
          />
          <span className="h-7 w-12 rounded-full bg-line transition peer-checked:bg-[#f59e0b] peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40" />
          <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
        </span>
      </label>
    </div>
  );
}
