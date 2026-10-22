// Weather via Open-Meteo — free, no API key, CORS-enabled.
// Shared by the /api/weather route (server) and the static demo build (browser).
// Hours are returned in the location's own time zone; the forecast covers ~16 days ahead.

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

// Returns { available: true, … } or { available: false, reason } (e.g. date too far ahead).
// Throws on network errors.
export async function fetchForecast({ lat, lng, date }, { signal } = {}) {
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

  const res = await fetch(`${ENDPOINT}?${params}`, { cache: "no-store", signal: signal ?? AbortSignal.timeout(8000) });
  const data = await res.json();
  if (data.error) return { available: false, reason: "Hava tahmini en fazla ~2 hafta ileriyi kapsıyor." };

  return {
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
}

export const WEATHER_UNAVAILABLE = { available: false, reason: "Hava durumu servisine ulaşılamadı." };

// Ground elevation (metres) for up to 100 points in one request. Open sea and large water bodies
// come back as exactly 0, which the demo uses to keep fictional venues on land.
export async function fetchElevations(points, { signal } = {}) {
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat.toFixed(5)).join(","),
    longitude: points.map((p) => p.lng.toFixed(5)).join(","),
  });
  const res = await fetch(`https://api.open-meteo.com/v1/elevation?${params}`, {
    cache: "no-store",
    signal: signal ?? AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return (await res.json()).elevation;
}
