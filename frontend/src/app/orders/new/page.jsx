"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "../../../components/AppShell";
import OrderForm, { toFormValues, toPayload } from "../../../components/OrderForm";
import { LinkButton, Notice, PageHeading } from "../../../components/ui";
import { getCachedOrders, getOrders, orderPath, saveOrders } from "../../../lib/api";
import { showToast } from "../../../lib/toast";
import { useI18n } from "../../../lib/i18n";
import { clean, displayName, duplicateMessage, findOrderByNumber, toISODate } from "../../../lib/orders";
import SaveBar from "../../../components/SaveBar";
import { PendingPhotos, uploadPendingPhotos } from "../../../components/Photos";

function NewOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, tError, locale } = useI18n();

  const [form, setForm] = useState(() => ({
    ...toFormValues({}),
    customer_name: searchParams.get("customer") || "",
    customer_id: Number(searchParams.get("customerId")) || null,
    contact_number: searchParams.get("phone") || "",
    order_date: toISODate(new Date()),
  }));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [duplicateOf, setDuplicateOf] = useState(null); // the saved order that already has this number
  const [photos, setPhotos] = useState([]); // waiting until the order is saved
  const [photoProgress, setPhotoProgress] = useState(null);

  const onChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setSaveError("");
    setDuplicateOf(null);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!clean(form.customer_name)) {
      setSaveError(t("new.needName"));
      return;
    }
    if (!clean(form.order_number)) {
      setSaveError(t("number.required"));
      return;
    }
    // Stop before saving if this order number is already used, and say by which order.
    const known = getCachedOrders() || (await getOrders().catch(() => []));
    const existing = findOrderByNumber(known, form.order_number);
    if (existing) {
      setSaveError(duplicateMessage(form.order_number, known, t, locale));
      setDuplicateOf(existing);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSaving(true);
    let saved;
    try {
      [saved] = await saveOrders([{ ...toPayload(form), filename: null }]);
    } catch (err) {
      if (err.code === "duplicate_order_numbers") {
        // Saved from another phone a moment ago: explain the same way.
        const fresh = await getOrders({ force: true }).catch(() => known);
        setSaveError(duplicateMessage(form.order_number, fresh, t, locale));
        setDuplicateOf(findOrderByNumber(fresh, form.order_number));
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setSaveError(tError(err));
      }
      setSaving(false);
      return;
    }
    showToast({
      title: t("toast.orderAdded", { number: clean(saved.order_number) || saved.id }),
      body: t("toast.orderAddedBody", { name: displayName(saved, t) }),
    });
    // The order is saved; now its photos (a failed photo never loses the order).
    let failed = 0;
    if (photos.length) {
      failed = await uploadPendingPhotos(saved.id, photos, (done, total) => setPhotoProgress({ done, total }));
    }
    const path = orderPath(saved);
    router.replace(failed ? `${path}${path.includes("?") ? "&" : "?"}photosFailed=${failed}` : path);
  };

  return (
    <AppShell
      feature="editOrders" title={t("new.title")} subtitle={t("new.subtitle")} back hideTabs>
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
              {duplicateOf && (
                <LinkButton href={orderPath(duplicateOf)} variant="secondary" size="sm" className="mt-2">
                  {t("number.openExisting", { number: clean(duplicateOf.order_number) })}
                </LinkButton>
              )}
            </Notice>
          )}
          <OrderForm value={form} onChange={onChange} />
          <div className="mt-4">
            <PendingPhotos photos={photos} onChange={setPhotos} />
          </div>
          {photoProgress && (
            <Notice tone="success" className="mt-4">
              {t("photo.uploading", photoProgress)}
            </Notice>
          )}
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
