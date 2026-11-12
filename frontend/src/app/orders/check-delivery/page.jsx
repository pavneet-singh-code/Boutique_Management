"use client";

import { useMemo, useState } from "react";
import { CircleCheck, LoaderCircle, PartyPopper } from "lucide-react";
import AppShell from "../../../components/AppShell";
import { Avatar, Button, Card, EmptyState, ErrorBox, Notice, PageHeading, Spinner, cx } from "../../../components/ui";
import { confirmDelivery } from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import { avatarSeed, clean, displayName, formatDate, rawName } from "../../../lib/orders";
import { useOrders } from "../../../lib/useOrders";
import { isOpen } from "../../../lib/work";

/** Old orders whose delivery date passed before stages existed: ask, don't guess. */
export default function CheckDeliveryPage() {
  const { t, locale, tError } = useI18n();
  const { orders, ready, error, reload } = useOrders();
  const waiting = useMemo(
    () =>
      orders
        .filter((o) => o.status_confirmed === false && isOpen(o))
        .sort((a, b) => String(a.deliver_date).localeCompare(String(b.deliver_date))),
    [orders]
  );
  const [picked, setPicked] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const toggle = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allPicked = waiting.length > 0 && waiting.every((o) => picked.has(o.id));

  const answer = async (ids, delivered) => {
    setBusy(true);
    setMessage("");
    try {
      await confirmDelivery(ids, delivered);
      setPicked((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
    } catch (err) {
      setMessage(tError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title={t("confirm.title")} subtitle={t("confirm.subtitle")} back="/pending" feature="confirmDelivery" hideTabs>
      <div className="mx-auto max-w-2xl pb-6">
        <PageHeading eyebrow={t("nav.ordersSection")} title={t("confirm.title")} subtitle={t("confirm.subtitle")} />
        <ErrorBox error={error} onRetry={() => reload()} className="my-4" />
        {message && <Notice tone="error" className="mx-4 my-3 md:mx-0">{message}</Notice>}

        {!ready && !error ? (
          <Spinner />
        ) : ready && waiting.length === 0 ? (
          <Card className="mx-4 mt-4 md:mx-0">
            <EmptyState icon={PartyPopper} title={t("confirm.done")} />
          </Card>
        ) : ready ? (
          <>
            <p className="px-4 pb-2 pt-4 text-sm text-muted md:hidden">{t("confirm.subtitle")}</p>
            <div className="flex items-center justify-between gap-3 border-y border-line bg-card-2 px-4 py-2 md:rounded-t-2xl md:border-x">
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={allPicked}
                  onChange={() => setPicked(allPicked ? new Set() : new Set(waiting.map((o) => o.id)))}
                  className="h-5 w-5 accent-[var(--accent)]"
                />
                {t("confirm.selectAll")}
              </label>
              <span className="text-sm text-muted">{t("confirm.selected", { count: picked.size })}</span>
            </div>
            <ul className="divide-y divide-line bg-card md:rounded-b-2xl md:border-x md:border-b md:border-line">
              {waiting.map((order) => (
                <li key={order.id} className={cx("flex items-center gap-3 px-4 py-3", picked.has(order.id) && "bg-accent-soft/40")}>
                  <input
                    type="checkbox"
                    checked={picked.has(order.id)}
                    onChange={() => toggle(order.id)}
                    aria-label={displayName(order, t)}
                    className="h-5 w-5 shrink-0 accent-[var(--accent)]"
                  />
                  <Avatar name={rawName(order)} seed={avatarSeed(order)} size={40} />
                  <button type="button" onClick={() => toggle(order.id)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[15.5px] font-medium text-ink">{displayName(order, t)}</span>
                    <span className="block truncate text-sm text-muted">
                      #{clean(order.order_number) || order.id} · {clean(order.what_to_design) || "—"}
                    </span>
                    <span className="block text-xs text-muted">
                      {t("orders.delivery")}: {formatDate(order.deliver_date, locale)}
                    </span>
                  </button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => answer([order.id], false)}>
                    {t("confirm.notYet")}
                  </Button>
                </li>
              ))}
            </ul>

            <div className="pb-safe sticky bottom-0 z-20 mt-4 border-t border-line bg-card/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:px-0">
              <Button
                size="lg"
                className="w-full md:w-auto"
                disabled={busy || picked.size === 0}
                onClick={() => answer([...picked], true)}
              >
                {busy ? <LoaderCircle size={18} className="animate-spin" /> : <CircleCheck size={18} />}
                {t("confirm.delivered")} ({picked.size})
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
