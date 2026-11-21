"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, Trash2, X } from "lucide-react";
import { Chip, ConfirmDialog, Notice, cx } from "./ui";
import { deletePhoto, updatePhoto, uploadOrderPhoto } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { PHOTO_KINDS, coverPhoto } from "../lib/photos";

/* ---------------- Small previews ---------------- */

/** One square preview. Clickable when `onClick` is given. */
export function PhotoThumb({ photo, size = 56, onClick, className, label, round = false }) {
  const { t } = useI18n();
  if (!photo?.thumb_url) return null;
  const image = (
    // Cloudinary already resizes the picture; a plain <img> is all we need.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo.thumb_url}
      alt={label || t(`photo.kind.${photo.kind}`)}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover"
    />
  );
  const box = cx(
    "relative block shrink-0 overflow-hidden bg-card-2 ring-1 ring-line",
    round ? "rounded-full" : "rounded-xl",
    className
  );
  if (!onClick) {
    return (
      <span className={box} style={{ width: size, height: size }}>
        {image}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(box, "transition hover:opacity-90")}
      style={{ width: size, height: size }}
    >
      {image}
    </button>
  );
}

/** The order's main photo (finished > design > fabric), not clickable: for use inside links. */
export function CoverThumb({ photos, size = 48, className, round = false }) {
  const photo = coverPhoto(photos);
  if (!photo) return null;
  return <PhotoThumb photo={photo} size={size} className={className} round={round} />;
}

/** A row of up to `max` previews; tapping opens the full-screen viewer. */
export function PhotoStrip({ photos, size = 56, max = 3, className }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(null);
  const list = (photos || []).filter((p) => p.thumb_url);
  if (!list.length) return null;
  const shown = list.slice(0, max);
  const more = list.length - shown.length;
  return (
    <>
      <div className={cx("flex gap-2", className)}>
        {shown.map((photo, index) => (
          <span key={photo.id} className="relative">
            <PhotoThumb photo={photo} size={size} onClick={() => setOpen(index)} />
            {more > 0 && index === shown.length - 1 && (
              <button
                type="button"
                onClick={() => setOpen(index)}
                aria-label={t("photo.count", { count: list.length })}
                className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/45 text-sm font-semibold text-white"
              >
                +{more}
              </button>
            )}
          </span>
        ))}
      </div>
      {open !== null && <PhotoViewer photos={list} index={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ---------------- Full-screen viewer ---------------- */

export function PhotoViewer({ photos, index = 0, onClose, canEdit = false }) {
  const { t, tError } = useI18n();
  const [current, setCurrent] = useState(index);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const touchX = useRef(null);

  const count = photos.length;
  const safeIndex = Math.min(current, count - 1);
  const photo = photos[safeIndex];

  const go = useCallback(
    (step) => setCurrent((value) => (Math.min(value, count - 1) + step + count) % count),
    [count]
  );

  useEffect(() => {
    if (!count) onClose();
  }, [count, onClose]);

  useEffect(() => {
    const onKey = (event) => {
      if (confirmDelete) return;
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [go, onClose, confirmDelete]);

  if (!photo) return null;

  const changeKind = async (kind) => {
    if (kind === photo.kind) return;
    setError("");
    try {
      await updatePhoto(photo, { kind });
    } catch (err) {
      setError(tError(err));
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await deletePhoto(photo);
      setConfirmDelete(false);
      if (count === 1) onClose();
      else setCurrent((value) => Math.max(0, Math.min(value, count - 2)));
    } catch (err) {
      setError(tError(err));
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black text-white" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{t(`photo.kind.${photo.kind}`)}</p>
          {photo.note && <p className="truncate text-xs text-white/70">{photo.note}</p>}
        </div>
        <div className="flex items-center gap-1">
          {count > 1 && (
            <span className="mr-2 text-xs text-white/70">
              {t("photo.of", { index: safeIndex + 1, total: count })}
            </span>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label={t("common.delete")}
              className="rounded-full p-2.5 hover:bg-white/10"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-full p-2.5 hover:bg-white/10"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        onTouchStart={(event) => {
          touchX.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          if (touchX.current === null || count < 2) return;
          const dx = event.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.url}
          alt={t(`photo.kind.${photo.kind}`)}
          className="max-h-full max-w-full object-contain"
        />
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={t("common.prev")}
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2.5 hover:bg-white/20 sm:block"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={t("common.next")}
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2.5 hover:bg-white/20 sm:block"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      {(canEdit || error) && (
        <div className="pb-safe space-y-2 px-4 py-3">
          {error && <p className="text-sm text-red-300">{error}</p>}
          {canEdit && (
            <div className="flex gap-2 overflow-x-auto">
              {PHOTO_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={photo.kind === kind}
                  onClick={() => changeKind(kind)}
                  className={cx(
                    "h-8 shrink-0 rounded-full px-3.5 text-sm transition",
                    photo.kind === kind ? "bg-white font-medium text-black" : "bg-white/10 text-white/80"
                  )}
                >
                  {t(`photo.kind.${kind}`)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={t("photo.deleteTitle")}
        body={t("photo.deleteBody")}
        busy={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </div>
  );
}

/* ---------------- The order page's Photos section ---------------- */

export function OrderPhotos({ order, canEdit }) {
  const { t, tError } = useI18n();
  const input = useRef(null);
  const [picked, setPicked] = useState([]); // files waiting to be uploaded
  const [kind, setKind] = useState("fabric");
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState(null); // { done, total }
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState(null); // index into `photos`

  const photos = (order.photos || []).filter((p) => p.thumb_url);
  const groups = PHOTO_KINDS.map((k) => ({ kind: k, items: photos.filter((p) => p.kind === k) })).filter(
    (group) => group.items.length
  );

  const pick = (event) => {
    const files = [...(event.target.files || [])].filter((file) => file.type.startsWith("image/") || !file.type);
    event.target.value = ""; // picking the same photo again still works
    if (!files.length) return;
    setError("");
    setNote("");
    setKind(order.status === "ready" || order.status === "delivered" ? "finished" : "fabric");
    setPicked(files);
  };

  const upload = async () => {
    const files = picked;
    setProgress({ done: 0, total: files.length });
    setError("");
    for (let i = 0; i < files.length; i += 1) {
      try {
        await uploadOrderPhoto(order.id, files[i], { kind, note });
      } catch (err) {
        setError(tError(err));
      }
      setProgress({ done: i + 1, total: files.length });
    }
    setProgress(null);
    setPicked([]); // any error stays visible below; the user can pick again
  };

  return (
    <div className="space-y-4 py-3">
      {photos.length === 0 ? (
        <p className="text-sm text-muted">{t("photo.none")}</p>
      ) : (
        groups.map((group) => (
          <div key={group.kind}>
            <p className="mb-2 text-xs font-medium text-muted">{t(`photo.kind.${group.kind}`)}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {group.items.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setViewing(photos.indexOf(photo))}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-card-2 ring-1 ring-line"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumb_url}
                    alt={t(`photo.kind.${photo.kind}`)}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition group-hover:opacity-90"
                  />
                  {photo.note && (
                    <span className="absolute inset-x-0 bottom-0 truncate bg-black/45 px-2 py-1 text-left text-[11px] text-white">
                      {photo.note}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {error && <Notice tone="error">{error}</Notice>}

      {canEdit && (
        <>
          <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={pick} />
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={Boolean(progress)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium text-ink-2 transition hover:bg-card-2 disabled:opacity-50"
          >
            {progress ? <LoaderCircle size={16} className="animate-spin" /> : <ImagePlus size={17} />}
            {progress ? t("photo.uploading", progress) : t("photo.add")}
          </button>
        </>
      )}

      <ConfirmDialog
        open={picked.length > 0}
        tone="accent"
        title={picked.length === 1 ? t("photo.addTitleOne") : t("photo.addTitle", { count: picked.length })}
        confirmLabel={progress ? t("photo.uploading", progress) : t("photo.upload")}
        busy={Boolean(progress)}
        onCancel={() => setPicked([])}
        onConfirm={upload}
      >
        <p className="mb-2 text-sm font-medium text-ink">{t("photo.kindLabel")}</p>
        <div className="flex flex-wrap gap-2">
          {PHOTO_KINDS.map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
              {t(`photo.kind.${k}`)}
            </Chip>
          ))}
        </div>
        <input
          type="text"
          value={note}
          maxLength={200}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t("photo.notePlaceholder")}
          className="mt-4 h-11 w-full rounded-xl border border-line bg-card px-3.5 text-[15px] text-ink outline-none focus:border-accent"
        />
      </ConfirmDialog>

      {viewing !== null && (
        <PhotoViewer photos={photos} index={viewing} canEdit={canEdit} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

