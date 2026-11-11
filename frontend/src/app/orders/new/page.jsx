"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "../../../components/AppShell";
import OrderForm, { toFormValues, toPayload } from "../../../components/OrderForm";
import { Notice, PageHeading } from "../../../components/ui";
import { saveOrders } from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import { clean, toISODate } from "../../../lib/orders";
import SaveBar from "../../../components/SaveBar";

function NewOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, tError } = useI18n();

  const [form, setForm] = useState(() => ({
    ...toFormValues({}),
    customer_name: searchParams.get("customer") || "",
    contact_number: searchParams.get("phone") || "",
    order_date: toISODate(new Date()),
  }));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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
    try {
      const [saved] = await saveOrders([{ ...toPayload(form), filename: null }]);
      router.replace(`/orders/${saved.id}`);
    } catch (err) {
      setSaveError(tError(err));
      setSaving(false);
    }
  };

  return (
    <AppShell title={t("new.title")} subtitle={t("new.subtitle")} back hideTabs>
      <div className="mx-auto max-w-3xl">
        <PageHeading
          eyebrow={t("nav.ordersSection")}
          title={t("new.title")}
          subtitle={t("new.subtitle")}
        />
        <form id="new-order-form" onSubmit={onSubmit} className="px-4 pt-4 md:px-0 md:pt-0">
          {saveError && (
            <Notice tone="error" className="mb-4">
              {saveError}
            </Notice>
          )}
          <OrderForm value={form} onChange={onChange} />
          <SaveBar saving={saving} form="new-order-form" />
        </form>
      </div>
    </AppShell>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense fallback={null}>
      <NewOrderContent />
    </Suspense>
  );
}
