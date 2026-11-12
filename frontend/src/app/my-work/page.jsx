"use client";

import { useCallback, useMemo } from "react";
import { BriefcaseBusiness, RefreshCw } from "lucide-react";
import AppShell, { HeaderIconButton } from "../../components/AppShell";
import { TaskCard } from "../../components/Work";
import { Card, EmployeeAvatar, ErrorBox, SectionTitle, Spinner } from "../../components/ui";
import { getMyTasks } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { parseDate } from "../../lib/orders";
import { useMe } from "../../lib/roles";
import { useResource } from "../../lib/useResource";

/** A worker's home: the work given to them, soonest first. */
export default function MyWorkPage() {
  const { t } = useI18n();
  const me = useMe();
  const loader = useCallback(() => getMyTasks(), []);
  const { data: tasks, error, loading, reload } = useResource(loader);

  const { open, done } = useMemo(() => {
    const list = tasks || [];
    const due = (task) => parseDate(task.due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return {
      open: list
        .filter((task) => task.status !== "done")
        .sort((a, b) => (a.status === "in_progress" ? -1 : 0) - (b.status === "in_progress" ? -1 : 0) || due(a) - due(b)),
      done: list
        .filter((task) => task.status === "done")
        .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at))),
    };
  }, [tasks]);

  return (
    <AppShell
      title={t("mywork.title")}
      brand
      actions={
        <HeaderIconButton label={t("common.refresh")} onClick={reload}>
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </HeaderIconButton>
      }
    >
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

        <ErrorBox error={error} onRetry={reload} />

        {!tasks && !error ? (
          <Spinner />
        ) : tasks ? (
          <>
            {open.length === 0 ? (
              <Card className="flex flex-col items-center px-6 py-12 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent-soft-ink">
                  <BriefcaseBusiness size={30} />
                </span>
                <p className="mt-4 text-lg font-semibold text-ink">{t("mywork.nothing")}</p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{t("mywork.empty")}</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {open.map((task) => (
                  <TaskCard key={`${task.id}-${task.status}`} task={task} onChanged={reload} />
                ))}
              </div>
            )}

            {done.length > 0 && (
              <section className="pt-2">
                <div className="-mx-4 md:mx-0">
                  <SectionTitle title={t("mywork.doneRecently")} />
                </div>
                <div className="space-y-3">
                  {done.map((task) => (
                    <TaskCard key={`${task.id}-${task.status}`} task={task} onChanged={reload} />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
