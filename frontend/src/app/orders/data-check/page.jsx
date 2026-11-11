"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarX2,
  CircleCheck,
  Copy,
  Hash,
  LoaderCircle,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import AppShell, { HeaderIconButton } from "../../../components/AppShell";
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  ErrorBox,
  Notice,
  PageHeading,
  Spinner,
} from "../../../components/ui";
import {
  deleteOrder,
  getDataCheck,
  orderEditPath,
  orderPath,
  updateOrder,
} from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import { clean, customerKey, displayName, formatDate } from "../../../lib/orders";

/** One order with an inline "new order number" box. */
function ProblemOrder({ order, onChanged, onDelete, showNumberEdit = true, reasons }) {
  const { t, locale, tError } = useI18n();
  const [number, setNumber] = useState(order.order_number || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await updateOrder(order.id, { order_number: number });
      setSaved(true);
      onChanged();
    } catch (err) {
      setError(tError(err));
    } finally {
      setSaving(false);
    }
  };

  const name = displayName(order, t);

  return (
    <li className="px-4 py-3.5 md:px-5">
      <div className="flex items-start gap-3">
        <Avatar name={clean(order.customer_name)} seed={customerKey(order.customer_name)} size={40} />
        <div className="min-w-0 flex-1">
          <Link href={orderPath(order)} className="block">
            <p className="truncate text-[15.5px] font-medium text-ink">
              {name}
              {clean(order.additional_info) && (
                <span className="ml-1.5 text-sm font-normal text-muted">
                  {clean(order.additional_info)}
                </span>
              )}
            </p>
            <p className="truncate text-sm text-muted">
              {clean(order.what_to_design) || "—"} · {formatDate(order.order_date || order.created_at, locale)}
            </p>
            {order.filename && <p className="truncate text-xs text-muted">{order.filename}</p>}
          </Link>
          {reasons?.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {reasons.map((reason) => (
                <li key={reason} className="flex items-center gap-1.5 text-xs text-warn-ink">
                  <TriangleAlert size={12} />
                  {t(`check.reason.${reason}`)}
                </li>
              ))}
            </ul>
          )}
          {order.import_notes && (
            <p className="mt-1 text-xs text-muted">
              {t("order.cleanupNote")}: {order.import_notes}
            </p>
          )}
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(order)}
            aria-label={t("common.delete")}
            className="rounded-full p-2 text-muted transition hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      {showNumberEdit ? (
        <form onSubmit={save} className="mt-3 flex gap-2 pl-[52px]">
          <label className="sr-only" htmlFor={`num-${order.id}`}>
            {t("check.newNumber")}
          </label>
          <input
            id={`num-${order.id}`}
            value={number}
            onChange={(event) => {
              setNumber(event.target.value);
              setSaved(false);
            }}
            inputMode="numeric"
            placeholder={t("check.newNumber")}
            className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-card px-3 text-[16px] outline-none focus:border-accent md:text-sm"
          />
          <Button
            type="submit"
            size="sm"
            disabled={saving || !number.trim() || number.trim() === order.order_number}
            className="h-10"
          >
            {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Hash size={15} />}
            {t("check.saveNumber")}
          </Button>
        </form>
      ) : (
        <div className="mt-2 pl-[52px]">
          <Link href={orderEditPath(order)} className="text-sm font-medium text-accent-ink">
            {t("common.edit")} →
          </Link>
        </div>
      )}
      {error && <p className="mt-2 pl-[52px] text-sm text-danger">{error}</p>}
      {saved && !error && (
        <p className="mt-2 flex items-center gap-1 pl-[52px] text-sm text-accent-ink">
          <CircleCheck size={14} />
          {t("check.saved")}
        </p>
      )}
    </li>
  );
}

function Section({ icon: Icon, title, help, children, count }) {
  return (
    <Card className="mx-4 overflow-hidden md:mx-0">
      <div className="flex items-start gap-3 border-b border-line px-4 py-3.5 md:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warn-soft text-warn-ink">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-ink">
            {title} <span className="font-normal text-muted">({count})</span>
          </h2>
          {help && <p className="text-sm text-muted">{help}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

export default function DataCheckPage() {
  const { t, tError } = useI18n();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getDataCheck());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDataCheck()
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, []);

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteOrder(toDelete.id);
      setToDelete(null);
      await load();
    } catch (err) {
      setDeleteError(tError(err));
    } finally {
      setDeleting(false);
    }
  };

  const blocking = data?.blocking ?? 0;

  return (
    <AppShell
      title={t("check.title")}
      subtitle={t("check.subtitle")}
      back="/settings"
      actions={
        <HeaderIconButton label={t("common.refresh")} onClick={load}>
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </HeaderIconButton>
      }
    >
      <div className="mx-auto max-w-3xl">
        <PageHeading
          eyebrow={t("nav.ordersSection")}
          title={t("check.title")}
          subtitle={t("check.subtitle")}
          actions={
            <Button variant="secondary" onClick={load} disabled={loading}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              {t("common.refresh")}
            </Button>
          }
        />

        <ErrorBox error={error} onRetry={load} className="my-4" />

        {!data && !error ? (
          <Spinner />
        ) : data ? (
          <div className="space-y-4 pt-4 md:pt-0">
            <div className="px-4 md:px-0">
              {data.unique_enforced ? (
                <Notice>{t("check.enforced")}</Notice>
              ) : blocking === 0 ? (
                <Notice>
                  <p className="font-semibold">{t("check.allClear")}</p>
                  <p className="mt-0.5">{t("check.allClearNext")}</p>
                </Notice>
              ) : (
                <Notice tone="warn">
                  <p className="font-semibold">{t("check.blocking", { count: blocking })}</p>
                  <p className="mt-0.5">{t("check.subtitle")}</p>
                </Notice>
              )}
            </div>

            {deleteError && (
              <Notice tone="error" className="mx-4 md:mx-0">
                {deleteError}
              </Notice>
            )}

            {data.duplicates.length > 0 && (
              <Section
                icon={Copy}
                title={t("check.duplicates")}
                help={t("check.duplicatesHelp")}
                count={data.duplicates.length}
              >
                {data.duplicates.map((group) => (
                  <div key={group.order_number} className="border-b border-line last:border-0">
                    <p className="bg-card-2 px-4 py-2 text-sm font-semibold text-ink md:px-5">
                      #{group.order_number}{" "}
                      <span className="font-normal text-muted">
                        · {t("check.usedTimes", { count: group.orders.length })}
                      </span>
                    </p>
                    <ul className="divide-y divide-line">
                      {group.orders.map((order) => (
                        <ProblemOrder
                          key={`${order.id}-${order.order_number}`}
                          order={order}
                          onChanged={load}
                          onDelete={setToDelete}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </Section>
            )}

            {data.missing.length > 0 && (
              <Section icon={Hash} title={t("check.missing")} count={data.missing.length}>
                <ul className="divide-y divide-line">
                  {data.missing.map((order) => (
                    <ProblemOrder
                      key={order.id}
                      order={order}
                      onChanged={load}
                      onDelete={setToDelete}
                    />
                  ))}
                </ul>
              </Section>
            )}

            {data.unusual_format.length > 0 && (
              <Section
                icon={TriangleAlert}
                title={t("check.unusual")}
                help={t("check.unusualHelp")}
                count={data.unusual_format.length}
              >
                <ul className="divide-y divide-line">
                  {data.unusual_format.map((order) => (
                    <ProblemOrder key={`${order.id}-${order.order_number}`} order={order} onChanged={load} />
                  ))}
                </ul>
              </Section>
            )}

            {data.date_problems.length > 0 && (
              <Section
                icon={CalendarX2}
                title={t("check.dates")}
                help={t("check.datesHelp")}
                count={data.date_problems.length}
              >
                <ul className="divide-y divide-line">
                  {data.date_problems.map(({ order, reasons }) => (
                    <ProblemOrder
                      key={order.id}
                      order={order}
                      reasons={reasons}
                      showNumberEdit={false}
                      onChanged={load}
                    />
                  ))}
                </ul>
              </Section>
            )}
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t("order.deleteTitle")}
        body={
          toDelete
            ? `${displayName(toDelete, t)} · #${toDelete.order_number || toDelete.id} — ${t("order.deleteBody")}`
            : ""
        }
        busy={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </AppShell>
  );
}
