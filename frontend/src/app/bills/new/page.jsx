"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import AppShell from "../../../components/AppShell";
import { BillEditor } from "../../../components/Bills";
import { Avatar, Card, ErrorBox, PageHeading, Spinner } from "../../../components/ui";
import { getCustomers } from "../../../lib/api";
import { useI18n } from "../../../lib/i18n";
import { useResource } from "../../../lib/useResource";

function ChooseCustomer() {
  const { t } = useI18n();
  const router = useRouter();
  const loader = useCallback(() => getCustomers({ force: true }), []);
  const { data: customers, error, reload } = useResource(loader, true, "customers");
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (customers || [])
      .filter((c) => c.unbilled_count > 0)
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone || "").includes(q))
      .sort((a, b) => String(b.last_order_date).localeCompare(String(a.last_order_date)));
  }, [customers, query]);

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!customers) return <Spinner />;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line p-4">
        <h2 className="mb-3 font-semibold text-ink">{t("bills.chooseCustomer")}</h2>
        <label className="flex h-11 items-center gap-3 rounded-full bg-card-2 px-4 md:rounded-xl">
          <Search size={18} className="text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("customers.search")}
            className="w-full bg-transparent text-[16px] outline-none md:text-sm"
          />
        </label>
      </div>
      <ul className="divide-y divide-line">
        {list.map((customer) => (
          <li key={customer.id}>
            <button
              type="button"
              onClick={() => router.replace(`/bills/new?customer=${customer.id}`)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-card-2"
            >
              <Avatar name={customer.name} seed={`c${customer.id}`} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15.5px] font-medium text-ink">{customer.name}</span>
                <span className="block text-sm text-muted">
                  {t("dash.unbilledNote", { count: customer.unbilled_count })}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NewBillContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customer");
  const preselect = (searchParams.get("orders") || "").split(",").filter(Boolean);

  return (
    <AppShell
      feature="makeBills" title={t("bills.new")} subtitle={t("bills.subtitle")} back hideTabs>
      <div className="mx-auto max-w-2xl px-4 pt-4 md:px-0 md:pt-0">
        <PageHeading eyebrow={t("bills.title")} title={t("bills.new")} subtitle={t("bills.chooseSuitsHelp")} />
        {customerId ? (
          <BillEditor
            customerId={customerId}
            preselect={preselect}
            onSaved={(bill) => router.replace(`/bills/${bill.id}`)}
          />
        ) : (
          <ChooseCustomer />
        )}
      </div>
    </AppShell>
  );
}

export default function NewBillPage() {
  return (
    <Suspense fallback={null}>
      <NewBillContent />
    </Suspense>
  );
}
