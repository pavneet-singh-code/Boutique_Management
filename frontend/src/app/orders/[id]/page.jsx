"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  CircleCheck,
  FileText,
  IndianRupee,
  MessageCircle,
  Pencil,
  Phone,
  Scissors,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import AppShell, { HeaderIconButton } from "../../../components/AppShell";
import { PaymentSteps } from "../../../components/Bills";
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorBox,
  LinkButton,
  Notice,
  ReviewBadge,
  Spinner,
  cx,
} from "../../../components/ui";
import { deleteOrder, findOrder, orderEditPath, updateOrder } from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import {
  avatarSeed,
  customerPhone,
  clean,
  daysBetween,
  displayName,
  rawName,
  formatDate,
  formatMoney,
  parseDate,
  phoneForLinks,
} from "../../../lib/orders";
import { useOrders } from "../../../lib/useOrders";

function Row({ label, value, strong }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      <span
        className={cx(
          "text-right text-[15px] text-ink",
          strong && "font-semibold"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <Card className="mx-4 overflow-hidden md:mx-0">
      <h2 className="flex items-center gap-2 border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-accent-ink md:px-5">
        <Icon size={15} />
        {title}
      </h2>
      <div className="divide-y divide-line px-4 md:px-5">{children}</div>
    </Card>
  );
}

function ActionButton({ icon: Icon, label, href, onClick, disabled, external }) {
  const className = cx(
    "flex flex-1 flex-col items-center gap-1.5 rounded-2xl border border-line bg-card px-2 py-3 text-[13px] font-medium text-accent-ink transition hover:bg-card-2",
    disabled && "pointer-events-none opacity-40"
  );
  const content = (
    <>
      <Icon size={22} />
      {label}
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        className={className}
        aria-disabled={disabled}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {content}
    </button>
  );
}

function OrderDetailContent() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, locale, tError } = useI18n();
  const { orders, ready, error, reload } = useOrders();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const order = findOrder(orders, id, searchParams.get("id"));

  const markChecked = async () => {
    setBusy(true);
    setActionError("");
    try {
      await updateOrder(order.id, { needs_review: false });
    } catch (err) {
      setActionError(tError(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setActionError("");
    try {
      await deleteOrder(order.id);
      router.replace("/orders");
    } catch (err) {
      setActionError(tError(err));
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  if (!order) {
    return (
      <AppShell title={t("order.title")} back="/orders" hideTabs>
        <ErrorBox error={error} onRetry={() => reload()} className="mt-4" />
        {!ready && !error ? (
          <Spinner />
        ) : ready ? (
          <EmptyState
            icon={FileText}
            title={t("order.notFound")}
            action={<LinkButton href="/orders">{t("orders.heading")}</LinkButton>}
          />
        ) : null}
      </AppShell>
    );
  }

  const name = displayName(order, t);
  const phone = phoneForLinks(customerPhone(order));
  const number = clean(order.order_number) || `#${order.id}`;
  const waText = encodeURIComponent(t("order.waMessage", { name, number }));
  const delivery = parseDate(order.deliver_date);
  const daysLeft = delivery ? daysBetween(new Date(), delivery) : null;

  let deliveryNote = null;
  if (daysLeft === 0) deliveryNote = t("order.dueToday");
  else if (daysLeft > 0) deliveryNote = t("order.daysLeft", { count: daysLeft });
  else if (daysLeft < 0) deliveryNote = t("order.daysAgo", { count: -daysLeft });

  return (
    <AppShell
      title={`${t("order.title")} ${number}`}
      back="/orders"
      hideTabs
      actions={
        <>
          <HeaderIconButton label={t("common.edit")} href={orderEditPath(order)}>
            <Pencil size={20} />
          </HeaderIconButton>
          <HeaderIconButton label={t("common.delete")} onClick={() => setConfirmDelete(true)}>
            <Trash2 size={20} />
          </HeaderIconButton>
        </>
      }
    >
      <div className="mx-auto max-w-3xl space-y-4 pb-6 md:space-y-5">
        {/* Profile header, like a WhatsApp contact card */}
        <div className="flex flex-col items-center bg-card px-4 pb-5 pt-6 text-center md:rounded-2xl md:border md:border-line md:shadow-sm">
          <Avatar name={rawName(order)} seed={avatarSeed(order)} size={88} />
          <h1 className="mt-3 text-2xl font-semibold text-ink md:font-serif md:font-normal">
            {name}
          </h1>
          {clean(order.additional_info) && (
            <p className="text-[15px] text-muted">{clean(order.additional_info)}</p>
          )}
          <p className="mt-1 text-[15px] text-muted">
            {customerPhone(order) || t("order.noPhone")}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full bg-card-2 px-2.5 py-0.5 text-xs font-medium text-ink-2">
              {number}
            </span>
            <ReviewBadge needsReview={Boolean(order.needs_review)} />
          </div>

          <div className="mt-5 flex w-full max-w-md gap-2">
            <ActionButton
              icon={Phone}
              label={t("common.call")}
              href={phone ? `tel:+${phone}` : undefined}
              disabled={!phone}
            />
            <ActionButton
              icon={MessageCircle}
              label={t("common.whatsapp")}
              href={phone ? `https://wa.me/${phone}?text=${waText}` : undefined}
              disabled={!phone}
              external
            />
            <ActionButton
              icon={Pencil}
              label={t("common.edit")}
              onClick={() => router.push(orderEditPath(order))}
            />
          </div>
        </div>

        {actionError && (
          <Notice tone="error" className="mx-4 md:mx-0">
            {actionError}
          </Notice>
        )}

        {order.needs_review && (
          <div className="mx-4 flex flex-col gap-3 rounded-2xl bg-warn-soft p-4 sm:flex-row sm:items-center md:mx-0">
            <TriangleAlert size={20} className="shrink-0 text-warn-ink" />
            <p className="flex-1 text-sm text-warn-ink">{t("dash.reviewHelp")}</p>
            <div className="flex gap-2">
              <LinkButton href={orderEditPath(order)} variant="secondary" size="sm">
                {t("common.edit")}
              </LinkButton>
              <Button size="sm" onClick={markChecked} disabled={busy}>
                <CircleCheck size={16} />
                {t("order.markChecked")}
              </Button>
            </div>
          </div>
        )}

        <Section icon={Scissors} title={t("order.design")}>
          <p className="whitespace-pre-wrap py-3 text-[15.5px] leading-7 text-ink">
            {clean(order.what_to_design) || "—"}
          </p>
        </Section>

        <Section icon={CalendarDays} title={t("order.dates")}>
          <Row label={t("field.orderDate")} value={formatDate(order.order_date, locale)} />
          <Row
            label={t("field.deliverDate")}
            strong
            value={
              <>
                {formatDate(order.deliver_date, locale)}
                {deliveryNote && (
                  <span
                    className={cx(
                      "block text-xs font-normal",
                      daysLeft >= 0 && daysLeft <= 3 ? "text-accent-ink" : "text-muted"
                    )}
                  >
                    {deliveryNote}
                  </span>
                )}
              </>
            }
          />
        </Section>

        <Section icon={IndianRupee} title={t("order.payment")}>
          <PaymentSteps order={order} />
        </Section>

        <Section icon={FileText} title={t("order.other")}>
          <Row label={t("field.source")} value={clean(order.filename) || "—"} />
          <Row label={t("field.createdAt")} value={formatDate(order.created_at, locale)} />
          {order.import_notes && (
            <Row label={t("order.cleanupNote")} value={order.import_notes} />
          )}
        </Section>

        {order.customer_id && (
        <Link
          href={`/customers/${order.customer_id}`}
          className="mx-4 flex items-center justify-between rounded-2xl border border-line bg-card px-4 py-4 text-[15px] font-medium text-accent-ink transition hover:bg-card-2 md:mx-0"
        >
          {t("order.allFromCustomer")}
          <ChevronRight size={18} />
        </Link>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={t("order.deleteTitle")}
        body={t("order.deleteBody")}
        busy={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </AppShell>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={null}>
      <OrderDetailContent />
    </Suspense>
  );
}
