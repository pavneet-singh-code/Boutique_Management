"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Loads data for a screen (a customer, a bill, the customers list…).
 * `loader` must be stable (wrap it in useCallback or define it outside).
 */
export function useResource(loader, enabled = true) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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
  }, [loader]);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    loader()
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, [loader, enabled]);

  return { data, setData, error, loading, reload, ready: data !== null };
}
