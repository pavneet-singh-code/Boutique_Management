"use client";

import { Trash2 } from "lucide-react";

export default function OrderPageSelector({
  orders,
  currentPage,
  setCurrentPage,
  onDelete,
}) {
  if (!orders || orders.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">

      {orders.map((_, index) => (
        <div
          key={index}
          className={`flex items-center rounded-xl border overflow-hidden ${
            currentPage === index
              ? "border-[#1c1c1a] bg-[#1c1c1a]"
              : "border-[#ddd6cc] bg-white"
          }`}
        >

          <button
            onClick={() => setCurrentPage(index)}
            className={`px-5 py-3 text-sm transition ${
              currentPage === index
                ? "text-white"
                : "text-[#77736c] hover:text-[#1c1c1a]"
            }`}
          >
            Page {index + 1}
          </button>

          <button
            onClick={() => onDelete(index)}
            className={`px-3 py-3 border-l transition ${
              currentPage === index
                ? "border-white/10 text-white/60 hover:text-red-300"
                : "border-[#eee9e1] text-[#aaa49b] hover:text-red-600"
            }`}
            title={`Delete page ${index + 1}`}
          >
            <Trash2 size={15} />
          </button>

        </div>
      ))}

    </div>
  );
}