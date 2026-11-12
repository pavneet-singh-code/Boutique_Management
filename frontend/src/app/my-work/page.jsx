"use client";

import { BriefcaseBusiness } from "lucide-react";
import AppShell from "../../components/AppShell";
import { Card, EmployeeAvatar } from "../../components/ui";
import { useI18n } from "../../lib/i18n";
import { useMe } from "../../lib/roles";

// Workers' home screen. Assigned work arrives in Phase 3 (order tasks).
export default function MyWorkPage() {
  const { t } = useI18n();
  const me = useMe();

  return (
    <AppShell title={t("mywork.title")} brand>
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-5 md:px-0 md:py-0">
        <div className="flex items-center gap-3">
          {me && <EmployeeAvatar employee={me} size={48} />}
          <div>
            <p className="text-xl font-semibold text-ink md:font-serif md:text-3xl md:font-normal">
              {t("mywork.hello", { name: me?.name || "" })}
            </p>
            {me && (
              <p className="text-sm text-muted">
                {me.employee_code} · {t(`role.${me.role}`)}
              </p>
            )}
          </div>
        </div>
        <Card className="flex flex-col items-center px-6 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent-soft-ink">
            <BriefcaseBusiness size={30} />
          </span>
          <p className="mt-4 text-lg font-semibold text-ink">{t("mywork.empty")}</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{t("mywork.soon")}</p>
        </Card>
      </div>
    </AppShell>
  );
}
