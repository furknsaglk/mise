"use client";

import { useEffect, useState } from "react";
import { cachedJson } from "@/lib/clientCache";

// Hourly weather + sunrise/sunset for the selected place and date.
// A fresh forecast is fetched for every new search (refreshKey); within the same search,
// switching tabs reuses the shared in-memory result.
export default function useWeather(center, date, refreshKey) {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    if (!center) return;
    let cancelled = false;
    const params = new URLSearchParams({ lat: center.lat, lng: center.lng });
    if (date) params.set("date", date);
    const key = `weather|${center.lat.toFixed(4)},${center.lng.toFixed(4)}|${date ?? "now"}|${refreshKey ?? 0}`;

    cachedJson(key, `/api/weather?${params}`)
      .then((data) => !cancelled && setWeather(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [center?.lat, center?.lng, date, refreshKey]);

  return weather;
}
