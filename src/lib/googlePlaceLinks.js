"use client";

// GOOGLE PLACE ID MATCHES (in the browser, localStorage)
// Google's terms forbid storing Places content (rating, reviews, name, hours…); the only exception
// is the place ID, which may be stored indefinitely. ONLY two IDs are stored here:
//   Mise venue ID (e.g. Foursquare "fsq-…")  →  Google place ID ("ChIJ…")
// When the Google search quota is exhausted, this match opens Google's own card (Places UI Kit);
// Google renders the rating and reviews live at that moment.

const KEY = "mise:google-place-ids:v1";
const MAX = 3000; // oldest entries are dropped

let cache = null;

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    cache = {};
  }
  return cache;
}

const isPlaceId = (id) => typeof id === "string" && /^[A-Za-z0-9_-]{10,300}$/.test(id);

export function rememberPlaceLinks(links = []) {
  if (!links.length) return;
  const map = load();
  let changed = false;
  for (const { venue, place } of links) {
    if (venue && isPlaceId(place) && map[venue] !== place) {
      delete map[venue]; // re-insert so it counts as the newest entry
      map[venue] = place;
      changed = true;
    }
  }
  if (!changed) return;
  const keys = Object.keys(map);
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX))) delete map[k];
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // If storage is full or in a private window, it only lasts for this session
  }
}

// A venue's Google ID: its own if it came from Google, otherwise the stored match
export function googlePlaceIdFor(venue) {
  if (!venue) return null;
  if (isPlaceId(venue.googleId)) return venue.googleId;
  if (typeof window === "undefined") return null;
  const id = load()[venue.id];
  return isPlaceId(id) ? id : null;
}
