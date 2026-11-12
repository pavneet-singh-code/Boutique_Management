"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "../../../components/AppShell";
import { ContentForm } from "../../../components/Content";
import { Card, PageHeading } from "../../../components/ui";
import { useI18n } from "../../../lib/i18n";
import { useMe } from "../../../lib/roles";

function NewContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const me = useMe();
  const title = me?.role === "owner" ? t("content.new") : t("content.newIdea");

  return (
    <AppShell title={title} subtitle={t("content.subtitle")} back="/content" hideTabs feature="contentEdit">
      <div className="mx-auto max-w-2xl px-4 py-4 md:px-0 md:py-0">
        <PageHeading eyebrow={t("content.title")} title={title} subtitle={t("content.subtitle")} />
        <Card className="p-4 md:p-6">
          <ContentForm
            presetOrderId={searchParams.get("order")}
            presetDate={searchParams.get("date")}
            onSaved={(item) => router.replace(`/content/${item.id}`)}
          />
        </Card>
      </div>
    </AppShell>
  );
}

export default function NewContentPage() {
  return (
    <Suspense fallback={null}>
      <NewContent />
    </Suspense>
  );
}
