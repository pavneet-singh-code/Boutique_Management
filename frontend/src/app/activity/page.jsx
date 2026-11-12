"use client";

import { useCallback, useState } from "react";
import ActivityList from "../../components/ActivityList";
import AppShell from "../../components/AppShell";
import { Card, Chip, EmployeeAvatar, PageHeading } from "../../components/ui";
import { getEmployeeDirectory } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { can, useMe } from "../../lib/roles";
import { useResource } from "../../lib/useResource";

export default function ActivityPage() {
  const { t } = useI18n();
  const me = useMe();
  const isOwner = can(me?.role, "allActivity");
  const loader = useCallback(() => getEmployeeDirectory(), []);
  const { data: people } = useResource(loader, isOwner);
  const [actorId, setActorId] = useState(null);
  const subtitle = isOwner ? t("activity.subtitle") : t("activity.mine");

  return (
    <AppShell title={t("activity.title")} subtitle={subtitle} back="/settings">
      <div className="mx-auto max-w-3xl pb-8">
        <PageHeading eyebrow={t("nav.management")} title={t("activity.title")} subtitle={subtitle} />

        {isOwner && people && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3 md:px-0">
            <Chip active={!actorId} onClick={() => setActorId(null)}>
              {t("activity.everyone")}
            </Chip>
            {people.map((person) => (
              <Chip key={person.id} active={actorId === person.id} onClick={() => setActorId(person.id)}>
                <span className="flex items-center gap-1.5">
                  <EmployeeAvatar employee={person} size={18} />
                  {person.name}
                </span>
              </Chip>
            ))}
          </div>
        )}

        <Card className="overflow-hidden rounded-none border-x-0 md:rounded-2xl md:border-x">
          <ActivityList key={actorId ?? "all"} actorId={actorId} meId={me?.id} />
        </Card>
      </div>
    </AppShell>
  );
}
