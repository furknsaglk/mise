import tzLookup from "tz-lookup";
import { distanceKm } from "@/lib/routing/distance";
import { safeUrl } from "@/lib/url";

// FOURSQUARE SOURCE
// Active when FOURSQUARE_API_KEY is set in .env.local / Vercel.
//  • Standalone: one search per course type → real venues (rated, with photos and hours in premium mode)
//  • With Google: added to Google venues as a second rating ("Verified" badge)
// Uses Foursquare's 2025 Places API. No cache: fresh data on every search.
//
// Two modes:
//  • Free (default): name, location, category + Foursquare's real POPULARITY ranking.
//  • Premium (FOURSQUARE_PREMIUM=1, requires credits on the Foursquare account): + rating, review count,
//    price, weekly hours, photo, website.

const ENDPOINT = "https://places-api.foursquare.com/places/search";
const API_VERSION = "2025-06-17";
const PREMIUM = process.env.FOURSQUARE_PREMIUM === "1";
const FREE_FIELDS = "fsq_place_id,name,latitude,longitude,categories,location,chains";
const PER_COURSE = 25;

// Gastronomy guide: filter out chains and non-food places (supermarkets, hotels…)
const NOT_A_FOOD_PLACE = /supermarket|grocery|convenience|gas station|hotel|hostel|shopping|department store|pharmacy|kiosk/i;
const isLocalFoodPlace = (p) => !p.chains?.length && !NOT_A_FOOD_PLACE.test((p.categories ?? []).map((c) => c.name).join(" | "));
const FIELDS = PREMIUM ? `${FREE_FIELDS},rating,stats,price,hours,photos,website` : FREE_FIELDS;

// One search term per course (matches Foursquare's own categories)
const QUERIES = {
  breakfast: "breakfast",
  coffee: "coffee",
  tasting: "dessert",
  dinner: "restaurant",
  drinks: "bar",
};

const normalize = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

function headers(apiKey) {
  return { Authorization: `Bearer ${apiKey}`, "X-Places-Api-Version": API_VERSION, Accept: "application/json" };
}

async function search({ lat, lng, radiusKm }, apiKey, query) {
  const params = new URLSearchParams({
    ll: `${lat},${lng}`,
    radius: String(Math.min(Math.round(radiusKm * 1000), 100000)),
    limit: "50",
    sort: "POPULARITY",
    fields: FIELDS,
  });
  if (query) params.set("query", query);
  const res = await fetch(`${ENDPOINT}?${params}`, {
    headers: headers(apiKey),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Foursquare ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  // rank: Foursquare's popularity order (0 = most popular)
  return (data.results ?? []).filter((p) => p.latitude != null && p.longitude != null).map((p, rank) => ({ ...p, rank }));
}

// Course type from Foursquare category names
function classify(categories = []) {
  const names = categories.map((c) => c.name ?? "").join(" | ");
  if (/\b(bar|pub|brewery|wine|cocktail|beer|speakeasy|lounge|taproom)\b/i.test(names)) return "drinks";
  if (/breakfast|brunch|bakery|bagel|pancake|cr[eê]perie|diner/i.test(names)) return "breakfast";
  if (/coffee|caf[eé]|tea room/i.test(names)) return "coffee";
  if (/ice cream|gelato|dessert|pastry|patisserie|chocolate|donut|street food|food truck|market|deli|cheese|sandwich|snack|food court|fast food/i.test(names)) return "tasting";
  if (/restaurant|steakhouse|pizz|trattoria|taverna|bistro|brasserie|grill|sushi|kitchen|eatery|tapas/i.test(names)) return "dinner";
  return null;
}

// Foursquare hours (day 1 = Monday … 7 = Sunday, "0800") → { 0: [{open, close}], … } (0 = Sunday)
function weekHours(hours) {
  if (!hours?.regular?.length) return null;
  const hm = (s) => `${s.replace("+", "").slice(0, 2)}:${s.replace("+", "").slice(2, 4)}`;
  const week = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const r of hours.regular) {
    if (!r.open || !r.close) continue;
    week[r.day % 7].push({ open: hm(r.open), close: r.close === "2400" ? "24:00" : hm(r.close) });
  }
  return week;
}

function photoUrl(photos) {
  const p = photos?.[0];
  return p?.prefix && p?.suffix ? `${p.prefix}480x320${p.suffix}` : null;
}

function toVenue(p, course, center, tz) {
  const loc = p.location ?? {};
  const week = weekHours(p.hours);
  return {
    id: `fsq-${p.fsq_place_id}`,
    origin: "foursquare",
    name: p.name,
    course,
    area: (Array.isArray(loc.neighborhood) ? loc.neighborhood[0] : loc.neighborhood) || loc.locality || "",
    cuisine: p.categories?.[0]?.name ?? "",
    blurb: null,
    lat: p.latitude,
    lng: p.longitude,
    tz,
    price: p.price ?? null,
    hours: null,
    weekHours: week,
    hoursText: week ? null : p.hours?.display ?? null,
    ratings: p.rating ? { foursquare: { rating: p.rating, count: p.stats?.total_ratings ?? 0 } } : {},
    photo: photoUrl(p.photos),
    photoCredit: null,
    website: safeUrl(p.website),
    terrace: false,
    cozy: false,
    // Without a rating, sorting and planning use this signal: the higher in the list, the more popular
    prominence: Math.max(0, 4.4 - (p.rank ?? 0) * 0.09),
    popularityRank: (p.rank ?? 0) + 1,
    distanceKm: distanceKm(center, { lat: p.latitude, lng: p.longitude }),
  };
}

// As a standalone source: parallel search for the 5 courses
export async function searchFoursquareVenues(query, apiKey) {
  const center = { lat: query.lat, lng: query.lng };
  const tz = tzLookup(query.lat, query.lng);
  const results = await Promise.allSettled(Object.values(QUERIES).map((q) => search(query, apiKey, q)));

  results.filter((r) => r.status === "rejected").forEach((r) => console.error(r.reason?.message));
  if (results.every((r) => r.status === "rejected")) throw new Error("No results from Foursquare");

  // If the same venue appears in several searches, keep its best (most popular) rank
  const best = new Map();
  for (const p of results.flatMap((r) => (r.status === "fulfilled" ? r.value : []))) {
    if (!isLocalFoodPlace(p)) continue;
    const prev = best.get(p.fsq_place_id);
    if (!prev || p.rank < prev.rank) best.set(p.fsq_place_id, p);
  }

  // The PER_COURSE most popular venues of each course
  const byCourse = {};
  for (const p of [...best.values()].sort((a, b) => a.rank - b.rank)) {
    // Only look at the primary category (e.g. a cultural center with a café inside stays out)
    const course = classify(p.categories?.slice(0, 1));
    if (!course) continue;
    (byCourse[course] ??= []).length < PER_COURSE && byCourse[course].push(toVenue(p, course, center, tz));
  }
  return Object.values(byCourse).flat();
}

// With Google: adds the Foursquare rating to Google venues (similar name + within 150 m)
export async function enrichWithFoursquare(venues, query, apiKey) {
  if (!PREMIUM) return venues; // rating is a paid field; nothing to add in free mode
  const fsq = (await search(query, apiKey)).filter((p) => p.rating);
  if (!fsq.length) return venues;

  const indexed = fsq.map((p) => ({ ...p, key: normalize(p.name) }));
  return venues.map((v) => {
    const key = normalize(v.name);
    const match = indexed.find(
      (p) =>
        (p.key === key || p.key.includes(key) || key.includes(p.key)) &&
        distanceKm(v, { lat: p.latitude, lng: p.longitude }) < 0.15
    );
    if (!match) return v;
    return {
      ...v,
      ratings: { ...v.ratings, foursquare: { rating: match.rating, count: match.stats?.total_ratings ?? 0 } },
    };
  });
}
