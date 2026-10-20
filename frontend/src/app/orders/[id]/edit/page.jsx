
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Trash2,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import DashboardShell from "../../../../components/DashboardShell";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

const EMPTY_ORDER = {
  order_number: "",
  customer_name: "",
  additional_info: "",
  order_date: "",
  deliver_date: "",
  contact_number: "",
  what_to_design: "",
  advance_payment: "",
  total_amount: "",
  needs_review: false,
};

function formatDateForInput(value) {
  if (!value) return "";

  const text = String(value).trim();

  // Already YYYY-MM-DD
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const indian = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (indian) {
    let year = Number(indian[3]);

    if (indian[3].length === 2) {
      year += year <= 49 ? 2000 : 1900;
    }

    const day = Number(indian[1]);
    const month = Number(indian[2]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // Fallback for other date formats.
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getErrorMessage(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) {
    return data.detail.map((item) => item.msg || "Invalid value").join(", ");
  }
  if (typeof data?.message === "string") return data.message;
  return fallback;
}

export default function EditOrderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = params?.id;
  const returnTo = searchParams.get("returnTo") || "/orders";

  const [form, setForm] = useState(EMPTY_ORDER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const getToken = useCallback(() => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("fab_art_token");
  }, []);

  const request = useCallback(
    async (path, options = {}) => {
      const token = getToken();

      if (!token) {
        router.replace("/login");
        throw new Error("Your session has expired. Please log in again.");
      }

      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...options.headers,
        },
      });

      if (response.status === 401) {
        sessionStorage.removeItem("fab_art_token");
        router.replace("/login");
        throw new Error("Your session has expired. Please log in again.");
      }

      const text = await response.text();
      let data = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { detail: text };
        }
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, `Request failed (${response.status})`)
        );
      }

      return data;
    },
    [getToken, router]
  );

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    async function loadOrder() {
      setLoading(true);
      setError("");

      try {
        const data = await request(`/orders/${orderId}`);
        const order = data?.order ?? data?.data ?? data;

        if (!order || typeof order !== "object") {
          throw new Error("The server returned an invalid order.");
        }

        if (cancelled) return;

        setForm({
          ...EMPTY_ORDER,
          ...order,
          order_number: order.order_number ?? "",
          customer_name: order.customer_name ?? "",
          additional_info: order.additional_info ?? "",
          order_date: formatDateForInput(order.order_date),
          deliver_date: formatDateForInput(order.deliver_date),
          contact_number: order.contact_number ?? "",
          what_to_design: order.what_to_design ?? "",
          advance_payment: order.advance_payment ?? "",
          total_amount: order.total_amount ?? "",
          needs_review: Boolean(order.needs_review),
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load this order.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId, request]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
    setSuccess("");
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        order_number: form.order_number || null,
        customer_name: form.customer_name.trim(),
        additional_info: form.additional_info || null,
        order_date: form.order_date || null,
        deliver_date: form.deliver_date || null,
        contact_number: form.contact_number || null,
        what_to_design: form.what_to_design || null,
        advance_payment: form.advance_payment ?? "",
        total_amount: form.total_amount ?? "",
        needs_review: Boolean(form.needs_review),
      };

      await request(`/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      router.push(returnTo);
    } catch (err) {
      setError(err.message || "Could not save the order.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");

    try {
      await request(`/orders/${orderId}`, {
        method: "DELETE",
      });

      router.replace("/orders");
    } catch (err) {
      setError(err.message || "Could not delete the order.");
      setShowDeleteConfirmation(false);
    } finally {
      setDeleting(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-[#e5dbce] bg-[#fffdf9] px-4 py-3 text-sm text-[#352c24] outline-none transition placeholder:text-[#b1a394] focus:border-[#9c8062] focus:ring-2 focus:ring-[#9c8062]/10";

  const labelClass = "text-sm font-medium text-[#574839]";

  return (
    <DashboardShell>
      <div className="min-h-full bg-[#f5f1ea] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <button
            type="button"
            onClick={() => router.push("/orders")}
            className="mb-5 inline-flex items-center gap-2 text-sm text-[#796756] transition hover:text-[#352c24]"
          >
            <ArrowLeft size={17} />
            Back to orders
          </button>

          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a18a70]">
                Order management
              </p>
              <h1 className="mt-2 font-serif text-3xl text-[#352c24] sm:text-4xl">
                Edit order
              </h1>
              <p className="mt-2 text-sm text-[#8c7b69]">
                Update order information and payment details.
              </p>
            </div>

            {!loading && !error && (
              <div className="w-fit rounded-xl border border-[#e8dfd3] bg-[#fffdf9] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#a18a70]">
                  Order reference
                </p>
                <p className="mt-1 font-medium text-[#493d31]">
                  {form.order_number || `#${orderId}`}
                </p>
              </div>
            )}
          </div>

          {/* Loading */}
          {loading ? (
            <div className="flex min-h-72 items-center justify-center rounded-2xl border border-[#e8dfd3] bg-[#fffdf9]">
              <div className="flex items-center gap-3 text-sm text-[#796756]">
                <LoaderCircle className="animate-spin" size={20} />
                Loading order details...
              </div>
            </div>
          ) : (
            <>
              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-3 rounded-xl border border-[#e9c8b8] bg-[#fff3ed] p-4 text-sm text-[#914d32]"
                >
                  <AlertCircle className="mt-0.5 shrink-0" size={18} />
                  <p>{error}</p>
                </div>
              )}

              {/* Success */}
              {success && (
                <div
                  role="status"
                  className="mb-5 flex items-center gap-3 rounded-xl border border-[#d6e2ce] bg-[#f1f6ed] p-4 text-sm text-[#536b48]"
                >
                  <CheckCircle2 size={18} />
                  {success}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-6">
                {/* Customer information */}
                <section className="rounded-2xl border border-[#e8dfd3] bg-[#fffdf9] p-5 shadow-sm sm:p-7">
                  <div className="mb-6 border-b border-[#eee6dc] pb-4">
                    <h2 className="font-serif text-xl text-[#493d31]">
                      Customer information
                    </h2>
                    <p className="mt-1 text-xs text-[#9a8978]">
                      The customer's identity and contact details.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className={labelClass}>
                      Order number
                      <input
                        name="order_number"
                        value={form.order_number}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="e.g. ORD-001"
                      />
                    </label>

                    <label className={labelClass}>
                      Customer name *
                      <input
                        name="customer_name"
                        value={form.customer_name}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Enter customer name"
                        required
                      />
                    </label>

                    <label className={labelClass}>
                      Contact number
                      <input
                        name="contact_number"
                        type="tel"
                        value={form.contact_number}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Enter phone number"
                      />
                    </label>

                    <label className={labelClass}>
                      Additional information
                      <input
                        name="additional_info"
                        value={form.additional_info}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="Optional notes"
                      />
                    </label>
                  </div>
                </section>

                {/* Order details */}
                <section className="rounded-2xl border border-[#e8dfd3] bg-[#fffdf9] p-5 shadow-sm sm:p-7">
                  <div className="mb-6 border-b border-[#eee6dc] pb-4">
                    <h2 className="font-serif text-xl text-[#493d31]">
                      Order details
                    </h2>
                    <p className="mt-1 text-xs text-[#9a8978]">
                      Design requirements and delivery schedule.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className={labelClass}>
                      Order date
                      <input
                        type="date"
                        name="order_date"
                        value={form.order_date}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </label>

                    <label className={labelClass}>
                      Delivery date
                      <input
                        type="date"
                        name="deliver_date"
                        value={form.deliver_date}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </label>

                    <label className={`${labelClass} sm:col-span-2`}>
                      What to design
                      <textarea
                        name="what_to_design"
                        value={form.what_to_design}
                        onChange={handleChange}
                        rows={4}
                        className={`${inputClass} resize-y`}
                        placeholder="Describe the garment, design, measurements, or requirements..."
                      />
                    </label>
                  </div>
                </section>

                {/* Payment information */}
                <section className="rounded-2xl border border-[#e8dfd3] bg-[#fffdf9] p-5 shadow-sm sm:p-7">
                  <div className="mb-6 border-b border-[#eee6dc] pb-4">
                    <h2 className="font-serif text-xl text-[#493d31]">
                      Payment information
                    </h2>
                    <p className="mt-1 text-xs text-[#9a8978]">
                      Update the order value and advance payment.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className={labelClass}>
                      Total amount (₹)
                      <input
                        name="total_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.total_amount}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="0"
                      />
                    </label>

                    <label className={labelClass}>
                      Advance payment (₹)
                      <input
                        name="advance_payment"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.advance_payment}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="0"
                      />
                    </label>

                    <div className="rounded-xl bg-[#f6f0e7] p-4 sm:col-span-2">
                      <p className="text-xs text-[#8c7b69]">
                        Remaining balance
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-[#493d31]">
                        ₹
                        {(
                          (Number(form.total_amount) || 0) -
                          (Number(form.advance_payment) || 0)
                        ).toLocaleString("en-IN", {
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Review status */}
                <section className="rounded-2xl border border-[#e8dfd3] bg-[#fffdf9] p-5 shadow-sm sm:p-7">
                  <h2 className="font-serif text-xl text-[#493d31]">
                    Review status
                  </h2>

                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[#eee6dc] p-4">
                    <input
                      type="checkbox"
                      name="needs_review"
                      checked={form.needs_review}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 accent-[#80664c]"
                    />
                    <span>
                      <span className="block text-sm font-medium text-[#574839]">
                        This order needs review
                      </span>
                      <span className="mt-1 block text-xs text-[#9a8978]">
                        Flag this order so it can be checked later.
                      </span>
                    </span>
                  </label>
                </section>

                {/* Actions */}
                <div className="flex flex-col-reverse gap-3 pb-8 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirmation(true)}
                    disabled={saving || deleting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#e7c8bd] px-5 py-3 text-sm font-medium text-[#a24f3d] transition hover:bg-[#fff0eb] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    Delete order
                  </button>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => router.push("/orders")}
                      disabled={saving || deleting}
                      className="rounded-xl border border-[#e7ded2] px-5 py-3 text-sm font-medium text-[#725b43] transition hover:bg-[#f3ece2] disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={saving || deleting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#79634b] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#604d39] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? (
                        <LoaderCircle className="animate-spin" size={17} />
                      ) : (
                        <Save size={17} />
                      )}
                      {saving ? "Saving changes..." : "Save changes"}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setShowDeleteConfirmation(false);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-order-title"
            className="w-full max-w-md rounded-2xl border border-[#e8dfd3] bg-[#fffdf9] p-6 shadow-xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff0eb] text-[#a24f3d]">
              <Trash2 size={22} />
            </div>

            <h2
              id="delete-order-title"
              className="mt-4 font-serif text-2xl text-[#352c24]"
            >
              Delete this order?
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#8c7b69]">
              This will permanently delete order{" "}
              <strong className="text-[#493d31]">
                {form.order_number || `#${orderId}`}
              </strong>
              . This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteConfirmation(false)}
                className="rounded-xl border border-[#e7ded2] px-4 py-2.5 text-sm text-[#725b43] hover:bg-[#f3ece2] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-xl bg-[#a24f3d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#873f30] disabled:opacity-60"
              >
                {deleting && (
                  <LoaderCircle className="animate-spin" size={16} />
                )}
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
