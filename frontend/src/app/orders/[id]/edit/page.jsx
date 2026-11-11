"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import AppShell from "../../../../components/AppShell";
import OrderForm, { toFormValues, toPayload } from "../../../../components/OrderForm";
import SaveBar from "../../../../components/SaveBar";
import {
  EmptyState,
  ErrorBox,
  Notice,
  PageHeading,
  Spinner,
} from "../../../../components/ui";
import { updateOrder } from "../../../../lib/api";
import { useI18n } from "../../../../lib/i18n";
import { clean } from "../../../../lib/orders";
import { useOrders } from "../../../../lib/useOrders";

export default function EditOrderPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, tError } = useI18n();
  const { orders, ready, error, reload } = useOrders();
  const order = orders.find((item) => String(item.id) === String(id));

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Fill the form once the order has loaded.
  if (order && form === null) setForm(toFormValues(order));

  const onChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setSaveError("");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!clean(form.customer_name)) {
      setSaveError(t("new.needName"));
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      await updateOrder(id, toPayload(form));
      router.replace(`/orders/${id}`);
    } catch (err) {
      setSaveError(tError(err));
      setSaving(false);
    }
  };

  const number = clean(order?.order_number);

  return (
    <AppShell
      title={t("edit.title")}
      subtitle={t("edit.subtitle")}
      back={`/orders/${id}`}
      hideTabs
    >
      <div className="mx-auto max-w-3xl">
        <PageHeading
          eyebrow={number ? `${t("field.orderNumber")} ${number}` : t("nav.ordersSection")}
          title={t("edit.title")}
          subtitle={t("edit.subtitle")}
        />
        <ErrorBox error={error} onRetry={() => reload()} className="mt-4" />

        {!form ? (
          !ready && !error ? (
            <Spinner />
          ) : ready ? (
            <EmptyState icon={FileText} title={t("order.notFound")} />
          ) : null
        ) : (
          <form id="order-form" onSubmit={onSubmit} className="px-4 pt-4 md:px-0 md:pt-0">
            {saveError && (
              <Notice tone="error" className="mb-4">
                {saveError}
              </Notice>
            )}
            <OrderForm value={form} onChange={onChange} original={order} />
            <SaveBar saving={saving} form="order-form" />
          </form>
        )}
      </div>
    </AppShell>
  );
}
