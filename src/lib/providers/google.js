import { distanceKm } from "@/lib/routing/distance";
import tzLookup from "tz-lookup";
import { safeUrl } from "@/lib/url";

// GOOGLE PLACES (New) SOURCE
// Active when GOOGLE_PLACES_API_KEY is set in .env.local / Vercel.
// No cache: fresh data on every search.
//
// COST: rating, hours, price and outdoor-seating fields are in Google's top pricing tier
// (~1,000 free requests/month). So one search = 3 requests (similar courses grouped
// together) and a daily cap of 32 requests is set in Google Cloud: when it is reached Google
// rejects the request and Mise switches to Foursquare for the day — no charges.

const ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";

// 3 requests: [breakfast + coffee], [local bites + drinks], [dinner]
const GROUPS = [
  ["breakfast_restaurant", "brunch_restaurant", "bakery", "coffee_shop", "cafe"],
  ["ice_cream_shop", "dessert_shop", "deli", "sandwich_shop", "food_court", "bar", "wine_bar", "pub"],
  ["restaurant"],
];

// Google place type → Mise course (primary type first, then the other types)
const COURSE_OF = {
  breakfast_restaurant: "breakfast",
  brunch_restaurant: "breakfast",
  bakery: "breakfast",
  coffee_shop: "coffee",
  cafe: "coffee",
  tea_house: "coffee",
  ice_cream_shop: "tasting",
  dessert_shop: "tasting",
  deli: "tasting",
  sandwich_shop: "tasting",
  food_court: "tasting",
  confectionery: "tasting",
  pastry_shop: "tasting",
  cake_shop: "tasting",
  donut_shop: "tasting",
  chocolate_shop: "tasting",
  bagel_shop: "breakfast",
  cocktail_bar: "drinks",
  bar: "drinks",
  wine_bar: "drinks",
  pub: "drinks",
};

// Primary type first; if it is the generic "restaurant", look for a more specific hint in the other types
// (e.g. a place that is both "restaurant" and "breakfast_restaurant" → breakfast).
function classify(place) {
  const primary = place.primaryType;
  if (COURSE_OF[primary]) return COURSE_OF[primary];
  if (primary?.endsWith("_restaurant")) return "dinner"; // e.g. portuguese_restaurant
  const specific = (place.types ?? []).find((t) => COURSE_OF[t]);
  if (specific) return COURSE_OF[specific];
  if (primary === "restaurant" || (place.types ?? []).some((t) => t.endsWith("restaurant"))) return "dinner";
  return null;
}

// Note: reviews and editorialSummary are in the same pricing tier as outdoorSeating (Enterprise + Atmosphere);
// since outdoor seating is already requested, reviews add no extra requests or cost.
const FIELDS = [
  "places.primaryType",
  "places.types",
  "places.reviews",
  "places.editorialSummary",
  "places.googleMapsUri",
  "places.id",
  "places.displayName",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.photos",
  "places.regularOpeningHours",
  "places.primaryTypeDisplayName",
  "places.addressComponents",
  "places.outdoorSeating",
  "places.websiteUri",
].join(",");

const PRICE = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const pad = (n) => String(n).padStart(2, "0");
const hm = (p) => `${pad(p.hour ?? 0)}:${pad(p.minute ?? 0)}`;

// Converts Google's weekly hours into { 0: [{open, close}], … 6: [...] } (0 = Sunday).
function weekHours(opening) {
  if (!opening?.periods?.length) return null;
  const week = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const p of opening.periods) {
    if (!p.close) {
      // A single period without a close time = open 24/7
      for (const d of Object.keys(week)) week[d].push({ open: "00:00", close: "24:00" });
      return week;
    }
    week[p.open.day].push({ open: hm(p.open), close: hm(p.close) });
  }
  return week;
}

function area(components = []) {
  const pick = (type) => components.find((c) => c.types?.includes(type))?.shortText;
  return pick("neighborhood") || pick("sublocality_level_1") || pick("sublocality") || pick("locality") || "";
}

const clip = (text, max) => (text && text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, "")}…` : text);

// Take at most 3 of Google's reviews, shortened, with their attribution.
// (Google requirement: show the review author's name and profile link.)
function reviews(place) {
  return (place.reviews ?? [])
    .map((r) => {
      const text = r.text?.text || r.originalText?.text;
      if (!text) return null;
      return {
        rating: r.rating ?? null,
        text: clip(text.replace(/\s+/g, " ").trim(), 260),
        translated: Boolean(r.originalText?.languageCode && r.text?.languageCode && r.originalText.languageCode !== r.text.languageCode),
        author: r.authorAttribution?.displayName ?? "Google kullanıcısı",
        authorUrl: safeUrl(r.authorAttribution?.uri),
        when: r.relativePublishTimeDescription ?? "",
      };
    })
    .filter(Boolean)
    .slice(0, 3);
}

function toVenue(place, course, center, tz) {
  const photo = place.photos?.[0];
  return {
    id: `g-${place.id}`,
    origin: "google",
    googleId: place.id,
    name: place.displayName?.text ?? "İsimsiz",
    course,
    area: area(place.addressComponents),
    cuisine: place.primaryTypeDisplayName?.text ?? "",
    blurb: place.editorialSummary?.text ?? null,
    reviews: reviews(place),
    mapsUrl: safeUrl(place.googleMapsUri),
    lat: place.location.latitude,
    lng: place.location.longitude,
    tz,
    price: PRICE[place.priceLevel] ?? null,
    hours: null,
    weekHours: weekHours(place.regularOpeningHours),
    hoursText: null,
    ratings: place.rating ? { google: { rating: place.rating, count: place.userRatingCount ?? 0 } } : {},
    // Each photo is a separate paid request: not in the list, only loaded when the card is opened
    photo: null,
    photoDetail: photo ? `/api/photo?name=${encodeURIComponent(photo.name)}` : null,
    photoCredit: photo?.authorAttributions?.[0]?.displayName ?? null,
    website: safeUrl(place.websiteUri),
    terrace: place.outdoorSeating === true,
    cozy: false,
    prominence: 0,
    distanceKm: distanceKm(center, { lat: place.location.latitude, lng: place.location.longitude }),
  };
}

async function searchGroup(types, center, radiusKm, apiKey) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELDS },
    cache: "no-store",
    body: JSON.stringify({
      includedTypes: types,
      maxResultCount: 20,
      rankPreference: "POPULARITY",
      languageCode: "tr",
      locationRestriction: {
        circle: { center: { latitude: center.lat, longitude: center.lng }, radius: Math.min(radiusKm * 1000, 50000) },
      },
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Google Places ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.places ?? [];
}

export async function searchGoogleVenues({ lat, lng, radiusKm }, apiKey) {
  const center = { lat, lng };
  const tz = tzLookup(lat, lng);
  const results = await Promise.allSettled(GROUPS.map((types) => searchGroup(types, center, radiusKm, apiKey)));

  results.filter((r) => r.status === "rejected").forEach((r) => console.error(r.reason?.message));
  if (results.every((r) => r.status === "rejected")) throw new Error("No results from Google Places");

  // If the same place appears in two groups, take it once; determine its course from its Google type
  const seen = new Set();
  return results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((p) => !seen.has(p.id) && seen.add(p.id))
    // Gastronomy guide: independent venues, not hotel bars/restaurants
    .filter((p) => !(p.types ?? []).some((t) => t === "lodging" || t === "hotel"))
    .map((p) => {
      const course = classify(p);
      return course ? toVenue(p, course, center, tz) : null;
    })
    .filter(Boolean);
}

// Photo name validation (for api/photo)
export const isGooglePhotoName = (name) => /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(name);
