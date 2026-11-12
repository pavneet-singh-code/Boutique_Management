"use client";

import { useCallback, useEffect, useState } from "react";

// Last data seen for each `cacheKey`, so going back to a screen shows it
// straight away (then quietly refreshes) instead of a spinner.
const cache = new Map();

export function clearResourceCache() {
  cache.clear();
}

/**
 * Loads data for a screen (a customer, a bill, the customers list…).
 * `loader` must be stable (wrap it in useCallback or define it outside).
 * `cacheKey` (optional) remembers the result between visits.
 */
export function useResource(loader, enabled = true, cacheKey = null) {
  const [data, setDataState] = useState(() => (cacheKey && cache.has(cacheKey) ? cache.get(cacheKey) : null));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const setData = useCallback(
    (value) => {
      setDataState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        if (cacheKey) cache.set(cacheKey, next);
        return next;
      });
    },
    [cacheKey]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loader();
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loader, setData]);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    loader()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, [loader, enabled, setData]);

  return { data, setData, error, loading, reload, ready: data !== null };
}
