import { NextResponse } from "next/server";

// Real walking route (OSRM foot profile, OpenStreetMap Germany server — free)
//   GET /api/route?points=lng,lat;lng,lat;...
// Response: street-level polyline + real distance and duration of every leg.
const OSRM_FOOT = "https://routing.openstreetmap.de/routed-foot/route/v1/driving";

export async function GET(request) {
  const points = new URL(request.url).searchParams.get("points") ?? "";
  const valid = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?(;-?\d+(\.\d+)?,-?\d+(\.\d+)?){1,24}$/.test(points);
  if (!valid) return NextResponse.json({ error: "Geçersiz nokta listesi" }, { status: 400 });

  try {
    const res = await fetch(`${OSRM_FOOT}/${points}?overview=full&geometries=geojson`, {
      headers: { "User-Agent": "Mise/0.1 (gastronomy route planner prototype)" },
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (data.code !== "Ok") throw new Error(data.code);

    const route = data.routes[0];
    return NextResponse.json({
      // Leaflet [lat, lng] bekler; OSRM [lng, lat] verir
      line: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      legs: route.legs.map((leg) => ({ km: leg.distance / 1000, minutes: Math.max(1, Math.round(leg.duration / 60)) })),
    });
  } catch {
    return NextResponse.json({ error: "Rota servisine ulaşılamadı" }, { status: 502 });
  }
}
