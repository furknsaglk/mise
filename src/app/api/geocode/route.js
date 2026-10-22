import { NextResponse } from "next/server";

// Place search (Photon / OpenStreetMap — free, no API key)
//   GET /api/geocode?q=Kadıköy Moda        → suggestions matching the typed text
//   GET /api/geocode?lat=40.98&lng=29.02   → readable name of a point picked on the map
const PHOTON = "https://photon.komoot.io";
const HEADERS = { "User-Agent": "Mise/0.1 (gastronomy route planner prototype)" };

function toPlace(feature) {
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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  let url;
  if (q) {
    if (q.length < 2) return NextResponse.json({ places: [] });
    url = `${PHOTON}/api/?q=${encodeURIComponent(q)}&limit=6`;
  } else if (Number.isFinite(lat) && Number.isFinite(lng)) {
    url = `${PHOTON}/reverse?lat=${lat}&lon=${lng}&limit=1`;
  } else {
    return NextResponse.json({ error: "q ya da lat/lng gerekli" }, { status: 400 });
  }

  try {
    const res = await fetch(url, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Photon ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ places: data.features.map(toPlace) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ places: [], error: "Konum servisine ulaşılamadı" }, { status: 502 });
  }
}
