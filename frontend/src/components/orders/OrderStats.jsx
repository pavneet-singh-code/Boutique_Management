import { ShoppingBag, IndianRupee, Wallet, Clock3 } from "lucide-react";

function amount(value) {
  if (value == null || value === "") return 0;
  const parsed = Number(String(value).replace(/[₹,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OrderStats({ orders }) {
  const totalValue = orders.reduce(
    (sum, order) => sum + amount(order.total_amount),
    0
  );

  const advanceCollected = orders.reduce(
    (sum, order) => sum + amount(order.advance_payment),
    0
  );

  const balance = Math.max(0, totalValue - advanceCollected);

  const stats = [
    {
      label: "Total orders",
      value: orders.length.toLocaleString("en-IN"),
      note: "Orders in selected period",
      icon: ShoppingBag,
    },
    {
      label: "Order value",
      value: formatCurrency(totalValue),
      note: "Combined order totals",
      icon: IndianRupee,
    },
    {
      label: "Advance collected",
      value: formatCurrency(advanceCollected),
      note: "Recorded advance payments",
      icon: Wallet,
    },
    {
      label: "Balance remaining",
      value: formatCurrency(balance),
      note: "Total minus recorded advances",
      icon: Clock3,
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, note, icon: Icon }) => (
        <article
          key={label}
          className="rounded-2xl border border-[#e8dfd3] bg-[#fffdf9] p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[#817466]">{label}</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-[#352c24]">
                {value}
              </p>
            </div>

            <div className="rounded-xl bg-[#f0e7db] p-3 text-[#80664b]">
              <Icon size={20} strokeWidth={1.7} />
            </div>
          </div>

          <p className="mt-3 text-xs text-[#9a8c7d]">{note}</p>
        </article>
      ))}
    </section>
  );
}