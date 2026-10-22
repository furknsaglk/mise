// Walking routes via OSRM (foot profile on the FOSSGIS / OpenStreetMap Germany server) — free, CORS-enabled.
// Shared by the /api/route route (server) and the static demo build (browser).

const OSRM_FOOT = "https://routing.openstreetmap.de/routed-foot/route/v1/driving";

// "lng,lat;lng,lat;…" with 2–25 points
export const isValidPointList = (points) => /^-?\d+(\.\d+)?,-?\d+(\.\d+)?(;-?\d+(\.\d+)?,-?\d+(\.\d+)?){1,24}$/.test(points);

export const toPointList = (points) => points.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(";");

// Returns { line: [[lat, lng], …], legs: [{ km, minutes }, …] }. Throws if no route is found.
export async function fetchWalkingRoute(pointList, { signal, headers } = {}) {
  const res = await fetch(`${OSRM_FOOT}/${pointList}?overview=full&geometries=geojson`, {
    headers,
    signal: signal ?? AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (data.code !== "Ok") throw new Error(`OSRM ${data.code}`);

  const route = data.routes[0];
  return {
    // Leaflet expects [lat, lng]; OSRM returns [lng, lat]
    line: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    legs: route.legs.map((leg) => ({ km: leg.distance / 1000, minutes: Math.max(1, Math.round(leg.duration / 60)) })),
  };
}
