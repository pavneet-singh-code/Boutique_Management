"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { CircleCheck, Search, UserPlus, X } from "lucide-react";
import { getCustomers } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { clean, customerKey, similarNames } from "../lib/orders";
import { useResource } from "../lib/useResource";
import { Avatar, cx } from "./ui";

const phoneDigits = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-10) : "";
};

/**
 * Search-as-you-type customer box.
 * value: { customer_id, customer_name, contact_number }
 * onChange(changes): called with the fields that changed.
 */
export default function CustomerPicker({ value, onChange, inputClassName, warn }) {
  const { t } = useI18n();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const loader = useCallback(() => getCustomers(), []);
  const { data: customers } = useResource(loader);

  const name = value.customer_name ?? "";
  const selected = customers?.find((c) => c.id === value.customer_id) || null;

  // Best automatic match for what was typed / scanned (same phone or same name).
  const autoMatch = useMemo(() => {
    if (!customers || value.customer_id) return null;
    const phone = phoneDigits(value.contact_number);
    if (phone) {
      const byPhone = customers.find((c) => phoneDigits(c.phone) === phone);
      if (byPhone) return { customer: byPhone, exact: true };
    }
    const key = customerKey(name);
    if (!key) return null;
    const same = customers.filter((c) => customerKey(c.name) === key);
    if (same.length === 1) return { customer: same[0], exact: true };
    const similar = customers.find((c) => similarNames(c.name, name));
    return similar ? { customer: similar, exact: false } : null;
  }, [customers, value.customer_id, value.contact_number, name]);

  const suggestions = useMemo(() => {
    if (!customers) return [];
    const query = name.trim().toLowerCase();
    if (!query) return customers.slice(0, 6);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          (c.phone || "").includes(query) ||
          similarNames(c.name, name)
      )
      .slice(0, 6);
  }, [customers, name]);

  const choose = (customer) => {
    onChange({
      customer_id: customer.id,
      customer_name: customer.name,
      ...(customer.phone && !clean(value.contact_number) ? { contact_number: customer.phone } : {}),
    });
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative mt-1.5">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={name}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(event) => {
            onChange({ customer_name: event.target.value, customer_id: null });
            setOpen(true);
          }}
          className={cx(inputClassName, "!mt-0 pl-10", selected && "pr-10")}
        />
        {selected && (
          <button
            type="button"
            onClick={() => onChange({ customer_id: null })}
            aria-label={t("common.close")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:text-ink"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {open && (suggestions.length > 0 || clean(name)) && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-xl border border-line bg-card py-1 shadow-xl"
        >
          {suggestions.map((customer) => (
            <li key={customer.id} role="option" aria-selected={customer.id === value.customer_id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(customer)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-card-2"
              >
                <Avatar name={customer.name} seed={`c${customer.id}`} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] text-ink">{customer.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {t("customers.existing", { count: customer.order_count })}
                    {customer.phone ? ` · ${customer.phone}` : ""}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {clean(name) && !suggestions.some((c) => customerKey(c.name) === customerKey(name)) && (
            <li className="border-t border-line px-3 py-2 text-sm text-muted">
              <span className="flex items-center gap-2">
                <UserPlus size={16} />
                {t("customers.newCustomer", { name: clean(name) })}
              </span>
            </li>
          )}
        </ul>
      )}

      {warn ? null : selected ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-accent-ink">
          <CircleCheck size={13} />
          {t("customers.existing", { count: selected.order_count })}
        </p>
      ) : autoMatch ? (
        <button
          type="button"
          onClick={() => choose(autoMatch.customer)}
          className="mt-1.5 flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-soft-ink"
        >
          <CircleCheck size={13} />
          {autoMatch.exact ? "" : "? "}
          {autoMatch.customer.name} · {t("customers.existing", { count: autoMatch.customer.order_count })}
        </button>
      ) : clean(name) ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
          <UserPlus size={13} />
          {t("customers.willCreate")}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-muted">{t("customers.pickHelp")}</p>
      )}
    </div>
  );
}
