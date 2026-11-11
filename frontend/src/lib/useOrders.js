"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getCachedOrders, getOrders, subscribeOrders } from "./api";

/**
 * Shared orders list. Shows cached orders instantly (so moving between
 * screens on a phone feels quick) and refreshes them in the background.
 */
export function useOrders() {
  const cached = useSyncExternalStore(
    subscribeOrders,
    getCachedOrders,
    () => null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async (force = true) => {
    setLoading(true);
    setError(null);
    try {
      await getOrders({ force });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // First load (or background refresh if the cache is old).
  useEffect(() => {
    let cancelled = false;
    getOrders().catch((err) => {
      if (!cancelled) setError(err);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    orders: cached ?? [],
    ready: cached !== null,
    loading,
    error,
    reload,
  };
}
