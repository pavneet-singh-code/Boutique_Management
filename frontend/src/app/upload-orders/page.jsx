"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  FileText,
  LoaderCircle,
  ScanLine,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import AppShell from "../../components/AppShell";
import OrderForm, { toFormValues, toPayload } from "../../components/OrderForm";
import SaveBar from "../../components/SaveBar";
import {
  Button,
  Card,
  ConfirmDialog,
  LinkButton,
  Notice,
  PageHeading,
  cx,
} from "../../components/ui";
import { analyzeOrderPdf, saveOrders } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { clean } from "../../lib/orders";
import { useOrders } from "../../lib/useOrders";

function Steps({ step }) {
  const { t } = useI18n();
  const steps = [t("upload.step1"), t("upload.step2"), t("upload.step3")];
  return (
    <ol className="flex items-center gap-2 px-4 py-4 md:px-0">
      {steps.map((label, index) => {
        const done = index < step;
        const active = index === step;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cx(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                done || active ? "bg-accent text-white" : "bg-card-2 text-muted"
              )}
            >
              {done ? <CircleCheck size={15} /> : index + 1}
            </span>
            <span
              className={cx(
                "truncate text-[13px]",
                active ? "font-semibold text-ink" : "text-muted"
              )}
            >
              {label}
            </span>
            {index < steps.length - 1 && <span className="h-px flex-1 bg-line" />}
          </li>
        );
      })}
    </ol>
  );
}

let pageId = 0;

export default function UploadOrdersPage() {
  const { t, tError } = useI18n();
  const { orders: savedOrders } = useOrders();
  const inputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState("pick"); // pick | scanning | review | done
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [pages, setPages] = useState([]);
  const [current, setCurrent] = useState(0);
  const [failures, setFailures] = useState([]);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const existingNumbers = useMemo(
    () => new Set(savedOrders.map((order) => clean(order.order_number)).filter(Boolean)),
    [savedOrders]
  );

  // Warn before leaving with scanned pages that aren't saved yet.
  useEffect(() => {
    if (phase !== "review" && phase !== "scanning") return;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  const addFiles = (list) => {
    const incoming = [...(list || [])];
    const pdfs = incoming.filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    );
    setNotice(pdfs.length < incoming.length ? t("upload.onlyPdf") : "");
    if (pdfs.length === 0) return;
    setFiles((previous) => {
      const names = new Set(previous.map((file) => `${file.name}-${file.size}`));
      return [...previous, ...pdfs.filter((file) => !names.has(`${file.name}-${file.size}`))];
    });
  };

  const scan = async () => {
    setPhase("scanning");
    setFailures([]);
    setSaveError("");
    const results = [];
    const failed = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setProgress({ current: index + 1, total: files.length });
      try {
        const extracted = await analyzeOrderPdf(file);
        for (const item of extracted) {
          pageId += 1;
          results.push({
            id: pageId,
            source: item.filename || file.name,
            original: item,
            form: toFormValues(item),
          });
        }
      } catch (err) {
        if (err.message === "error.session") return;
        failed.push(t("upload.failed", { name: file.name, error: tError(err) }));
      }
    }

    setFailures(failed);
    setPages(results);
    setCurrent(0);
    setPhase(results.length > 0 ? "review" : "pick");
    window.scrollTo({ top: 0 });
  };

  const changeField = (field, value) => {
    setPages((previous) =>
      previous.map((page, index) =>
        index === current ? { ...page, form: { ...page.form, [field]: value } } : page
      )
    );
  };

  const removePage = () => {
    setPages((previous) => {
      const next = previous.filter((_, index) => index !== deleteIndex);
      if (next.length === 0) setPhase("pick");
      return next;
    });
    setCurrent((value) => Math.max(0, Math.min(value, pages.length - 2)));
    setDeleteIndex(null);
  };

  const saveAll = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const payload = pages.map((page) => ({
        ...toPayload(page.form),
        filename: page.source,
      }));
      const saved = await saveOrders(payload);
      setSavedCount(saved.length);
      setPages([]);
      setFiles([]);
      setPhase("done");
      window.scrollTo({ top: 0 });
    } catch (err) {
      setSaveError(tError(err));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setPages([]);
    setFailures([]);
    setNotice("");
    setSaveError("");
    setPhase("pick");
    setConfirmReset(false);
  };

  const step = phase === "pick" ? 0 : phase === "scanning" ? 1 : 2;
  const page = pages[current];

  // Order numbers must be present and unique (in the database and in this upload).
  const numberCounts = {};
  for (const item of pages) {
    const number = clean(item.form.order_number);
    if (number) numberCounts[number] = (numberCounts[number] || 0) + 1;
  }
  const pageProblem = (item, index) => {
    const number = clean(item.form.order_number);
    if (!number) return t("upload.missingNumber", { n: index + 1 });
    if (existingNumbers.has(number)) return t("upload.duplicate", { number });
    if (numberCounts[number] > 1) return t("upload.sameNumberTwice", { number });
    return null;
  };
  const problems = pages.map(pageProblem);
  const hasProblems = problems.some(Boolean);
  const currentProblem = page ? problems[current] : null;

  return (
    <AppShell
      feature="upload"
      title={t("upload.title")}
      subtitle={t("upload.subtitle")}
      back={phase === "review" ? undefined : "/orders"}
      hideTabs={phase === "review"}
      actions={
        phase === "review" ? (
          <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
            {t("upload.startOver")}
          </Button>
        ) : null
      }
    >
      <div className="mx-auto max-w-4xl">
        <PageHeading
          eyebrow={t("nav.ordersSection")}
          title={t("upload.title")}
          subtitle={t("upload.subtitle")}
        />
        <Steps step={phase === "done" ? 3 : step} />

        <div className="space-y-4 px-4 md:px-0">
          {failures.map((message) => (
            <Notice key={message} tone="error">
              {message}
            </Notice>
          ))}
          {notice && <Notice tone="warn">{notice}</Notice>}

          {/* ---------- 1. Pick files ---------- */}
          {phase === "pick" && (
            <>
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  addFiles(event.dataTransfer.files);
                }}
                className={cx(
                  "block cursor-pointer rounded-3xl border-2 border-dashed p-8 text-center transition md:p-14",
                  dragging
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-card hover:border-accent"
                )}
              >
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white">
                  <Upload size={26} />
                </span>
                <span className="mt-5 block text-lg font-semibold text-ink">
                  {t("upload.pick")}
                </span>
                <span className="mx-auto mt-2 block max-w-md text-sm leading-6 text-muted">
                  {t("upload.pickHelp")}
                </span>
                <span className="mt-3 hidden text-xs text-muted md:block">
                  {t("upload.drop")}
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    addFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>

              {files.length > 0 && (
                <Card className="overflow-hidden">
                  <p className="border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-accent-ink">
                    {t("upload.files")}
                  </p>
                  <ul className="divide-y divide-line">
                    {files.map((file, index) => (
                      <li key={`${file.name}-${file.size}`} className="flex items-center gap-3 px-4 py-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger">
                          <FileText size={19} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium text-ink">
                            {file.name}
                          </span>
                          <span className="block text-xs text-muted">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setFiles((list) => list.filter((_, i) => i !== index))}
                          aria-label={`${t("upload.remove")} ${file.name}`}
                          className="rounded-full p-2 text-muted hover:bg-card-2 hover:text-danger"
                        >
                          <X size={18} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {files.length > 0 && (
                <Button size="lg" className="w-full md:w-auto" onClick={scan}>
                  <ScanLine size={19} />
                  {files.length === 1
                    ? t("upload.scanOne")
                    : t("upload.scan", { count: files.length })}
                </Button>
              )}
            </>
          )}

          {/* ---------- 2. Scanning ---------- */}
          {phase === "scanning" && (
            <Card className="flex flex-col items-center px-6 py-14 text-center">
              <LoaderCircle size={40} className="animate-spin text-accent" />
              <p className="mt-5 text-lg font-semibold text-ink">
                {t("upload.scanning", progress)}
              </p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                {t("upload.scanningHelp")}
              </p>
              <div className="mt-6 h-2 w-full max-w-xs overflow-hidden rounded-full bg-card-2">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{ width: `${(progress.current / Math.max(1, progress.total)) * 100}%` }}
                />
              </div>
            </Card>
          )}

          {/* ---------- 3. Review ---------- */}
          {phase === "review" && page && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-ink md:font-serif md:text-2xl md:font-normal">
                  {t("upload.review")}
                </h2>
                <p className="text-sm text-muted">{t("upload.reviewHelp")}</p>
              </div>

              <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
                {pages.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrent(index)}
                    aria-pressed={index === current}
                    className={cx(
                      "relative h-9 shrink-0 rounded-full px-4 text-sm transition",
                      index === current
                        ? "bg-accent font-medium text-white"
                        : "bg-card-2 text-ink-2"
                    )}
                  >
                    {t("upload.page", { n: index + 1 })}
                    {problems[index] ? (
                      <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-danger" />
                    ) : item.form.needs_review ? (
                      <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-card bg-[#f59e0b]" />
                    ) : null}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-card-2 px-4 py-3">
                <FileText size={18} className="shrink-0 text-muted" />
                <p className="min-w-0 flex-1 truncate text-sm text-ink-2">{page.source}</p>
                <Button variant="ghost" size="sm" onClick={() => setDeleteIndex(current)}>
                  <Trash2 size={16} className="text-danger" />
                  <span className="hidden sm:inline">{t("upload.deletePage")}</span>
                </Button>
              </div>

              {currentProblem && <Notice tone="error">{currentProblem}</Notice>}

              <OrderForm key={page.id} value={page.form} onChange={changeField} original={page.original} />

              <div className="flex items-center justify-between">
                <Button
                  variant="secondary"
                  disabled={current === 0}
                  onClick={() => setCurrent(current - 1)}
                >
                  <ChevronLeft size={17} />
                  {t("common.prev")}
                </Button>
                <span className="text-sm text-muted">
                  {current + 1} / {pages.length}
                </span>
                <Button
                  variant="secondary"
                  disabled={current === pages.length - 1}
                  onClick={() => setCurrent(current + 1)}
                >
                  {t("common.next")}
                  <ChevronRight size={17} />
                </Button>
              </div>

              {saveError && <Notice tone="error">{saveError}</Notice>}
              {hasProblems && (
                <Notice tone="warn">
                  <p className="font-semibold">{t("upload.fixNumbers")}</p>
                  <ul className="mt-1 list-disc pl-4">
                    {problems.filter(Boolean).map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                </Notice>
              )}

              <form
                id="save-upload"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveAll();
                }}
              >
                <SaveBar
                  form="save-upload"
                  saving={saving}
                  disabled={hasProblems}
                  label={
                    pages.length === 1
                      ? t("upload.saveOne")
                      : t("upload.saveAll", { count: pages.length })
                  }
                />
              </form>
            </>
          )}

          {/* ---------- Done ---------- */}
          {phase === "done" && (
            <Card className="flex flex-col items-center px-6 py-12 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent-soft-ink">
                <CircleCheck size={32} />
              </span>
              <p className="mt-5 text-lg font-semibold text-ink">
                {savedCount === 1
                  ? t("upload.savedOne")
                  : t("upload.saved", { count: savedCount })}
              </p>
              <div className="mt-6 flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
                <LinkButton href="/orders?sort=newest&allMonths=true">
                  {t("upload.viewOrders")}
                </LinkButton>
                <Button variant="secondary" onClick={reset}>
                  <Upload size={17} />
                  {t("nav.upload")}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteIndex !== null}
        title={t("upload.deleteTitle", { n: (deleteIndex ?? 0) + 1 })}
        body={t("upload.deleteBody")}
        confirmLabel={t("upload.deletePage")}
        onCancel={() => setDeleteIndex(null)}
        onConfirm={removePage}
      />
      <ConfirmDialog
        open={confirmReset}
        title={t("upload.discardConfirm")}
        confirmLabel={t("upload.startOver")}
        onCancel={() => setConfirmReset(false)}
        onConfirm={reset}
      />
    </AppShell>
  );
}
