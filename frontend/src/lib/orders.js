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

export function balanceOf(order) {
  const total = amount(order.total_amount);
  if (total == null) return null;
  return Math.max(0, total - (amount(order.advance_payment) ?? 0));
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

export function displayName(order, t) {
  return clean(order.customer_name) || t("common.unknownCustomer");
}

/** Groups orders into customers by a normalised name. */
export function groupCustomers(orders) {
  const map = new Map();

  for (const order of orders) {
    const key = customerKey(order.customer_name) || "unknown";
    if (!map.has(key)) {
      map.set(key, { key, names: new Map(), orders: [], total: 0, contact: "" });
    }
    const customer = map.get(key);
    const name = clean(order.customer_name);
    if (name) customer.names.set(name, (customer.names.get(name) || 0) + 1);
    customer.orders.push(order);
    customer.total += amount(order.total_amount) ?? 0;
    const phone = clean(order.contact_number);
    if (phone && !customer.contact) customer.contact = phone;
  }

  return [...map.values()].map((customer) => {
    const sorted = [...customer.orders].sort(
      (a, b) => (orderDate(b)?.getTime() ?? 0) - (orderDate(a)?.getTime() ?? 0)
    );
    const name =
      [...customer.names.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    return {
      key: customer.key,
      name,
      orders: sorted,
      total: customer.total,
      contact: customer.contact,
      lastOrder: sorted[0],
      lastDate: orderDate(sorted[0]),
    };
  });
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
  let advance = 0;
  let balance = 0;
  let review = 0;
  for (const order of orders) {
    value += amount(order.total_amount) ?? 0;
    advance += amount(order.advance_payment) ?? 0;
    balance += balanceOf(order) ?? 0;
    if (order.needs_review) review += 1;
  }
  return { count: orders.length, value, advance, balance, review };
}
