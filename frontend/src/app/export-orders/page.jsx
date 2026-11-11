"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Share2 } from "lucide-react";
import AppShell from "../../components/AppShell";
import { PeriodStepper } from "../../components/PeriodPicker";
import {
  Button,
  Card,
  ErrorBox,
  Notice,
  PageHeading,
  Spinner,
  cx,
} from "../../components/ui";
import { useI18n } from "../../lib/i18n";
import {
  amount,
  balanceOf,
  clean,
  currentMonthKey,
  formatMonth,
  orderDate,
  orderMonthKey,
  shiftMonth,
  toISODate,
} from "../../lib/orders";
import { useOrders } from "../../lib/useOrders";

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export default function ExportOrdersPage() {
  const { t, locale } = useI18n();
  const { orders, ready, error, reload } = useOrders();
  const [range, setRange] = useState("month"); // month | year | all
  const [month, setMonth] = useState(currentMonthKey);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [done, setDone] = useState(false);

  const selected = useMemo(() => {
    const list = orders.filter((order) => {
      if (range === "month") return orderMonthKey(order) === month;
      if (range === "year") return orderDate(order)?.getFullYear() === year;
      return true;
    });
    return list.sort((a, b) => (orderDate(a)?.getTime() ?? 0) - (orderDate(b)?.getTime() ?? 0));
  }, [orders, range, month, year]);

  const fileName =
    range === "month"
      ? `fab_art_orders_${month}.csv`
      : range === "year"
        ? `fab_art_orders_${year}.csv`
        : "fab_art_orders_all.csv";

  const buildFile = () => {
    const header = [
      t("field.orderNumber"),
      t("field.customer"),
      t("field.additional"),
      t("field.contact"),
      t("field.orderDate"),
      t("field.deliverDate"),
      t("field.design"),
      t("field.total"),
      t("field.advance"),
      t("field.balance"),
      t("field.needsReview"),
      t("field.source"),
    ];
    const rows = selected.map((order) => [
      clean(order.order_number),
      clean(order.customer_name),
      clean(order.additional_info),
      clean(order.contact_number),
      toISODate(order.order_date) || clean(order.order_date),
      toISODate(order.deliver_date) || clean(order.deliver_date),
      clean(order.what_to_design),
      amount(order.total_amount) ?? "",
      amount(order.advance_payment) ?? "",
      balanceOf(order) ?? "",
      order.needs_review ? t("common.yes") : t("common.no"),
      clean(order.filename),
    ]);
    // BOM so Excel shows Hindi text correctly.
    const csv = "﻿" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new File([csv], fileName, { type: "text/csv;charset=utf-8" });
  };

  const download = () => {
    const file = buildFile();
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDone(true);
  };

  // Only rendered after orders load (client-side), so this is safe to read here.
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    typeof File !== "undefined";

  const share = async () => {
    const shareFile = buildFile();
    if (!navigator.canShare({ files: [shareFile] })) {
      download();
      return;
    }
    try {
      await navigator.share({ files: [shareFile], title: fileName });
      setDone(true);
    } catch {
      // The person closed the share sheet.
    }
  };

  const options = [
    { value: "month", label: t("export.pickMonth") },
    { value: "year", label: t("export.pickYear") },
    { value: "all", label: t("export.all") },
  ];

  return (
    <AppShell title={t("export.title")} subtitle={t("export.subtitle")} back="/settings">
      <div className="mx-auto max-w-2xl">
        <PageHeading
          eyebrow={t("nav.ordersSection")}
          title={t("export.title")}
          subtitle={t("export.subtitle")}
        />
        <ErrorBox error={error} onRetry={() => reload()} className="my-4" />

        {!ready && !error ? (
          <Spinner />
        ) : ready ? (
          <div className="space-y-4 px-4 pt-4 md:px-0 md:pt-0">
            <Card className="p-4 md:p-6">
              <h2 className="mb-3 text-sm font-semibold text-ink">{t("export.range")}</h2>
              <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={range === option.value}
                    onClick={() => {
                      setRange(option.value);
                      setDone(false);
                    }}
                    className={cx(
                      "rounded-xl border-2 px-4 py-3 text-left text-[15px] font-medium transition",
                      range === option.value
                        ? "border-accent bg-accent-soft text-accent-soft-ink"
                        : "border-line text-ink-2"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {range === "month" && (
                <PeriodStepper
                  className="mt-4"
                  label={formatMonth(month, locale)}
                  onPrev={() => setMonth(shiftMonth(month, -1))}
                  onNext={() => setMonth(shiftMonth(month, 1))}
                />
              )}
              {range === "year" && (
                <PeriodStepper
                  className="mt-4"
                  label={String(year)}
                  onPrev={() => setYear(year - 1)}
                  onNext={() => setYear(year + 1)}
                />
              )}
            </Card>

            <Card className="flex items-center gap-4 p-4 md:p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-ink">
                <FileSpreadsheet size={24} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-ink">
                  {t("export.count", { count: selected.length })}
                </p>
                <p className="truncate text-sm text-muted">{fileName}</p>
                <p className="text-xs text-muted">{t("export.help")}</p>
              </div>
            </Card>

            {done && <Notice>{t("export.done")}</Notice>}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="lg" onClick={download} disabled={selected.length === 0}>
                <Download size={18} />
                {t("export.download")}
              </Button>
              {canShare && (
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={share}
                  disabled={selected.length === 0}
                  className="md:hidden"
                >
                  <Share2 size={18} />
                  {t("export.share")}
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
