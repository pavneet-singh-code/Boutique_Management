"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { getToast, hideToast, subscribeToast } from "../lib/toast";
import { useI18n } from "../lib/i18n";
import { PencilDoodle, SparkleDoodle } from "./Doodles";

/** The pop-up notification: a white card with a pencil doodle, near the top of the screen. */
export default function Toaster() {
  const { t } = useI18n();
  const toast = useSyncExternalStore(subscribeToast, getToast, () => null);
  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-[90] flex justify-center md:top-6">
      <div
        key={toast.id}
        role="status"
        aria-live="polite"
        className="toast-enter pointer-events-auto relative flex w-full max-w-md items-center gap-3 rounded-[1.75rem] bg-card py-3 pl-3 pr-11 shadow-lg ring-1 ring-white"
      >
        <span className="relative flex h-14 w-16 shrink-0 items-center justify-center rounded-2xl bg-sage-soft">
          <PencilDoodle className="h-12 w-14" />
          <SparkleDoodle className="absolute -right-1 -top-1 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[17px] font-bold leading-tight text-ink">{toast.title}</span>
          {toast.body && <span className="mt-0.5 block text-sm text-muted">{toast.body}</span>}
          {toast.href && (
            <Link href={toast.href} onClick={hideToast} className="mt-1 inline-block text-sm font-bold text-accent-ink underline-offset-2 hover:underline">
              {toast.linkLabel}
            </Link>
          )}
        </span>
        <button
          type="button"
          onClick={hideToast}
          aria-label={t("common.close")}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted hover:bg-card-2 hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
