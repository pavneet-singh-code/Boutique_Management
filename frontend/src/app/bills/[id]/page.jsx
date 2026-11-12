"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  CircleCheck,
  Image as ImageIcon,
  MessageCircle,
  Pencil,
  Printer,
  RotateCcw,
  Trash2,
} from "lucide-react";
import AppShell, { HeaderIconButton } from "../../../components/AppShell";
import { BillDocument, BillEditor } from "../../../components/Bills";
import {
  Button,
  ConfirmDialog,
  ErrorBox,
  Notice,
  PageHeading,
  Spinner,
} from "../../../components/ui";
import {
  deleteBill,
  getAppSettings,
  getBill,
  markBillPaid,
  markBillSent,
  markBillUnpaid,
} from "../../../lib/api";
import { billMessage, shareBillImage, whatsappLink } from "../../../lib/bill";
import { useI18n } from "../../../lib/i18n";
import { toISODate } from "../../../lib/orders";
import { useResource } from "../../../lib/useResource";
import { useCan } from "../../../lib/roles";

export default function BillPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, locale, tError } = useI18n();

  const billLoader = useCallback(() => getBill(id), [id]);
  const settingsLoader = useCallback(() => getAppSettings(), []);
  const { data: bill, setData: setBill, error, reload } = useResource(billLoader);
  const { data: settings } = useResource(settingsLoader);

  const [editing, setEditing] = useState(false);
  const canBill = useCan("makeBills");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirm, setConfirm] = useState(null); // "paid" | "delete"
  const [paidOn, setPaidOn] = useState(toISODate(new Date()));

  const run = async (action) => {
    setBusy(true);
    setActionError("");
    try {
      const result = await action();
      if (result && result.bill_number) setBill(result);
      return result;
    } catch (err) {
      setActionError(tError(err));
      return null;
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const markSentIfDraft = () => {
    if (canBill && bill?.status === "draft") run(() => markBillSent(bill.id));
  };

  const shareImage = async () => {
    setBusy(true);
    try {
      await shareBillImage(bill, settings || {}, t, locale);
      markSentIfDraft();
    } catch (err) {
      setActionError(tError(err));
    } finally {
      setBusy(false);
    }
  };

  const sendText = () => {
    const link = whatsappLink(bill.customer.phone, billMessage(bill, settings || {}, t, locale));
    window.open(link, "_blank", "noopener");
    markSentIfDraft();
  };

  const remove = async () => {
    const ok = await run(() => deleteBill(bill.id));
    if (ok) router.replace("/bills");
  };

  if (!bill) {
    return (
      <AppShell
      feature="bills" title={t("bills.title")} back="/bills" hideTabs>
        <ErrorBox error={error} onRetry={reload} className="mt-4" />
        {!error && <Spinner />}
      </AppShell>
    );
  }

  const paid = bill.status === "paid";

  return (
    <AppShell
      feature="bills"
      title={bill.bill_number}
      subtitle={bill.customer.name}
      back="/bills"
      hideTabs
      mobileTitle={
        <Link href={`/customers/${bill.customer.id}`} className="block min-w-0">
          <span className="block truncate text-[17px] font-semibold leading-tight text-ink">
            {bill.bill_number}
          </span>
          <span className="block truncate text-xs text-accent-ink">{bill.customer.name} →</span>
        </Link>
      }
      actions={
        canBill && !paid && !editing ? (
          <>
            <HeaderIconButton label={t("bills.edit")} onClick={() => setEditing(true)}>
              <Pencil size={20} />
            </HeaderIconButton>
            <HeaderIconButton label={t("bills.delete")} onClick={() => setConfirm("delete")}>
              <Trash2 size={20} />
            </HeaderIconButton>
          </>
        ) : null
      }
    >
      <div className="mx-auto max-w-2xl space-y-4 px-4 pb-6 pt-4 md:px-0 md:pt-0">
        <PageHeading
          eyebrow={t("bills.title")}
          title={bill.bill_number}
          subtitle={
            <Link href={`/customers/${bill.customer.id}`} className="text-accent-ink">
              {bill.customer.name} →
            </Link>
          }
        />

        {actionError && <Notice tone="error">{actionError}</Notice>}

        {editing ? (
          <BillEditor
            customerId={bill.customer.id}
            bill={bill}
            onSaved={(saved) => {
              setBill(saved);
              setEditing(false);
            }}
          />
        ) : (
          <>
            <BillDocument bill={bill} settings={settings || {}} />

            <div className="grid grid-cols-3 gap-2 print:hidden">
              <Button variant="secondary" onClick={shareImage} disabled={busy} className="!h-auto flex-col !rounded-2xl py-3 text-[13px]">
                <ImageIcon size={20} />
                {t("bills.shareImage")}
              </Button>
              <Button variant="secondary" onClick={sendText} disabled={busy} className="!h-auto flex-col !rounded-2xl py-3 text-[13px]">
                <MessageCircle size={20} />
                {t("bills.whatsapp")}
              </Button>
              <Button variant="secondary" onClick={() => window.print()} className="!h-auto flex-col !rounded-2xl py-3 text-[13px]">
                <Printer size={20} />
                {t("bills.print")}
              </Button>
            </div>

            <div className="print:hidden">
              {paid ? (
                <Button variant="secondary" size="lg" className="w-full" onClick={() => run(() => markBillUnpaid(bill.id))} disabled={busy}>
                  <RotateCcw size={18} />
                  {t("bills.markUnpaid")}
                </Button>
              ) : (
                <Button size="lg" className="w-full" onClick={() => setConfirm("paid")} disabled={busy}>
                  <CircleCheck size={18} />
                  {t("bills.markPaid")}
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirm === "paid"}
        tone="primary"
        title={t("bills.paidTitle", { number: bill.bill_number })}
        body={t("bills.paidBody")}
        confirmLabel={t("bills.markPaid")}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => run(() => markBillPaid(bill.id, paidOn))}
      >
        <label className="block">
          <span className="text-[13px] font-medium text-ink-2">{t("bills.paidDate")}</span>
          <input
            type="date"
            value={paidOn}
            onChange={(event) => setPaidOn(event.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-line bg-card px-3 text-[16px] outline-none focus:border-accent"
          />
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirm === "delete"}
        title={t("bills.deleteTitle", { number: bill.bill_number })}
        body={t("bills.deleteBody")}
        confirmLabel={t("bills.delete")}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={remove}
      />
    </AppShell>
  );
}
