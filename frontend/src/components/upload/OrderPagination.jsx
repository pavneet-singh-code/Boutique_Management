"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function OrderPagination({
  currentPage,
  totalPages,
  setCurrentPage,
}) {
  if (totalPages === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between mt-10 pt-6 border-t border-[#eee9e1]">

      <button
        disabled={currentPage === 0}
        onClick={() => setCurrentPage((page) => page - 1)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#ddd6cc] text-sm disabled:opacity-30"
      >
        <ChevronLeft size={16} />
        Previous
      </button>

      <span className="text-sm text-[#77736c]">
        Page {currentPage + 1} of {totalPages}
      </span>

      <button
        disabled={currentPage === totalPages - 1}
        onClick={() => setCurrentPage((page) => page + 1)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#ddd6cc] text-sm disabled:opacity-30"
      >
        Next
        <ChevronRight size={16} />
      </button>

    </div>
  );
}