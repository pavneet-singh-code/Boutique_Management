"use client";

import { X, UserRound, CalendarDays, FileText } from "lucide-react";

function Field({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#eee6dc] bg-[#fcf9f4] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9b8b79]">
        {label}
      </p>
      <p className="mt-1.5 wrap-break-word text-sm text-[#493d31]">
        {value == null || value === "" ? "—" : String(value)}
      </p>
    </div>
  );
}

export default function OrderDetailsModal({ order, onClose }) {
  if (!order) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-[#211b15]/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-details-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#e8dfd3] bg-[#fffdf9] shadow-2xl"
      >
        <header className="sticky top-0 flex items-start justify-between gap-4 border-b border-[#eee6dc] bg-[#fffdf9] px-5 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9a846b]">
              Order details
            </p>
            <h2
              id="order-details-title"
              className="mt-1 font-serif text-2xl text-[#352c24]"
            >
              {order.order_number || `Order #${order.id}`}
            </h2>
            <p className="mt-1 text-sm text-[#8f8070]">
              Saved order record
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close order details"
            className="rounded-xl p-2 text-[#867665] transition hover:bg-[#f1e9df]"
          >
            <X size={20} />
          </button>
        </header>

        <div className="space-y-6 p-5">
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#5a4938]">
              <UserRound size={16} />
              Customer information
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Customer name" value={order.customer_name} />
              <Field label="Contact number" value={order.contact_number} />
              <Field label="Additional information" value={order.additional_info} />
              <Field label="Order number" value={order.order_number} />
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#5a4938]">
              <CalendarDays size={16} />
              Dates
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Order date" value={order.order_date} />
              <Field label="Delivery date" value={order.deliver_date} />
            </div>
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#5a4938]">
              <FileText size={16} />
              Design and payment
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="What to design" value={order.what_to_design} />
              <Field label="Total amount" value={order.total_amount} />
              <Field label="Advance payment" value={order.advance_payment} />
              <Field
                label="Review status"
                value={order.needs_review ? "Needs review" : "No review needed"}
              />
              <div className="sm:col-span-2">
                <Field label="Source file" value={order.filename} />
              </div>
            </div>
          </section>
        </div>

        <footer className="flex justify-end border-t border-[#eee6dc] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#796756] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#665442]"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}