"use client";

import { useEffect, useState } from "react";
import { cached } from "@/lib/clientCache";
import { loadWeather } from "@/lib/dataClient";

// Hourly weather + sunrise/sunset for the selected place and date.
// A fresh forecast is fetched for every new search (refreshKey); within the same search,
// switching tabs reuses the shared in-memory result.
export default function useWeather(center, date, refreshKey) {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    if (!center) return;
    let cancelled = false;
    const key = `weather|${center.lat.toFixed(4)},${center.lng.toFixed(4)}|${date ?? "now"}|${refreshKey ?? 0}`;

    cached(key, () => loadWeather({ lat: center.lat, lng: center.lng, date }))
      .then((data) => !cancelled && setWeather(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [center?.lat, center?.lng, date, refreshKey]);

  return weather;
}
