// All calls to the FastAPI backend go through here.
// Errors thrown use translation keys ("error.network", "error.session")
// when we know the cause, so the UI can show them in Hindi or English.

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

const TOKEN_KEY = "fab_art_token";
const ME_KEY = "fab_art_me";

// Logins are kept on the device (30 days), so nobody has to log in every
// time they open the app. "Log out everywhere" cancels them on the server.
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function logout() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ME_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
  setMe(null);
  invalidateOrders();
}

/* ---------------- The logged-in employee ---------------- */

const meListeners = new Set();
let meCache;

function readStoredMe() {
  try {
    return JSON.parse(localStorage.getItem(ME_KEY) || "null");
  } catch {
    return null;
  }
}

/** The logged-in employee ({ id, name, role, color, … }) or null. */
export function getMe() {
  if (meCache === undefined) meCache = typeof window === "undefined" ? null : readStoredMe();
  return meCache;
}

function setMe(employee) {
  meCache = employee;
  try {
    if (employee) localStorage.setItem(ME_KEY, JSON.stringify(employee));
  } catch {
    // ignore
  }
  for (const listener of meListeners) listener();
}

export function subscribeMe(listener) {
  meListeners.add(listener);
  return () => meListeners.delete(listener);
}

function sessionExpired() {
  logout();
  if (
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login")
  ) {
    window.location.href = "/login?expired=1";
  }
  return new Error("error.session");
}

function detailMessage(data, status) {
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.detail?.message === "string") return data.detail.message;
  if (Array.isArray(data?.detail)) {
    return data.detail.map((item) => item.msg || "Invalid value").join(", ");
  }
  return status >= 500 ? "error.generic" : `Request failed (${status})`;
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};

  if (auth) {
    const token = getToken();
    if (!token) throw sessionExpired();
    headers.Authorization = `Bearer ${token}`;
  }

  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: payload,
      cache: "no-store",
    });
  } catch {
    throw new Error("error.network");
  }

  if (auth && response.status === 401) throw sessionExpired();

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }

  if (!response.ok) {
    const error = new Error(detailMessage(data, response.status));
    error.status = response.status;
    // e.g. { code: "duplicate_order_numbers", numbers: ["261023"] }
    error.code = data?.detail?.code;
    error.numbers = data?.detail?.numbers ?? [];
    error.minutes = data?.detail?.minutes;
    throw error;
  }

  return data;
}

async function requestFile(path) {
  const token = getToken();
  if (!token) throw sessionExpired();
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    throw new Error("error.network");
  }
  if (response.status === 401) throw sessionExpired();
  if (!response.ok) throw new Error("error.generic");
  const disposition = response.headers.get("content-disposition") || "";
  const fallback = `boutique-backup-${new Date().toISOString().slice(0, 10)}.db`;
  const name = disposition.match(/filename="?([^";]+)"?/)?.[1] || fallback;
  return { blob: await response.blob(), name };
}

/* ---------------- Auth ---------------- */

/** Log in with { phone, pin } or with the owner { password }. */
export async function login(credentials) {
  const data = await request("/auth/login", {
    method: "POST",
    body: typeof credentials === "string" ? { password: credentials } : credentials,
    auth: false,
  });
  setToken(data.access_token);
  setMe(data.employee);
  invalidateOrders();
  return data;
}

/** Refreshes who is logged in (role or name may have changed). */
export async function refreshMe() {
  const me = await request("/auth/me");
  setMe(me);
  return me;
}

export async function updateMyProfile(data) {
  const me = await request("/auth/me", { method: "PATCH", body: data });
  setMe(me);
  return me;
}

export const changeMyPin = (newPin, currentPin) =>
  request("/auth/me/pin", {
    method: "POST",
    body: { new_pin: newPin, current_pin: currentPin || null },
  });

export async function logoutEverywhere() {
  await request("/auth/logout-everywhere", { method: "POST" });
  logout();
}

/* ---------------- Team & activity ---------------- */

export const getEmployees = () => request("/employees");
export const getEmployeeDirectory = () => request("/employees/directory");
export const addEmployee = (data) => request("/employees", { method: "POST", body: data });
export const updateEmployee = (id, data) =>
  request(`/employees/${id}`, { method: "PATCH", body: data });
export const resetEmployeePin = (id, pin) =>
  request(`/employees/${id}/reset-pin`, { method: "POST", body: { pin } });

export function getActivity({ entity, entityId, actorId, beforeId, limit = 50 } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (entity) params.set("entity", entity);
  if (entityId != null) params.set("entity_id", String(entityId));
  if (actorId) params.set("actor_id", String(actorId));
  if (beforeId) params.set("before_id", String(beforeId));
  return request(`/activity?${params.toString()}`);
}

/* ---------------- Orders (with a small in-memory cache) ---------------- */

let ordersCache = null; // { data, time }
let ordersPromise = null;
const listeners = new Set();

function notify() {
  for (const listener of listeners) listener();
}

export function subscribeOrders(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCachedOrders() {
  return ordersCache?.data ?? null;
}

export function invalidateOrders() {
  ordersCache = null;
}

export async function getOrders({ force = false } = {}) {
  if (!force && ordersCache && Date.now() - ordersCache.time < 30_000) {
    return ordersCache.data;
  }
  if (!ordersPromise) {
    ordersPromise = request("/orders")
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        ordersCache = { data: list, time: Date.now() };
        notify();
        return list;
      })
      .finally(() => {
        ordersPromise = null;
      });
  }
  return ordersPromise;
}

function updateCache(mutator) {
  if (!ordersCache) return;
  ordersCache = { data: mutator(ordersCache.data), time: ordersCache.time };
  notify();
}

export async function getOrder(id) {
  return request(`/orders/${id}`);
}

export async function updateOrder(id, orderData) {
  const updated = await request(`/orders/${id}`, {
    method: "PATCH",
    body: orderData,
  });
  updateCache((list) => list.map((o) => (o.id === updated.id ? updated : o)));
  customersCache = null;
  return updated;
}

export async function deleteOrder(id) {
  await request(`/orders/${id}`, { method: "DELETE" });
  updateCache((list) => list.filter((o) => String(o.id) !== String(id)));
}

export async function saveOrders(orders) {
  const saved = await request("/orders/bulk-save", {
    method: "POST",
    body: orders,
  });
  updateCache((list) => [...list, ...saved]);
  customersCache = null; // saving orders can create customers
  return saved;
}

export async function analyzeOrderPdf(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/analyze-order-pdf", { method: "POST", body: formData });
}

/** Problems that block unique order numbers (duplicates, missing numbers…). */
export async function getDataCheck() {
  return request("/orders/data-check");
}

/** Path for an order: its order number when that's unambiguous, else its id. */
export function orderPath(order) {
  const number = order?.order_number;
  if (!number) return `/orders/${order.id}`;
  const list = getCachedOrders() || [];
  const shared = list.filter((item) => item.order_number === number).length > 1;
  return shared
    ? `/orders/${encodeURIComponent(number)}?id=${order.id}`
    : `/orders/${encodeURIComponent(number)}`;
}

/** Edit page path for an order. */
export function orderEditPath(order) {
  const [path, query] = orderPath(order).split("?");
  return query ? `${path}/edit?${query}` : `${path}/edit`;
}

/** Finds the order for a /orders/<key> URL (order number first, then id). */
export function findOrder(orders, key, idParam) {
  if (idParam) return orders.find((o) => String(o.id) === String(idParam));
  const decoded = decodeURIComponent(String(key));
  return (
    orders.find((o) => o.order_number === decoded) ||
    orders.find((o) => String(o.id) === decoded)
  );
}

/* ---------------- Customers ---------------- */

// Customer and bill changes also change orders (customer links, payment
// state), so the orders list is refreshed after each of them.
async function thenRefreshOrders(promise) {
  const result = await promise;
  customersCache = null;
  getOrders({ force: true }).catch(() => {});
  return result;
}

let customersCache = null; // { data, time }

/** All customers with order totals. Cached for 30 seconds. */
export async function getCustomers({ force = false } = {}) {
  if (!force && customersCache && Date.now() - customersCache.time < 30_000) {
    return customersCache.data;
  }
  const data = await request("/customers");
  customersCache = { data, time: Date.now() };
  return data;
}

export function forgetCustomers() {
  customersCache = null;
}
export const getCustomer = (id) => request(`/customers/${id}`);
export const createCustomer = (data) =>
  thenRefreshOrders(request("/customers", { method: "POST", body: data }));
export const updateCustomer = (id, data) =>
  thenRefreshOrders(request(`/customers/${id}`, { method: "PATCH", body: data }));
export const mergeCustomers = (keepId, otherId) =>
  thenRefreshOrders(
    request(`/customers/${keepId}/merge`, { method: "POST", body: { other_id: otherId } })
  );
export const deleteCustomer = (id) => request(`/customers/${id}`, { method: "DELETE" });

/* ---------------- Bills ---------------- */

export function getBills({ customerId, status } = {}) {
  const params = new URLSearchParams();
  if (customerId) params.set("customer_id", customerId);
  if (status) params.set("status", status);
  const query = params.toString();
  return request(`/bills${query ? `?${query}` : ""}`);
}
export const getBill = (id) => request(`/bills/${id}`);
export const createBill = (data) =>
  thenRefreshOrders(request("/bills", { method: "POST", body: data }));
export const updateBill = (id, data) =>
  thenRefreshOrders(request(`/bills/${id}`, { method: "PATCH", body: data }));
export const markBillSent = (id) =>
  thenRefreshOrders(request(`/bills/${id}/sent`, { method: "POST" }));
export const markBillPaid = (id, paidOn) =>
  thenRefreshOrders(
    request(`/bills/${id}/paid`, { method: "POST", body: { paid_on: paidOn || null } })
  );
export const markBillUnpaid = (id) =>
  thenRefreshOrders(request(`/bills/${id}/unpaid`, { method: "POST" }));
export const deleteBill = (id) =>
  thenRefreshOrders(request(`/bills/${id}`, { method: "DELETE" }));

/* ---------------- Boutique settings (name, UPI ID for bills…) ---------------- */

export const getAppSettings = () => request("/settings");
export const saveAppSettings = (data) => request("/settings", { method: "PUT", body: data });

/* ---------------- Backups ---------------- */

/** Downloads a full copy of the database to this device. */
export async function downloadBackup() {
  const { blob, name } = await requestFile("/admin/backup");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}

/* ---------------- Misc ---------------- */

export async function pingServer() {
  const root = API_URL.replace(/\/api\/v1\/?$/, "");
  try {
    const response = await fetch(`${root}/`, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}
