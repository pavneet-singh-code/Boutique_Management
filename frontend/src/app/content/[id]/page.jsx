"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronDown, Pencil } from "lucide-react";
import AppShell from "../../../components/AppShell";
import { ContentForm, ContentStageChip, PlatformBadges, StageStepper, contentDate, isLateContent } from "../../../components/Content";
import { Card, EmployeeAvatar, ErrorBox, PageHeading, Spinner, cx } from "../../../components/ui";
import { StageChip } from "../../../components/Work";
import { getContent } from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import { useCan, useMe } from "../../../lib/roles";
import { useResource } from "../../../lib/useResource";

export default function ContentItemPage() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const me = useMe();
  const canEdit = useCan("contentEdit");
  const loader = useCallback(() => getContent().then((list) => list.find((item) => String(item.id) === String(id)) || false), [id]);
  const { data: item, setData, error, reload, ready } = useResource(loader);
  const [editing, setEditing] = useState(false);

  if (!item) {
    return (
      <AppShell title={t("content.title")} back="/content" hideTabs feature="contentView">
        <ErrorBox error={error} onRetry={reload} className="mt-4" />
        {!error && (ready ? <p className="p-6 text-center text-muted">{t("order.notFound")}</p> : <Spinner />)}
      </AppShell>
    );
  }

  const when = contentDate(item.scheduled_for);
  const canEditDetails = me?.role === "owner" || (item.status === "idea" && item.creator?.id === me?.id);

  return (
    <AppShell title={item.title} subtitle={t("content.title")} back="/content" hideTabs feature="contentView">
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-4 md:px-0 md:py-0">
        <PageHeading eyebrow={t("content.title")} title={item.title} />

        <Card className="space-y-3 p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <ContentStageChip status={item.status} />
            <span className="text-sm text-muted">{t(`format.${item.format}`)}</span>
            <PlatformBadges platforms={item.platforms} full />
          </div>
          <p className={cx("text-[15px]", isLateContent(item) ? "font-semibold text-danger" : "text-ink")}>
            {when
              ? when.toLocaleString(locale, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" })
              : t("content.unscheduled")}
          </p>
          {item.brief && <p className="whitespace-pre-wrap rounded-xl bg-card-2 px-3 py-2.5 text-[15px] leading-7 text-ink">{item.brief}</p>}
          {item.person && (
            <p className="flex items-center gap-2 text-sm text-ink-2">
              <EmployeeAvatar employee={item.person} size={26} />
              {item.person.name}
            </p>
          )}
          {item.order && (
            <Link href={`/orders/${item.order.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 hover:bg-card-2">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">
                  #{item.order.order_number || item.order.id} · {item.order.customer_name}
                </span>
                <span className="block truncate text-xs text-muted">{item.order.what_to_design || "—"}</span>
              </span>
              <StageChip status={item.order.status} step={item.order.current_step} />
            </Link>
          )}
        </Card>

        {canEdit && <StageStepper key={`${item.status}-${item.posted_url}`} item={item} onChanged={setData} />}

        {canEdit && canEditDetails && (
          <Card className="overflow-hidden">
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              className="flex w-full items-center justify-between px-4 py-3 text-left font-semibold text-ink md:px-5"
            >
              <span className="flex items-center gap-2">
                <Pencil size={16} />
                {t("content.edit")}
              </span>
              <ChevronDown size={18} className={cx("transition", editing && "rotate-180")} />
            </button>
            {editing && (
              <div className="border-t border-line p-4 md:p-5">
                <ContentForm
                  item={item}
                  onSaved={(saved) => {
                    setData(saved);
                    setEditing(false);
                  }}
                />
              </div>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
