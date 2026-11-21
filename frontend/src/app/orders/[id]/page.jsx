"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  BriefcaseBusiness,
  CalendarDays,
  Clapperboard,
  ChevronRight,
  CircleCheck,
  FileText,
  Images,
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
import { LateChip, ProgressBar, StageChip, WorkSection } from "../../../components/Work";
import { ContentStageChip, ReelBadge } from "../../../components/Content";
import { OrderPhotos } from "../../../components/Photos";
import { sortFinishedFirst } from "../../../lib/photos";
import { isLate, isOpen } from "../../../lib/work";
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
import { useCan, useMe } from "../../../lib/roles";
import ActivityList from "../../../components/ActivityList";

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

function Section({ icon: Icon, title, children, id }) {
  return (
    <Card id={id} className="mx-4 scroll-mt-24 overflow-hidden md:mx-0">
      <h2 className="flex items-center gap-2 border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-accent-ink md:px-5">
        <Icon size={15} />
        {title}
      </h2>
      <div className="divide-y divide-line px-4 md:px-5">{children}</div>
    </Card>
  );
}

/** One key fact on the order card (delivery, trial, progress, payment). */
function Fact({ label, value, note, urgent, extra }) {
  return (
    <div className="rounded-2xl bg-card-2/70 px-3.5 py-3">
      <dt className="text-[11.5px] font-semibold text-muted">{label}</dt>
      <dd className="mt-0.5 font-display text-[17px] font-bold leading-tight text-ink">{value || "—"}</dd>
      {note && <dd className={cx("text-xs font-semibold", urgent ? "text-danger" : "text-muted")}>{note}</dd>}
      {extra}
    </div>
  );
}

/** The customer's avatar, name and phone, for the slim strip on the order card. */
function CustomerBits({ order, name, t }) {
  return (
    <>
      <Avatar name={rawName(order)} seed={avatarSeed(order)} size={40} />
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-bold text-ink">
          {name}
          {clean(order.additional_info) && (
            <span className="ml-1.5 text-sm font-medium text-muted">{clean(order.additional_info)}</span>
          )}
        </span>
        <span className="block truncate text-xs text-muted">{customerPhone(order) || t("order.noPhone")}</span>
      </span>
    </>
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
  const me = useMe();
  const canEdit = useCan("editOrders");
  const canDelete = useCan("deleteOrders");
  const seeMoney = useCan("money");
  const canAssign = useCan("team");
  const seeContent = useCan("contentView");
  const planContent = useCan("contentEdit");
  const setOkToPost = useCan("okToPost");
  const canBill = useCan("makeBills");

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
      <AppShell
      feature="orders" title={t("order.title")} back="/orders" hideTabs>
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

  const cover = sortFinishedFirst(order.photos)[0] || null;

  let deliveryNote = null;
  if (daysLeft === 0) deliveryNote = t("order.dueToday");
  else if (daysLeft > 0) deliveryNote = t("order.daysLeft", { count: daysLeft });
  else if (daysLeft < 0) deliveryNote = t("order.daysAgo", { count: -daysLeft });

  return (
    <AppShell
      feature="orders"
      title={`${t("order.title")} ${number}`}
      back="/orders"
      hideTabs
      actions={
        <>
          {canEdit && (
            <HeaderIconButton label={t("common.edit")} href={orderEditPath(order)}>
              <Pencil size={20} />
            </HeaderIconButton>
          )}
          {canDelete && (
            <HeaderIconButton label={t("common.delete")} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={20} />
            </HeaderIconButton>
          )}
        </>
      }
    >
      <div className="mx-auto max-w-3xl space-y-4 pb-6 md:space-y-5">
        {/* The order itself first: number, stage, what to make, when it's due. */}
        <section className="mx-4 overflow-hidden rounded-[2rem] bg-card shadow-sm ring-1 ring-white md:mx-0">
          {cover && (
            <a href="#photos" className="block bg-card-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.url || cover.thumb_url}
                alt={t(`photo.kind.${cover.kind}`)}
                className="aspect-[16/9] w-full object-cover md:aspect-[21/9]"
              />
            </a>
          )}
          <div className="p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="mr-1 font-display text-[2.1rem] font-bold leading-none text-ink">
                {clean(order.order_number) ? `#${clean(order.order_number)}` : number}
              </h1>
              <StageChip status={order.status} step={order.current_step} />
              {isLate(order) && <LateChip />}
              <ReviewBadge needsReview={Boolean(order.needs_review)} compact />
            </div>

            <p className="mt-5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-accent-ink">
              <Scissors size={14} />
              {t("order.design")}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-[17px] leading-7 text-ink">
              {clean(order.what_to_design) || "—"}
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <Fact
                label={t("field.deliverDate")}
                value={formatDate(order.deliver_date, locale)}
                note={deliveryNote}
                urgent={daysLeft !== null && daysLeft <= 3 && isOpen(order)}
              />
              {order.trial_date && <Fact label={t("cal.trial")} value={formatDate(order.trial_date, locale)} />}
              {(order.tasks || []).length > 0 && (
                <Fact
                  label={t("work.title")}
                  value={t("order.progress", { value: order.progress ?? 0 })}
                  extra={<ProgressBar value={order.progress ?? 0} className="mt-2" />}
                />
              )}
              {seeMoney && <Fact label={t("order.payment")} value={t(`pay.state.${order.payment_state || "none"}`)} />}
              <Fact label={t("field.orderDate")} value={formatDate(order.order_date, locale)} />
            </dl>
          </div>

          {/* Who it's for: a slim strip (tap for the customer's page) */}
          <div className="flex items-center gap-3 border-t border-line bg-card-2/60 px-4 py-3 md:px-6">
            {order.customer_id && canEdit ? (
              <Link href={`/customers/${order.customer_id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <CustomerBits order={order} name={name} t={t} />
              </Link>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <CustomerBits order={order} name={name} t={t} />
              </div>
            )}
            <a
              href={phone ? `tel:+${phone}` : undefined}
              aria-label={t("common.call")}
              aria-disabled={!phone}
              className={cx(
                "press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-accent-ink shadow-sm ring-1 ring-line",
                !phone && "pointer-events-none opacity-40"
              )}
            >
              <Phone size={18} />
            </a>
            <a
              href={phone ? `https://wa.me/${phone}?text=${waText}` : undefined}
              target="_blank"
              rel="noreferrer"
              aria-label={t("common.whatsapp")}
              aria-disabled={!phone}
              className={cx(
                "press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-accent-ink shadow-sm ring-1 ring-line",
                !phone && "pointer-events-none opacity-40"
              )}
            >
              <MessageCircle size={18} />
            </a>
          </div>
        </section>

        {actionError && (
          <Notice tone="error" className="mx-4 md:mx-0">
            {actionError}
          </Notice>
        )}

        {Number(searchParams.get("photosFailed")) > 0 && (
          <Notice tone="warn" className="mx-4 md:mx-0">
            {t("photo.someFailed", { count: Number(searchParams.get("photosFailed")) })}
          </Notice>
        )}

        {order.needs_review && canEdit && (
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

        {((order.photos || []).length > 0 || canEdit) && (
          <Section icon={Images} title={t("photo.section")} id="photos">
            <OrderPhotos order={order} canEdit={canEdit} />
          </Section>
        )}

        <Section icon={BriefcaseBusiness} title={t("work.title")}>
          <WorkSection order={order} canEdit={canEdit} canAssign={canAssign} canBill={canBill} />
        </Section>

        {seeContent && (
          <Section icon={Clapperboard} title={t("content.section")}>
            <div className="space-y-3 py-3">
              {setOkToPost ? (
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <span>
                    <span className="block text-[15px] font-medium text-ink">{t("content.okToPost")}</span>
                    <span className="block text-xs text-muted">{t("content.okToPostHelp")}</span>
                  </span>
                  <span className="relative inline-flex shrink-0">
                    <input
                      type="checkbox"
                      checked={Boolean(order.ok_to_post)}
                      onChange={(event) => updateOrder(order.id, { ok_to_post: event.target.checked }).catch(() => {})}
                      className="peer sr-only"
                    />
                    <span className="h-7 w-12 rounded-full bg-line transition peer-checked:bg-accent" />
                    <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                  </span>
                </label>
              ) : (
                <p className="text-sm text-ink-2">
                  {t("content.okToPost")}: {order.ok_to_post ? t("common.yes") : t("common.no")}
                </p>
              )}
              {(order.content || []).length === 0 ? (
                <p className="text-sm text-muted">{t("content.noPost")}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {order.content.map((item) => (
                    <li key={item.id}>
                      <Link href={`/content/${item.id}`} className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0 truncate text-[15px] text-ink">{item.title}</span>
                        <ContentStageChip status={item.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {planContent && (
                <Link
                  href={`/content/new?order=${order.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm font-medium text-ink-2 hover:bg-card-2"
                >
                  <Clapperboard size={15} />
                  {t("content.planPost")}
                </Link>
              )}
            </div>
          </Section>
        )}

        {seeMoney && (
          <Section icon={IndianRupee} title={t("order.payment")}>
            <PaymentSteps order={order} />
          </Section>
        )}

        <Section icon={FileText} title={t("order.other")}>
          <Row label={t("field.source")} value={clean(order.filename) || "—"} />
          <Row label={t("field.createdAt")} value={formatDate(order.created_at, locale)} />
          {order.import_notes && (
            <Row label={t("order.cleanupNote")} value={order.import_notes} />
          )}
        </Section>

        {canEdit && (
          <Card className="mx-4 overflow-hidden md:mx-0">
            <h2 className="border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-accent-ink md:px-5">
              {t("activity.history")}
            </h2>
            <ActivityList
              // Reload the history whenever the order or its work changes.
              key={`${order.status}-${(order.tasks || []).map((task) => task.status).join(",")}-${order.deliver_date}`}
              entity="order"
              entityId={order.id}
              meId={me?.id}
              pageSize={10}
            />
          </Card>
        )}

        {order.customer_id && canEdit && (
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
