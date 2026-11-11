// Helpers for the messy, hand-written order data (mixed date formats,
// "UNCLEAR" placeholders from the scanner, amounts like "8,000").

export function isUnclear(value) {
  return String(value ?? "").trim().toUpperCase() === "UNCLEAR";
}

/** Returns a trimmed string, or "" for empty / "UNCLEAR" values. */
export function clean(value) {
  if (value == null) return "";
  const text = String(value).trim();
  return isUnclear(text) ? "" : text;
}

function buildDate(year, month, day) {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Parses YYYY-MM-DD, DD/MM/YYYY and DD/MM/YY into a local Date (or null). */
export function parseDate(value) {
  const text = clean(value);
  if (!text) return null;

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return buildDate(+match[1], +match[2], +match[3]);

  match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (match) {
    let year = +match[3];
    if (match[3].length === 2) year += 2000;
    return buildDate(year, +match[2], +match[1]);
  }
  return null;
}

export function pad(n) {
  return String(n).padStart(2, "0");
}

export function toISODate(value) {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function monthKeyOf(date) {
  return date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}` : null;
}

/** The date an order "belongs" to: its order date, else when it was saved. */
export function orderDate(order) {
  return parseDate(order.order_date) || parseDate(order.created_at);
}

export function orderMonthKey(order) {
  return monthKeyOf(orderDate(order));
}

export function currentMonthKey() {
  return monthKeyOf(new Date());
}

export function shiftMonth(key, delta) {
  const [y, m] = key.split("-").map(Number);
  return monthKeyOf(new Date(y, m - 1 + delta, 1));
}

export function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86_400_000);
}

/** Parses "₹8,000" / "8000" into a number, or null if not a number. */
export function amount(value) {
  const text = clean(value).replace(/[₹,\s]|rs\.?|\/-/gi, "");
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

/* ---------------- Money: three-step payments ---------------- */
// 1. advance_amount (+ advance_date)  2. final_total on a bill (+ billed_date)
// 3. final_payment_amount (+ final_payment_date). The server works out
// received / balance / payment_state.

/** The final total once billed, otherwise the estimate from the order form. */
export function orderValue(order) {
  return order.final_total ?? amount(order.estimated_total) ?? null;
}

export function balanceOf(order) {
  return order.balance ?? null;
}

export function receivedOf(order) {
  return order.received ?? (amount(order.advance_amount) ?? 0);
}

/** Money that actually arrived between two dates (by payment dates). */
export function receivedBetween(orders, from, to) {
  let total = 0;
  const inRange = (value) => {
    const date = parseDate(value);
    return date && date >= from && date <= to;
  };
  for (const order of orders) {
    if (order.advance_amount && inRange(order.advance_date)) total += order.advance_amount;
    if (order.final_payment_amount && inRange(order.final_payment_date)) {
      total += order.final_payment_amount;
    }
  }
  return total;
}

export function monthRange(key) {
  const [y, m] = key.split("-").map(Number);
  return [new Date(y, m - 1, 1), new Date(y, m, 0, 23, 59, 59)];
}

export function formatMoney(value, locale = "en-IN") {
  if (value == null) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value, locale = "en-IN", options) {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return clean(value) || "—";
  return date.toLocaleDateString(
    locale,
    options || { day: "numeric", month: "short", year: "numeric" }
  );
}

export function formatMonth(key, locale = "en-IN", short = false) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(locale, {
    month: short ? "short" : "long",
    year: "numeric",
  });
}

/** "Today" / "Tomorrow" / weekday / short date, like a chat list. */
export function friendlyDate(value, t, locale) {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return clean(value) || "";
  const diff = daysBetween(new Date(), date);
  if (diff === 0) return t("common.today");
  if (diff === 1) return t("common.tomorrow");
  if (diff === -1) return t("common.yesterday");
  if (diff > 1 && diff < 7) {
    return date.toLocaleDateString(locale, { weekday: "long" });
  }
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "2-digit" }),
  });
}

/* ---------------- Customers ---------------- */

export function customerKey(name) {
  return clean(name)
    .toLowerCase()
    .replace(/['’`]s\b/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/** The customer's saved name, else the name written on the order. */
export function rawName(order) {
  return clean(order.customer?.name) || clean(order.customer_name);
}

export function displayName(order, t) {
  return rawName(order) || t("common.unknownCustomer");
}

/** Seed for the avatar colour: the customer record if there is one. */
export function avatarSeed(order) {
  return order.customer_id ? `c${order.customer_id}` : customerKey(order.customer_name);
}

export function customerPhone(order) {
  return clean(order.customer?.phone) || clean(order.contact_number);
}

/** Groups orders by customer record (for reports such as "top customers"). */
export function groupCustomers(orders) {
  const map = new Map();
  for (const order of orders) {
    if (!order.customer_id) continue;
    if (!map.has(order.customer_id)) {
      map.set(order.customer_id, {
        id: order.customer_id,
        key: `c${order.customer_id}`,
        name: rawName(order),
        orders: [],
        total: 0,
      });
    }
    const customer = map.get(order.customer_id);
    customer.orders.push(order);
    customer.total += orderValue(order) ?? 0;
  }
  return [...map.values()];
}

/** Rough "same person?" check for customer names (Manjot / Manjoot). */
export function similarNames(a, b) {
  const x = customerKey(a);
  const y = customerKey(b);
  if (!x || !y || x === y) return x === y && Boolean(x);
  const shorter = Math.min(x.length, y.length);
  const longer = Math.max(x.length, y.length);
  // "gaganpreet" / "gaganpreets" yes; "simran" / "simransmother" no.
  if (shorter >= 4 && shorter / longer >= 0.6 && (x.startsWith(y) || y.startsWith(x))) return true;
  return editDistance(x, y) <= (Math.max(x.length, y.length) >= 7 ? 2 : 1);
}

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

/* ---------------- Avatars ---------------- */

const AVATAR_COLORS = [
  ["#dff3e9", "#0a7a4b"],
  ["#e3ecfb", "#2f5fb3"],
  ["#fbe7e1", "#b4482b"],
  ["#f3e6fa", "#8a3fb5"],
  ["#fff0d6", "#9a6400"],
  ["#e0f4f6", "#127784"],
  ["#fbe3ee", "#b3326b"],
  ["#ebeef0", "#4b5a64"],
];

export function avatarColors(seed) {
  let hash = 0;
  for (const char of String(seed || "")) {
    hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function initials(name) {
  const words = clean(name)
    .replace(/[()'’]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  const letters =
    words.length === 1 ? [words[0][0]] : [words[0][0], words[1][0]];
  return letters.join("").toUpperCase();
}

/** Digits only, with India's country code added when missing. */
export function phoneForLinks(value) {
  const digits = clean(value).replace(/[^\d+]/g, "");
  if (digits.replace("+", "").length < 8) return null;
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/* ---------------- Filtering & totals ---------------- */

export function searchText(order) {
  return [
    order.order_number,
    order.customer?.name,
    order.customer_name,
    order.contact_number,
    order.what_to_design,
    order.additional_info,
    order.filename,
  ]
    .map(clean)
    .join(" ")
    .toLowerCase();
}

export function summarise(orders) {
  let value = 0;
  let received = 0;
  let balance = 0;
  let review = 0;
  let unbilled = 0;
  for (const order of orders) {
    value += orderValue(order) ?? 0;
    received += receivedOf(order);
    if (order.payment_state === "billed") balance += order.balance ?? 0;
    if (!order.bill_id) unbilled += 1;
    if (order.needs_review) review += 1;
  }
  // `advance` kept for older screens: money received so far.
  return { count: orders.length, value, received, advance: received, balance, review, unbilled };
}
