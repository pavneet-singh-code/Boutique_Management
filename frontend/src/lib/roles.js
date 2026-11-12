"use client";

import { useSyncExternalStore } from "react";
import { getMe, subscribeMe } from "./api";

/**
 * Who may see what in the app. The server checks the same rules on every
 * request; this only decides which buttons and screens to show.
 */
const FEATURES = {
  money: ["owner", "uploader"],
  orders: ["owner", "uploader", "social_media"],
  editOrders: ["owner", "uploader"],
  deleteOrders: ["owner"],
  upload: ["owner", "uploader"],
  customers: ["owner", "uploader"],
  mergeCustomers: ["owner"],
  bills: ["owner", "uploader"],
  makeBills: ["owner"],
  recordPayments: ["owner", "uploader"],
  reports: ["owner", "uploader"],
  export: ["owner", "uploader"],
  dataCheck: ["owner", "uploader"],
  team: ["owner"],
  backup: ["owner"],
  boutiqueSettings: ["owner"],
  allActivity: ["owner"],
  myWork: ["worker"],
};

export const ROLES = ["owner", "uploader", "worker", "social_media"];

export function can(role, feature) {
  return Boolean(role && FEATURES[feature]?.includes(role));
}

/** First screen after logging in. */
export function homeFor(role) {
  if (role === "worker") return "/my-work";
  if (role === "social_media") return "/orders";
  return "/dashboard";
}

/** The logged-in employee (null while unknown / logged out). */
export function useMe() {
  return useSyncExternalStore(subscribeMe, getMe, () => null);
}

/** Shortcut: can the logged-in person use this feature? */
export function useCan(feature) {
  const me = useMe();
  return can(me?.role, feature);
}
