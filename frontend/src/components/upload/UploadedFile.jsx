"use client";

import { FileText, Loader2 } from "lucide-react";

export default function UploadedFile({
  file,
  onAnalyze,
  loading,
}) {
  if (!file) return null;

  return (
    <div className="mt-5 bg-white rounded-xl border border-[#e1dbd1] p-4 flex items-center justify-between">

      <div className="flex items-center gap-3">

        <div className="w-10 h-10 rounded-lg bg-[#f0ece5] flex items-center justify-center">
          <FileText size={18} />
        </div>

        <div>
          <p className="text-sm font-medium">
            {file.name}
          </p>

          <p className="text-xs text-[#77736c] mt-1">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>

      </div>

      <button
        onClick={onAnalyze}
        disabled={loading}
        className="px-5 py-3 rounded-xl bg-[#1c1c1a] text-white text-sm hover:bg-[#30302d] transition disabled:opacity-60"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Processing...
          </span>
        ) : (
          "Analyze PDF"
        )}
      </button>

    </div>
  );
}