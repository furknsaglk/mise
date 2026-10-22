// Place search via Photon (komoot, OpenStreetMap data) — free, no API key, CORS-enabled.
// Shared by the /api/geocode route (server) and the static demo build (browser).

const PHOTON = "https://photon.komoot.io";

export function toPlace(feature) {
  const p = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const parts = [p.name, p.district, p.city, p.state, p.country].filter(Boolean);
  const unique = parts.filter((part, i) => parts.indexOf(part) === i);
  return {
    id: `${p.osm_type}${p.osm_id}`,
    name: unique[0] ?? "Seçilen nokta",
    detail: unique.slice(1, 3).join(", "),
    label: unique.slice(0, 2).join(", "),
    type: p.type,
    lat,
    lng,
  };
}

async function photon(path, { signal, headers } = {}) {
  const res = await fetch(`${PHOTON}${path}`, { headers, cache: "no-store", signal: signal ?? AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const data = await res.json();
  return data.features.map(toPlace);
}

// Suggestions for the typed text (at most 6)
export function photonSearch(query, options) {
  const q = query?.trim() ?? "";
  if (q.length < 2) return Promise.resolve([]);
  return photon(`/api/?q=${encodeURIComponent(q)}&limit=6`, options);
}

// Readable name of a coordinate
export function photonReverse(lat, lng, options) {
  return photon(`/reverse?lat=${lat}&lon=${lng}&limit=1`, options);
}
