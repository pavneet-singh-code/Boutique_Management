"use client";

// Small pop-up notifications ("Order 261103 added"). Kept outside React so a
// notification shown just before moving to another screen still appears there.

let current = null; // { id, title, body, href, linkLabel }
let nextId = 0;
let timer = null;
const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToast(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToast() {
  return current;
}

/** Shows a notification for a few seconds. */
export function showToast({ title, body, href, linkLabel, duration = 5000 }) {
  nextId += 1;
  current = { id: nextId, title, body, href, linkLabel };
  clearTimeout(timer);
  timer = setTimeout(hideToast, duration);
  emit();
}

export function hideToast() {
  clearTimeout(timer);
  current = null;
  emit();
}
