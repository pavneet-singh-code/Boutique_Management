// All calls to the FastAPI backend go through here.
// Errors thrown use translation keys ("error.network", "error.session")
// when we know the cause, so the UI can show them in Hindi or English.

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

const TOKEN_KEY = "fab_art_token";

export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function logout() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
  invalidateOrders();
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
    throw error;
  }

  return data;
}

/* ---------------- Auth ---------------- */

export async function login(password) {
  const data = await request("/auth/login", {
    method: "POST",
    body: { password },
    auth: false,
  });
  setToken(data.access_token);
  invalidateOrders();
  return data;
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
  return saved;
}

export async function analyzeOrderPdf(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/analyze-order-pdf", { method: "POST", body: formData });
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
