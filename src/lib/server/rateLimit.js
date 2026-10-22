// SIMPLE RATE LIMIT
// Protects paid API keys (Google, Foursquare) from abuse:
// returns 429 when one IP sends more than a set number of requests per minute.
// Note: in a serverless environment each instance has its own memory, so this is a
// best-effort protection; the real safeguards are the quotas and budget limits in Google Cloud.

const buckets = new Map();

export function rateLimit(request, { key, limit, windowMs = 60_000 }) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const id = `${key}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(id);

  if (!bucket || now - bucket.start > windowMs) {
    buckets.set(id, { start: now, count: 1 });
    return { ok: true };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { ok: false, retryAfter: Math.ceil((bucket.start + windowMs - now) / 1000) };

  // Keep memory bounded
  if (buckets.size > 5000) for (const [k, b] of buckets) if (now - b.start > windowMs) buckets.delete(k);
  return { ok: true };
}
