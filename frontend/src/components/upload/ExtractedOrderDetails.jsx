"use client";

export default function ExtractedOrderDetails({
  order,
  currentPage,
  onChange,
}) {
  if (!order) return null;

  return (
    <div className="mt-6 bg-white rounded-2xl border border-[#e1dbd1] p-7">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#77736c]">
            Page {currentPage + 1}
          </p>

          <h3 className="text-xl font-medium mt-2">
            Extracted Order Details
          </h3>
        </div>

      </div>

      {/* Editable Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <EditableField
          label="Order Number"
          value={order.order_number}
          onChange={(value) => onChange("order_number", value)}
        />

        <EditableField
          label="Customer Name"
          value={order.customer_name}
          onChange={(value) => onChange("customer_name", value)}
        />

        <EditableField
          label="Additional Info"
          value={order.additional_info}
          onChange={(value) => onChange("additional_info", value)}
        />

        <EditableField
          label="Order Date"
          value={order.order_date}
          onChange={(value) => onChange("order_date", value)}
        />

        <EditableField
          label="Deliver Date"
          value={order.deliver_date}
          onChange={(value) => onChange("deliver_date", value)}
        />

        <EditableField
          label="Contact Number"
          value={order.contact_number}
          onChange={(value) => onChange("contact_number", value)}
        />

        <EditableField
          label="What To Design"
          value={order.what_to_design}
          onChange={(value) => onChange("what_to_design", value)}
          fullWidth
        />

        <EditableField
          label="Advance Payment"
          value={order.advance_payment}
          onChange={(value) => onChange("advance_payment", value)}
        />

        <EditableField
          label="Total Amount"
          value={order.total_amount}
          onChange={(value) => onChange("total_amount", value)}
        />

        {/* Needs Review */}
        <div>
          <label className="block text-xs uppercase tracking-[0.12em] text-[#99938a] mb-2">
            Needs Review
          </label>

          <select
            value={order.needs_review ? "true" : "false"}
            onChange={(event) =>
              onChange(
                "needs_review",
                event.target.value === "true"
              )
            }
            className="w-full h-11 rounded-lg border border-[#ddd6cc] bg-[#faf8f4] px-3 text-sm outline-none transition focus:border-[#1c1c1a] focus:bg-white"
          >
            <option value="false">
              No
            </option>

            <option value="true">
              Yes
            </option>
          </select>
        </div>

      </div>
    </div>
  );
}

function EditableField({
  label,
  value,
  onChange,
  fullWidth = false,
}) {
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <label className="block text-xs uppercase tracking-[0.12em] text-[#99938a] mb-2">
        {label}
      </label>

      <input
        type="text"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full h-11 rounded-lg border border-[#ddd6cc] bg-[#faf8f4] px-3 text-sm outline-none transition focus:border-[#1c1c1a] focus:bg-white"
      />
    </div>
  );
}