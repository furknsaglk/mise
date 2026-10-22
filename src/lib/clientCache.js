"use client";

// IN-BROWSER SHARED DATA STORE
// Purpose: reuse the result of the same search across tabs (Discover ↔ Day Menu).
//
// Rule: every NEW search (place search, map tap, "my location") creates a new search moment
// (refreshKey) and data is fetched live from the internet again. This store only keeps the result
// of the SAME search, keyed by that search moment — an old search's data is never reused for a new one.
// The store is cleared on page reload.
//
// Identical concurrent requests are collapsed into one (e.g. React's double-invoke in development).

const store = new Map(); // anahtar → Promise<veri>
const MAX_ENTRIES = 40;

export function cachedJson(key, url) {
  const hit = store.get(key);
  if (hit) return hit;

  const promise = fetch(url, { cache: "no-store" }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "İstek başarısız");
    return data;
  });
  // Don't keep failures: retry on the next attempt
  promise.catch(() => store.delete(key));

  store.set(key, promise);
  if (store.size > MAX_ENTRIES) store.delete(store.keys().next().value);
  return promise;
}

// Iterate entries whose key starts with a prefix (e.g. same search, different radii)
export function* cachedEntries(prefix) {
  for (const [key, promise] of store) if (key.startsWith(prefix)) yield [key, promise];
}
