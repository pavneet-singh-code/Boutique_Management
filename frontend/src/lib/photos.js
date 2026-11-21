"use client";

// Photos on orders: shrinking on the phone before upload, and labels.

export const PHOTO_KINDS = ["fabric", "design", "finished", "other"];

// The photo shown when only one fits: finished piece, else design, else fabric.
const COVER_ORDER = ["finished", "design", "fabric", "other"];

export function coverPhoto(photos) {
  for (const kind of COVER_ORDER) {
    const photo = (photos || []).find((p) => p.kind === kind && p.thumb_url);
    if (photo) return photo;
  }
  return null;
}

/** For showing the outfit (social media, customers): finished piece first. */
export function sortFinishedFirst(photos) {
  const rank = Object.fromEntries(COVER_ORDER.map((kind, index) => [kind, index]));
  return [...(photos || [])].sort((a, b) => (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9) || a.id - b.id);
}

/** For the people making the suit: design and fabric first. */
export function sortForWork(photos) {
  const rank = { design: 0, fabric: 1, other: 2, finished: 3 };
  return [...(photos || [])].sort((a, b) => (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9) || a.id - b.id);
}

/** Orders that are still being made (photos help the people making them). */
export function isUnfinished(order) {
  return !["ready", "delivered", "cancelled"].includes(order?.status);
}

function loadWithImg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    image.src = url;
  });
}

/**
 * Makes a phone photo small enough to upload quickly and store cheaply:
 * at most 1600 px on the long side, JPEG. A 4 MB photo becomes ~250 KB,
 * still sharp enough to see the weave of a fabric.
 */
export async function shrinkImage(file, maxSide = 1600, quality = 0.82) {
  let source;
  try {
    // Respects the camera's rotation (EXIF), so photos aren't sideways.
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    source = await loadWithImg(file); // e.g. iPhone HEIC photos in Safari
  }
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("error.photoRead");
  // Already small JPEGs are uploaded as they are.
  if (file.type === "image/jpeg" && scale === 1 && file.size <= blob.size) {
    return { blob: file, width: canvas.width, height: canvas.height };
  }
  return { blob, width: canvas.width, height: canvas.height };
}
