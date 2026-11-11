"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { Button } from "./ui";

/** Save button that sticks to the bottom of the screen on phones. */
export default function SaveBar({ saving, label, form }) {
  const { t } = useI18n();
  return (
    <div className="pb-safe sticky bottom-0 z-20 -mx-4 mt-6 border-t border-line bg-card/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
      <div className="flex justify-end">
        <Button
          type="submit"
          form={form}
          size="lg"
          disabled={saving}
          className="w-full md:w-auto"
        >
          {saving ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? t("common.saving") : label || t("common.save")}
        </Button>
      </div>
    </div>
  );
}

