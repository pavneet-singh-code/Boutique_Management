"use client";

import { AlertTriangle, X, Trash2 } from "lucide-react";

export default function DeletePageModal({
  isOpen,
  pageNumber,
  onCancel,
  onConfirm,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#f5f1ea] rounded-2xl shadow-2xl border border-[#ddd6cc] p-7">

        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute right-5 top-5 w-8 h-8 rounded-full flex items-center justify-center text-[#77736c] hover:bg-black/5 hover:text-[#1c1c1a] transition"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
          <AlertTriangle size={20} />
        </div>

        {/* Text */}
        <div className="mt-5">
          <h2 className="text-xl font-medium">
            Delete Page {pageNumber}?
          </h2>

          <p className="text-sm text-[#77736c] mt-2 leading-relaxed">
            This page will be removed from the review and will not be
            saved with the rest of the orders.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-7">

          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-[#d8d1c6] bg-white text-sm hover:bg-[#faf8f4] transition"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700 transition"
          >
            <Trash2 size={16} />
            Delete Page
          </button>

        </div>

      </div>
    </div>
  );
}