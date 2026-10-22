"use client";

// Loads the Google Maps JavaScript library ONLY for Places UI Kit — once, and only when needed.
// No Google map is ever created (the app's map is OpenFreeMap) → no "map load" charges.
// The key is a public browser key: on Google's side it is locked to Places UI Kit + Maps JS,
// to Mise's own domain only, and card loads are capped below the free tier with a daily quota.

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
let loading = null;

export const hasGoogleBrowserKey = () => Boolean(KEY);

export function loadPlacesUiKit() {
  if (!KEY) return Promise.reject(new Error("Missing Google browser key"));
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    if (window.google?.maps?.importLibrary) {
      resolve();
      return;
    }
    const callback = "__miseGoogleReady";
    window[callback] = () => resolve();
    const script = document.createElement("script");
    const params = new URLSearchParams({ key: KEY, v: "weekly", loading: "async", language: "tr", callback });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load the Google Maps library"));
    document.head.appendChild(script);
  })
    .then(() => window.google.maps.importLibrary("places"))
    .catch((err) => {
      loading = null; // sonraki denemede tekrar dene
      throw err;
    });

  return loading;
}
