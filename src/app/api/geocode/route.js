import { NextResponse } from "next/server";
import { photonSearch, photonReverse } from "@/lib/services/photon";

// Place search (Photon / OpenStreetMap — free, no API key)
//   GET /api/geocode?q=Kadıköy Moda        → suggestions matching the typed text
//   GET /api/geocode?lat=40.98&lng=29.02   → readable name of a point picked on the map
const HEADERS = { "User-Agent": "Mise/0.1 (gastronomy route planner)" };
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!q && !(Number.isFinite(lat) && Number.isFinite(lng))) {
    return NextResponse.json({ error: "q ya da lat/lng gerekli" }, { status: 400 });
  }

  try {
    const places = q ? await photonSearch(q, { headers: HEADERS }) : await photonReverse(lat, lng, { headers: HEADERS });
    return NextResponse.json({ places }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ places: [], error: "Konum servisine ulaşılamadı" }, { status: 502 });
  }
}
