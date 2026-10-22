import { NextResponse } from "next/server";

// WEATHER (Open-Meteo — free, no API key)
//   GET /api/weather?lat=38.72&lng=-9.14&date=2026-10-22
// Hours are returned in the location's own time zone. The forecast covers ~16 days ahead.
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

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    hourly: "temperature_2m,precipitation_probability,weather_code,cloud_cover",
    daily: "sunrise,sunset",
    current: "temperature_2m,weather_code,is_day",
    timezone: "auto",
  });
  if (date) {
    params.set("start_date", date);
    params.set("end_date", date);
  } else {
    params.set("forecast_days", "1");
  }

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (data.error) {
      return NextResponse.json({ available: false, reason: "Hava tahmini en fazla ~2 hafta ileriyi kapsıyor." }, { headers: NO_STORE });
    }

    const value = {
      available: true,
      fetchedAt: new Date().toISOString(),
      timezone: data.timezone,
      date: data.daily.time[0],
      sunrise: data.daily.sunrise[0].slice(11, 16),
      sunset: data.daily.sunset[0].slice(11, 16),
      current: { temp: data.current.temperature_2m, code: data.current.weather_code, isDay: Boolean(data.current.is_day) },
      hours: data.hourly.time.map((t, i) => ({
        hour: Number(t.slice(11, 13)),
        temp: data.hourly.temperature_2m[i],
        rain: data.hourly.precipitation_probability[i] ?? 0,
        code: data.hourly.weather_code[i],
        cloud: data.hourly.cloud_cover[i],
      })),
    };
    return NextResponse.json(value, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ available: false, reason: "Hava durumu servisine ulaşılamadı." }, { status: 502, headers: NO_STORE });
  }
}
