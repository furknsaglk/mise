"use client";

import { useEffect, useState } from "react";

// Fetches the real walking route between stops.
// Returns null if the service is unreachable; the app falls back to straight-line estimates.
export default function useWalkingRoute(points) {
  const [route, setRoute] = useState(null);
  const key = points.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(";");

  useEffect(() => {
    setRoute(null);
    if (points.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/route?points=${key}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => data?.line && setRoute({ ...data, key }))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Never show a stale route after the stops have changed
  return route?.key === key ? route : null;
}
