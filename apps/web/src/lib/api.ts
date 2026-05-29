import { useEffect, useState } from 'react';

// Tiny SWR-lite. We don't need full SWR in v1 — just a fetch + cache + revalidate
// pattern that survives navigation. Replace with TanStack Query later if/when
// we hit cache invalidation pain.

const cache = new Map<string, unknown>();
const subs = new Map<string, Set<() => void>>();

const notify = (key: string) => subs.get(key)?.forEach((fn) => fn());

export function setCache<T>(key: string, value: T) {
  cache.set(key, value);
  notify(key);
}

export function invalidate(prefix: string) {
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
  for (const k of subs.keys()) if (k.startsWith(prefix)) notify(k);
}

export function useApi<T>(key: string | null, fetcher: (k: string) => Promise<T>) {
  const [data, setData] = useState<T | null>(() => (key ? ((cache.get(key) as T | undefined) ?? null) : null));
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!key) return;
    const sub = () => setData((cache.get(key) as T | undefined) ?? null);
    let set = subs.get(key);
    if (!set) {
      set = new Set();
      subs.set(key, set);
    }
    set.add(sub);

    let cancelled = false;
    setLoading(true);
    fetcher(key)
      .then((v) => {
        if (cancelled) return;
        cache.set(key, v);
        setData(v);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e as Error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      set!.delete(sub);
    };
    // The fetcher is captured by closure but intentionally NOT a dependency.
    // Callers tend to write `(k) => apiGet(k)` inline, which makes a new
    // function every render — including it in deps creates an infinite
    // fetch→render→fetch loop. The key is the cache identity; that's enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, error, loading };
}

export const apiGet = async <T>(path: string): Promise<T> => {
  const res = await fetch(path, { credentials: 'include' });
  if (!res.ok) throw new Error(await res.text().catch(() => `${res.status}`));
  return (await res.json()) as T;
};

export const apiSend = async <T>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> => {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text().catch(() => `${res.status}`));
  return (await res.json()) as T;
};
