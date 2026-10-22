import { NextResponse } from "next/server";
import { fetchForecast, WEATHER_UNAVAILABLE } from "@/lib/services/openMeteo";

// WEATHER (Open-Meteo — free, no API key)
//   GET /api/weather?lat=38.72&lng=-9.14&date=2026-10-22
// No cache: a fresh forecast is fetched on every request.
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const date = searchParams.get("date");

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (date && !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  try {
    return NextResponse.json(await fetchForecast({ lat, lng, date }), { headers: NO_STORE });
  } catch {
    return NextResponse.json(WEATHER_UNAVAILABLE, { status: 502, headers: NO_STORE });
  }
}
