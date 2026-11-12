"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarDays, Lightbulb, List, Plus, RefreshCw, Rows3 } from "lucide-react";
import AppShell, { HeaderIconButton } from "../../components/AppShell";
import { ContentCard, PlatformBadges, PLATFORMS, ReadyToShoot, contentDate } from "../../components/Content";
import { PeriodStepper } from "../../components/PeriodPicker";
import { Card, Chip, EmptyState, ErrorBox, LinkButton, PageHeading, Spinner, StatTile, cx } from "../../components/ui";
import { getContent, getContentStats, getReadyToShoot } from "../../lib/api";
import { monthGrid, weekdayNames } from "../../lib/calendar";
import { useI18n } from "../../lib/i18n";
import { currentMonthKey, formatMonth, shiftMonth, toISODate } from "../../lib/orders";
import { useCan } from "../../lib/roles";
import { useResource } from "../../lib/useResource";

function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

export default function ContentPlanPage() {
  const { t, locale } = useI18n();
  const canEdit = useCan("contentEdit");

  const itemsLoader = useCallback(() => getContent(), []);
  const readyLoader = useCallback(() => getReadyToShoot(), []);
  const statsLoader = useCallback(() => getContentStats(), []);
  const items = useResource(itemsLoader);
  const ready = useResource(readyLoader);
  const stats = useResource(statsLoader);

  const [view, setView] = useState("week");
  const [platform, setPlatform] = useState(null);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [month, setMonth] = useState(currentMonthKey);
  const [selected, setSelected] = useState(() => toISODate(new Date()));

  const all = useMemo(
    () => (items.data || []).filter((item) => !platform || item.platforms.includes(platform)),
    [items.data, platform]
  );
  const scheduled = all.filter((item) => item.scheduled_for && item.status !== "idea");
  const ideas = all.filter((item) => item.status === "idea");
  const byIso = useMemo(() => {
    const map = new Map();
    for (const item of scheduled) {
      const iso = toISODate(contentDate(item.scheduled_for));
      if (!map.has(iso)) map.set(iso, []);
      map.get(iso).push(item);
    }
    return map;
  }, [scheduled]);

  const refresh = () => {
    items.reload();
    ready.reload();
    stats.reload();
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${weekDays[0].toLocaleDateString(locale, { day: "numeric", month: "short" })} – ${weekDays[6].toLocaleDateString(locale, { day: "numeric", month: "short" })}`;
  const todayIso = toISODate(new Date());
  const upcoming = scheduled.filter((item) => item.status !== "posted" || contentDate(item.scheduled_for) >= addDays(new Date(), -7));

  return (
    <AppShell
      title={t("content.title")}
      subtitle={t("content.subtitle")}
      feature="contentView"
      actions={
        <HeaderIconButton label={t("common.refresh")} onClick={refresh}>
          <RefreshCw size={20} className={items.loading ? "animate-spin" : ""} />
        </HeaderIconButton>
      }
      fab={canEdit ? { href: "/content/new", label: t("content.new"), icon: Plus } : null}
    >
      <PageHeading
        eyebrow={t("content.section")}
        title={t("content.title")}
        subtitle={t("content.subtitle")}
        actions={
          canEdit && (
            <LinkButton href="/content/new">
              <Plus size={17} />
              {t("content.new")}
            </LinkButton>
          )
        }
      />

      <ErrorBox error={items.error} onRetry={refresh} className="my-4" />

      {!items.data && !items.error ? (
        <Spinner />
      ) : items.data ? (
        <div className="space-y-6 pt-3 md:pt-0">
          {/* Numbers */}
          {stats.data && (
            <div className="space-y-3 px-4 md:px-0">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatTile tone="accent" label={t("content.statThisWeek")} value={`${stats.data.this_week_posted}/${stats.data.this_week}`} />
                <StatTile label={t("content.statPosted")} value={stats.data.posted_this_month} />
                <StatTile label={t("content.statIdeas")} value={stats.data.ideas} />
                <StatTile label={t("content.statReady")} value={stats.data.ready_to_shoot} />
              </div>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                {t("content.byPlatform")}:
                {PLATFORMS.map((p) => (
                  <span key={p} className="flex items-center gap-1">
                    <PlatformBadges platforms={[p]} /> {stats.data.this_week_by_platform[p] || 0}
                  </span>
                ))}
              </p>
            </div>
          )}

          <ReadyToShoot orders={ready.data} />

          {/* View + platform filter */}
          <div className="space-y-3 px-4 md:px-0">
            <div className="grid grid-cols-3 rounded-full bg-card-2 p-1 md:max-w-sm">
              {[
                ["week", t("content.week"), Rows3],
                ["month", t("content.month"), CalendarDays],
                ["list", t("content.list"), List],
              ].map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  onClick={() => setView(value)}
                  className={cx("flex h-9 items-center justify-center gap-1.5 rounded-full text-sm font-medium transition", view === value ? "bg-card text-ink shadow-sm" : "text-muted")}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
              <Chip active={!platform} onClick={() => setPlatform(null)}>
                {t("cal.all")}
              </Chip>
              {PLATFORMS.map((p) => (
                <Chip key={p} active={platform === p} onClick={() => setPlatform(platform === p ? null : p)}>
                  {t(`platform.${p}`)}
                </Chip>
              ))}
            </div>
          </div>

          {view === "week" && (
            <Card className="mx-4 overflow-hidden md:mx-0">
              <div className="p-3">
                <PeriodStepper
                  label={weekLabel}
                  onPrev={() => setWeekStart(addDays(weekStart, -7))}
                  onNext={() => setWeekStart(addDays(weekStart, 7))}
                />
              </div>
              {weekDays.map((day) => {
                const iso = toISODate(day);
                const dayItems = byIso.get(iso) || [];
                return (
                  <section key={iso}>
                    <h3 className={cx("px-4 py-1.5 text-xs font-semibold md:px-5", iso === todayIso ? "bg-accent-soft text-accent-soft-ink" : "bg-card-2 text-ink-2")}>
                      {iso === todayIso ? `${t("common.today")} · ` : ""}
                      {day.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "short" })}
                    </h3>
                    {dayItems.length ? (
                      <ul className="divide-y divide-line">
                        {dayItems.map((item) => (
                          <ContentCard key={item.id} item={item} />
                        ))}
                      </ul>
                    ) : (
                      <p className="px-4 py-2 text-xs text-muted md:px-5">—</p>
                    )}
                  </section>
                );
              })}
            </Card>
          )}

          {view === "month" && (
            <div className="space-y-4">
              <Card className="mx-4 p-3 md:mx-0 md:p-5">
                <PeriodStepper className="mb-3" label={formatMonth(month, locale)} onPrev={() => setMonth(shiftMonth(month, -1))} onNext={() => setMonth(shiftMonth(month, 1))} />
                <div className="grid grid-cols-7 border-b border-line pb-1 text-center text-[11px] font-semibold uppercase text-muted">
                  {weekdayNames(locale).map((name) => (
                    <span key={name}>{name}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-px">
                  {monthGrid(month).flat().map((date) => {
                    const iso = toISODate(date);
                    const dayItems = byIso.get(iso) || [];
                    const inMonth = date.getMonth() === Number(month.split("-")[1]) - 1;
                    return (
                      <button
                        key={iso}
                        type="button"
                        aria-pressed={selected === iso}
                        onClick={() => setSelected(iso)}
                        className={cx("flex min-h-[58px] flex-col items-center gap-1 rounded-xl py-1.5 transition", selected === iso ? "bg-accent-soft" : "hover:bg-card-2", !inMonth && "opacity-40")}
                      >
                        <span className={cx("flex h-7 w-7 items-center justify-center rounded-full text-sm", iso === todayIso ? "bg-accent font-bold text-white" : "text-ink")}>
                          {date.getDate()}
                        </span>
                        {dayItems.length > 0 && (
                          <span className="rounded bg-[#fce7f3] px-1 text-[10px] font-bold leading-4 text-[#9d174d]">
                            🎬{dayItems.length > 1 ? dayItems.length : ""}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Card>
              <Card className="mx-4 overflow-hidden md:mx-0">
                {(byIso.get(selected) || []).length ? (
                  <ul className="divide-y divide-line">
                    {byIso.get(selected).map((item) => (
                      <ContentCard key={item.id} item={item} />
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-muted">{t("cal.nothing")}</p>
                )}
              </Card>
            </div>
          )}

          {view === "list" && (
            <Card className="mx-4 overflow-hidden md:mx-0">
              {upcoming.length ? (
                <ul className="divide-y divide-line">
                  {upcoming.map((item) => (
                    <ContentCard key={item.id} item={item} showDate />
                  ))}
                </ul>
              ) : (
                <EmptyState icon={CalendarDays} title={t("content.nothing")} />
              )}
            </Card>
          )}

          {/* Ideas (no date yet) */}
          <section>
            <div className="mb-2 px-4 md:px-0">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink md:font-serif md:text-xl md:font-normal">
                <Lightbulb size={18} className="text-warn-ink" />
                {t("content.ideas")} ({ideas.length})
              </h2>
              <p className="text-xs text-muted">{t("content.ideasHelp")}</p>
            </div>
            <Card className="mx-4 overflow-hidden md:mx-0">
              {ideas.length ? (
                <ul className="divide-y divide-line">
                  {ideas.map((item) => (
                    <ContentCard key={item.id} item={item} showDate />
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-muted">{t("content.noIdeas")}</p>
              )}
            </Card>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
