// Sanitizes website URLs coming from external sources (Google, Foursquare, OpenStreetMap):
// only http/https is accepted ("javascript:", "data:" etc. are rejected); protocol-less addresses
// such as "www.example.com" get https added.
export function safeUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
