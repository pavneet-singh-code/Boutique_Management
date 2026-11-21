"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { CircleCheck, Search, UserPlus, X } from "lucide-react";
import { createCustomer, forgetCustomers, getCustomers } from "../lib/api";
import { showToast } from "../lib/toast";
import { useI18n } from "../lib/i18n";
import { clean, customerKey, similarNames } from "../lib/orders";
import { useResource } from "../lib/useResource";
import { Avatar, ConfirmDialog, Notice, cx } from "./ui";

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
  const { t, tError } = useI18n();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const loader = useCallback(() => getCustomers(), []);
  const { data: customers, reload } = useResource(loader, true, "customers");
  // "Add as a new customer" pop-up (stays on this screen, so nothing typed or scanned is lost).
  const [adding, setAdding] = useState(null); // { name, phone } while the pop-up is open
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState("");

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
      ...(customer.phone ? { contact_number: customer.phone } : {}),
    });
    setOpen(false);
  };

  const startAdding = () => {
    setAddError("");
    setAdding({ name: clean(name) || "", phone: clean(value.contact_number) || "" });
    setOpen(false);
  };

  const saveNewCustomer = async () => {
    if (!clean(adding.name)) {
      setAddError(t("new.needName"));
      return;
    }
    setAddBusy(true);
    setAddError("");
    try {
      const created = await createCustomer({ name: adding.name, phone: clean(adding.phone) || null });
      forgetCustomers();
      await reload();
      choose(created);
      setAdding(null);
      showToast({ title: t("toast.customerAdded", { name: created.name }), body: t("toast.customerAddedBody") });
    } catch (err) {
      setAddError(err.code === "phone_in_use" ? t("customers.phoneTaken") : tError(err));
    } finally {
      setAddBusy(false);
    }
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
            onChange({
              customer_name: event.target.value,
              customer_id: null,
              // The phone came with the customer chosen before; it isn't this person's.
              ...(selected?.phone && value.contact_number === selected.phone ? { contact_number: "" } : {}),
            });
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
            <li className="border-t border-line">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={startAdding}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-accent-ink hover:bg-card-2"
              >
                <UserPlus size={16} />
                {t("customers.addAsNew", { name: clean(name) })}
              </button>
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
      ) : null}
      {!warn && !selected && autoMatch && !autoMatch.exact && clean(name) && (
        <button
          type="button"
          onClick={startAdding}
          className="press mt-1.5 inline-flex h-8 items-center gap-1.5 rounded-full bg-card px-3 text-xs font-bold text-accent-ink ring-1 ring-line"
        >
          <UserPlus size={14} />
          {t("customers.addAsNewShort")}
        </button>
      )}
      {warn || selected || autoMatch ? null : clean(name) ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">{t("customers.notSavedYet")}</span>
          <button
            type="button"
            onClick={startAdding}
            className="press inline-flex h-8 items-center gap-1.5 rounded-full bg-accent-soft px-3 text-xs font-bold text-accent-soft-ink"
          >
            <UserPlus size={14} />
            {t("customers.addAsNewShort")}
          </button>
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-muted">{t("customers.pickHelp")}</p>
      )}

      <ConfirmDialog
        open={adding !== null}
        tone="accent"
        title={t("customers.addTitle")}
        body={t("customers.addHelp")}
        confirmLabel={t("customers.add")}
        busy={addBusy}
        onCancel={() => setAdding(null)}
        onConfirm={saveNewCustomer}
      >
        {adding && (
          <div className="space-y-3">
            <label className="block">
              <span className="text-[13px] font-semibold text-ink-2">{t("field.customer")}</span>
              <input
                type="text"
                value={adding.name}
                onChange={(event) => setAdding({ ...adding, name: event.target.value })}
                className="mt-1 h-11 w-full rounded-xl border border-line bg-card px-3.5 text-[16px] text-ink outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-ink-2">{t("field.contact")}</span>
              <input
                type="tel"
                inputMode="tel"
                value={adding.phone}
                onChange={(event) => setAdding({ ...adding, phone: event.target.value })}
                className="mt-1 h-11 w-full rounded-xl border border-line bg-card px-3.5 text-[16px] text-ink outline-none focus:border-accent"
              />
            </label>
            {addError && <Notice tone="error">{addError}</Notice>}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
