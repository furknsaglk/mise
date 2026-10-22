// Straight-line distance between two coordinates (haversine formula), in km.
export function distanceKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Walking routes in cities are ~30% longer than the straight line; average speed 4.8 km/h.
const DETOUR = 1.3;
const WALK_KMH = 4.8;

export function walkingMinutes(km) {
  return Math.max(1, Math.round(((km * DETOUR) / WALK_KMH) * 60));
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m} dk`;
  return m ? `${h} sa ${m} dk` : `${h} sa`;
}

export function formatDistance(km) {
  if (km < 1) return `${Math.round((km * 1000) / 10) * 10} m`;
  return `${km.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} km`;
}
