import { NextResponse } from "next/server";
import { fetchWalkingRoute, isValidPointList } from "@/lib/services/osrm";

// Real walking route (OSRM foot profile, OpenStreetMap Germany server — free)
//   GET /api/route?points=lng,lat;lng,lat;...
// Response: street-level polyline + real distance and duration of every leg.
export async function GET(request) {
  const points = new URL(request.url).searchParams.get("points") ?? "";
  if (!isValidPointList(points)) return NextResponse.json({ error: "Geçersiz nokta listesi" }, { status: 400 });

  try {
    const route = await fetchWalkingRoute(points, { headers: { "User-Agent": "Mise/0.1 (gastronomy route planner)" } });
    return NextResponse.json(route);
  } catch {
    return NextResponse.json({ error: "Rota servisine ulaşılamadı" }, { status: 502 });
  }
}
