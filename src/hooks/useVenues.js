"use client";

import { useEffect, useState } from "react";
import { cachedJson, cachedEntries } from "@/lib/clientCache";
import { rememberPlaceLinks } from "@/lib/googlePlaceLinks";

const DEBOUNCE_MS = 350;

// Fetches venues from /api/places for the selected center and radius.
//
// Cost safeguards (each Google search costs 3 paid requests):
//  • Same search moment (refreshKey) + same place → no repeated request when switching tabs.
//  • If the radius SHRINKS within the same search, the larger result is filtered — no new request.
//  • Rapid map taps / pin drags: a single request 350 ms after the last movement.
// Every NEW search (new refreshKey) still fetches live data.
export default function useVenues(center, radiusKm, refreshKey) {
  const [state, setState] = useState({ venues: [], sources: [], googleStatus: null, fetchedAt: null, loading: true, error: null });

  useEffect(() => {
    if (!center) return;
    let cancelled = false;
    const prefix = `venues|${center.lat.toFixed(5)},${center.lng.toFixed(5)}|${refreshKey ?? 0}|`;

    const apply = (data, radius) => {
      // Store Google ↔ Foursquare ID matches (IDs only; allowed by Google's terms)
      rememberPlaceLinks(data.links);
      if (cancelled) return;
      const venues = radius < data.radiusKm ? data.venues.filter((v) => v.distanceKm <= radius) : data.venues;
      setState({
        venues,
        sources: data.sources,
        googleStatus: data.googleStatus ?? null,
        fetchedAt: data.fetchedAt,
        loading: false,
        error: null,
      });
    };
    const fail = (err) => !cancelled && setState((s) => ({ ...s, loading: false, error: err.message }));

    // Is there a result with the same or a larger radius for this search?
    const reusable = [...cachedEntries(prefix)]
      .map(([key, promise]) => ({ radius: Number(key.slice(prefix.length)), promise }))
      .filter((e) => e.radius >= radiusKm)
      .sort((a, b) => a.radius - b.radius)[0];

    setState((s) => ({ ...s, loading: true, error: null }));

    if (reusable) {
      reusable.promise.then((data) => apply(data, radiusKm)).catch(fail);
      return () => {
        cancelled = true;
      };
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams({ lat: center.lat, lng: center.lng, radius: radiusKm });
      cachedJson(`${prefix}${radiusKm}`, `/api/places?${params}`)
        .then((data) => apply(data, radiusKm))
        .catch(fail);
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [center?.lat, center?.lng, radiusKm, refreshKey]);

  return state;
}
