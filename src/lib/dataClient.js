"use client";

import { IS_DEMO } from "@/lib/demo/config";
import { fetchJson } from "@/lib/clientCache";
import { photonSearch, photonReverse } from "@/lib/services/photon";
import { fetchForecast, WEATHER_UNAVAILABLE } from "@/lib/services/openMeteo";
import { fetchWalkingRoute, toPointList } from "@/lib/services/osrm";

// Single place where the browser gets its data.
//  • Normal build: through the app's own /api/* routes (API keys stay on the server).
//  • Static demo build (GitHub Pages, no server): fictional venues are generated locally and the
//    keyless services (Photon, Open-Meteo, OSRM) are called directly from the browser.

export async function loadVenues({ lat, lng, radiusKm }) {
  if (IS_DEMO) {
    const { demoVenues } = await import("@/lib/demo/venues");
    return demoVenues({ lat, lng, radiusKm });
  }
  return fetchJson(`/api/places?${new URLSearchParams({ lat, lng, radius: radiusKm })}`);
}

export async function loadWeather({ lat, lng, date }) {
  if (IS_DEMO) {
    try {
      return await fetchForecast({ lat, lng, date });
    } catch {
      return WEATHER_UNAVAILABLE;
    }
  }
  const params = new URLSearchParams({ lat, lng });
  if (date) params.set("date", date);
  const res = await fetch(`/api/weather?${params}`, { cache: "no-store" });
  return res.json();
}

export async function searchPlaces(query, signal) {
  if (IS_DEMO) return photonSearch(query, { signal });
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, { signal });
  return (await res.json()).places ?? [];
}

export async function reversePlace({ lat, lng }) {
  if (IS_DEMO) return (await photonReverse(lat, lng))[0] ?? null;
  const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
  return (await res.json()).places?.[0] ?? null;
}

// Returns { line, legs } or null (straight-line estimates are used then)
export async function loadWalkingRoute(points, signal) {
  const list = toPointList(points);
  if (IS_DEMO) return fetchWalkingRoute(list, { signal }).catch(() => null);
  const res = await fetch(`/api/route?points=${list}`, { signal });
  return res.ok ? res.json() : null;
}
