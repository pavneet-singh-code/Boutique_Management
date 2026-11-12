"use client";

import QRCode from "qrcode";
import { clean, formatDate, formatMoney } from "./orders";

/** UPI deep link that any UPI app understands (GPay, PhonePe, Paytm…). */
export function upiLink(settings, bill) {
  const upi = clean(settings?.upi_id);
  if (!upi || !bill?.amount_due) return null;
  const params = new URLSearchParams({
    pa: upi,
    pn: clean(settings?.boutique_name) || "Fab_art Studio",
    am: String(bill.amount_due),
    cu: "INR",
    tn: `Bill ${bill.bill_number}`,
  });
  return `upi://pay?${params.toString()}`;
}

export async function upiQrDataUrl(link, size = 220) {
  if (!link) return null;
  return QRCode.toDataURL(link, { width: size, margin: 1, errorCorrectionLevel: "M" });
}

/** Plain-text bill for a WhatsApp message. */
export function billMessage(bill, settings, t, locale) {
  const lines = bill.lines
    .map((line) => {
      const design = clean(line.what_to_design) || "—";
      return `• #${line.order_number || line.order_id} ${design}: ${formatMoney(line.final_total, locale)}`;
    })
    .join("\n");
  let text = t("bills.waMessage", {
    name: bill.customer.name,
    number: bill.bill_number,
    boutique: clean(settings?.boutique_name) || "Fab_art Studio",
    lines,
    due: formatMoney(bill.amount_due, locale),
  });
  if (clean(settings?.upi_id) && bill.amount_due > 0) {
    text += t("bills.waPaid", { upi: clean(settings.upi_id) });
  }
  return text;
}

export function whatsappLink(phone, text) {
  const digits = String(phone || "").replace(/\D/g, "");
  const number = digits.length === 10 ? `91${digits}` : digits;
  const base = number ? `https://wa.me/${number}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

/* ---------------- Bill picture (PNG) for sharing ---------------- */

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

/**
 * Draws the bill as a phone-friendly picture and returns a PNG File.
 * Uses the page's own fonts so Hindi text renders correctly.
 */
export async function billImageFile(bill, settings, t, locale) {
  await document.fonts?.ready;
  const font = getComputedStyle(document.body).fontFamily;
  const W = 900;
  const pad = 56;
  const rowH = 64;
  const link = upiLink(settings, bill);
  const qr = link ? await loadImage(await upiQrDataUrl(link, 360)) : null;

  const extraRows = (bill.discount ? 1 : 0) + 3;
  const H = 360 + bill.lines.length * rowH + extraRows * 52 + (qr ? 420 : 40) + 120;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Paper
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#8c5d4c";
  ctx.fillRect(0, 0, W, 14);

  let y = 92;
  const logo = await loadImage("/brand/mark.png").catch(() => null); // no logo is fine
  const textX = logo ? pad + 128 : pad;
  if (logo) ctx.drawImage(logo, pad - 8, 36, 116, 116);
  ctx.fillStyle = "#111b21";
  ctx.font = `700 44px ${font}`;
  ctx.fillText(fitText(ctx, clean(settings?.boutique_name) || "Fab_art Studio", W - pad - textX), textX, y);
  ctx.font = `400 24px ${font}`;
  ctx.fillStyle = "#667781";
  const contact = [clean(settings?.phone), clean(settings?.address)].filter(Boolean).join(" · ");
  if (contact) {
    y += 40;
    ctx.fillText(fitText(ctx, contact, W - pad - textX), textX, y);
  }
  if (logo) y = Math.max(y, 150);

  // Bill number / date / customer
  y += 64;
  ctx.fillStyle = "#111b21";
  ctx.font = `600 28px ${font}`;
  ctx.fillText(`${t("bills.number")} ${bill.bill_number}`, pad, y);
  ctx.textAlign = "right";
  ctx.font = `400 26px ${font}`;
  ctx.fillText(formatDate(bill.issued_on, locale), W - pad, y);
  ctx.textAlign = "left";
  y += 44;
  ctx.fillStyle = "#3b4a54";
  ctx.font = `400 28px ${font}`;
  ctx.fillText(`${t("bills.customer")}: ${bill.customer.name}`, pad, y);

  // Lines
  y += 34;
  ctx.strokeStyle = "#e9edef";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(W - pad, y);
  ctx.stroke();
  for (const line of bill.lines) {
    y += rowH;
    ctx.fillStyle = "#8a5644";
    ctx.font = `600 24px ${font}`;
    ctx.fillText(`#${line.order_number || line.order_id}`, pad, y - 18);
    ctx.fillStyle = "#111b21";
    ctx.font = `400 26px ${font}`;
    ctx.fillText(fitText(ctx, clean(line.what_to_design) || "—", W - pad * 2 - 260), pad + 150, y - 18);
    ctx.textAlign = "right";
    ctx.font = `600 28px ${font}`;
    ctx.fillText(formatMoney(line.final_total, locale), W - pad, y - 18);
    ctx.textAlign = "left";
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(W - pad, y);
    ctx.stroke();
  }

  // Totals
  const total = (label, value, strong = false) => {
    y += strong ? 64 : 52;
    ctx.fillStyle = strong ? "#111b21" : "#3b4a54";
    ctx.font = `${strong ? 700 : 400} ${strong ? 36 : 26}px ${font}`;
    ctx.fillText(label, pad, y);
    ctx.textAlign = "right";
    ctx.fillText(value, W - pad, y);
    ctx.textAlign = "left";
  };
  total(t("bills.subtotal"), formatMoney(bill.subtotal, locale));
  if (bill.discount) total(t("pay.discount"), `− ${formatMoney(bill.discount, locale)}`);
  total(t("bills.lessAdvance"), `− ${formatMoney(bill.advance_total, locale)}`);
  total(t("bills.amountDue"), formatMoney(bill.amount_due, locale), true);

  // QR
  if (qr) {
    y += 40;
    const size = 300;
    ctx.drawImage(qr, (W - size) / 2, y, size, size);
    y += size + 44;
    ctx.textAlign = "center";
    ctx.fillStyle = "#3b4a54";
    ctx.font = `400 24px ${font}`;
    ctx.fillText(t("bills.scanToPay"), W / 2, y);
    y += 34;
    ctx.fillText(clean(settings.upi_id), W / 2, y);
    ctx.textAlign = "left";
  }

  // Footer
  y += 64;
  ctx.textAlign = "center";
  ctx.fillStyle = "#111b21";
  ctx.font = `600 28px ${font}`;
  ctx.fillText(clean(settings?.bill_note) || t("bills.thanks"), W / 2, Math.min(y, H - 40));
  ctx.textAlign = "left";

  // Trim the unused space at the bottom.
  const finalHeight = Math.min(H, Math.ceil(y + 48));
  const trimmed = document.createElement("canvas");
  trimmed.width = W;
  trimmed.height = finalHeight;
  trimmed.getContext("2d").drawImage(canvas, 0, 0);

  const blob = await new Promise((resolve) => trimmed.toBlob(resolve, "image/png"));
  return new File([blob], `${bill.bill_number}.png`, { type: "image/png" });
}

/** Shares the bill picture (phone share sheet) or downloads it. */
export async function shareBillImage(bill, settings, t, locale) {
  const file = await billImageFile(bill, settings, t, locale);
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: bill.bill_number });
      return "shared";
    } catch (err) {
      if (err?.name === "AbortError") return "cancelled"; // closed the share sheet
      // Sharing not allowed here: fall back to saving the picture.
    }
  }
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
