import tzLookup from "tz-lookup";
import { distanceKm } from "@/lib/routing/distance";
import { safeUrl } from "@/lib/url";

// OPENSTREETMAP SOURCE
// Real venue data from anywhere in the world, free and without an API key.
// Note: OSM has no ratings. Ratings come from Google/Foursquare when their keys are set;
// in OSM-only mode venues are ranked by a "prominence" signal.
//
// 1st choice: Overpass (rich data: hours, cuisine, website)
// 2nd choice: Photon (when Overpass is busy; less detail but very fast)

const USER_AGENT = "Mise/0.1 (gastronomy route planner prototype)";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const PER_COURSE = 15;

const AMENITIES = "restaurant|cafe|bar|pub|biergarten|ice_cream|fast_food|food_court|marketplace";
const SHOPS = "bakery|pastry|confectionery|cheese|deli";

const PHOTON_TAGS = {
  breakfast: ["shop:bakery"],
  coffee: ["amenity:cafe"],
  tasting: ["amenity:ice_cream", "amenity:fast_food", "amenity:marketplace", "shop:pastry", "shop:confectionery", "shop:cheese", "shop:deli"],
  dinner: ["amenity:restaurant"],
  drinks: ["amenity:bar", "amenity:pub", "amenity:biergarten"],
};

const TYPE_LABELS = {
  restaurant: "Restoran", cafe: "Kafe", bar: "Bar", pub: "Pub", biergarten: "Bira bahçesi",
  ice_cream: "Dondurma", fast_food: "Sokak lezzeti", food_court: "Yemek alanı", marketplace: "Pazar",
  bakery: "Fırın", pastry: "Pastane", confectionery: "Şekerci", cheese: "Peynirci", deli: "Şarküteri",
};

const CUISINE_LABELS = {
  italian: "İtalyan", french: "Fransız", spanish: "İspanyol", portuguese: "Portekiz", greek: "Yunan",
  turkish: "Türk", japanese: "Japon", chinese: "Çin", indian: "Hint", thai: "Tay", mexican: "Meksika",
  vietnamese: "Vietnam", korean: "Kore", lebanese: "Lübnan", american: "Amerikan", german: "Alman",
  pizza: "Pizza", burger: "Burger", sushi: "Suşi", kebab: "Kebap", seafood: "Deniz ürünleri",
  fish: "Balık", steak_house: "Et", vegan: "Vegan", vegetarian: "Vejetaryen", regional: "Yöresel",
  coffee_shop: "Kahve", breakfast: "Kahvaltı", brunch: "Brunch", cake: "Pasta", ice_cream: "Dondurma",
  tapas: "Tapas", wine: "Şarap", cocktail: "Kokteyl", sandwich: "Sandviç", bagel: "Bagel",
  crepe: "Krep", pasta: "Makarna", noodle: "Noodle", ramen: "Ramen", mediterranean: "Akdeniz",
};

// Determines which course a venue belongs to from its OSM tags.
function classify(tags) {
  const amenity = tags.amenity;
  const shop = tags.shop;
  const cuisine = (tags.cuisine || "").toLowerCase();

  if (["bar", "pub", "biergarten"].includes(amenity)) return "drinks";
  if (shop === "bakery" || /breakfast|brunch|pancake/.test(cuisine) || tags.breakfast === "yes") return "breakfast";
  if (amenity === "cafe") return "coffee";
  if (amenity === "restaurant") return "dinner";
  if (["ice_cream", "fast_food", "food_court", "marketplace"].includes(amenity)) return "tasting";
  if (["pastry", "confectionery", "cheese", "deli"].includes(shop)) return "tasting";
  return null;
}

function cuisineLabel(tags) {
  const first = (tags.cuisine || "").split(";").map((c) => c.trim().toLowerCase()).filter(Boolean);
  const labels = first.slice(0, 2).map((c) => CUISINE_LABELS[c] ?? c.replace(/_/g, " "));
  return labels.length ? labels.join(", ") : TYPE_LABELS[tags.amenity || tags.shop] ?? "Mekan";
}

// Only simple, same-every-day hours are treated as computable.
// Complex ones ("Mo-Fr 08:00-18:00; Sa 09:00-14:00") are shown as text.
function parseHours(raw) {
  if (!raw) return { hours: null, hoursText: null };
  const text = raw.trim();
  if (text === "24/7") return { hours: { open: "00:00", close: "24:00" }, hoursText: null };
  const m = text.match(/^(?:Mo-Su\s+)?(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (m) return { hours: { open: m[1].padStart(5, "0"), close: m[2].padStart(5, "0") }, hoursText: null };
  return { hours: null, hoursText: text };
}

// "Prominence" signal used instead of a rating: the richer the record, the higher it ranks.
function prominence(tags) {
  return (
    (tags.wikidata || tags.wikipedia ? 3 : 0) +
    (tags.website || tags["contact:website"] ? 1 : 0) +
    (tags.opening_hours ? 1 : 0) +
    (tags.cuisine ? 0.5 : 0) +
    (tags.phone || tags["contact:phone"] ? 0.5 : 0) +
    (tags.outdoor_seating === "yes" ? 0.25 : 0)
  );
}

function toVenue({ id, lat, lng, tags, course, tz }) {
  const { hours, hoursText } = parseHours(tags.opening_hours);
  return {
    id,
    origin: "osm",
    name: tags.name,
    course,
    area: tags["addr:suburb"] || tags["addr:neighbourhood"] || tags["addr:district"] || tags["addr:street"] || tags["addr:city"] || "",
    cuisine: cuisineLabel(tags),
    blurb: null,
    lat,
    lng,
    tz,
    price: null,
    hours,
    hoursText,
    ratings: {},
    photo: null,
    website: safeUrl(tags.website || tags["contact:website"]),
    terrace: tags.outdoor_seating === "yes",
    cozy: false,
    prominence: prominence(tags),
  };
}

// Picks the PER_COURSE most prominent venues of each course (ties: closest first).
function pickTop(venues, center) {
  const byCourse = {};
  for (const v of venues) {
    v.distanceKm = distanceKm(center, v);
    (byCourse[v.course] ??= []).push(v);
  }
  return Object.values(byCourse).flatMap((list) =>
    list.sort((a, b) => b.prominence - a.prominence || a.distanceKm - b.distanceKm).slice(0, PER_COURSE)
  );
}

async function fromOverpass(lat, lng, radiusKm, tz) {
  const radiusM = Math.round(radiusKm * 1000);
  // For large radii, only request rich records so we don't get hundreds of venues.
  const filter = radiusKm > 3 ? '[~"^(website|contact:website|wikidata)$"~"."]' : "";
  const around = `(around:${radiusM},${lat},${lng})`;
  const query =
    `[out:json][timeout:12];(` +
    `nwr${around}[amenity~"^(${AMENITIES})$"][name]${filter};` +
    `nwr${around}[shop~"^(${SHOPS})$"][name]${filter};` +
    `);out center tags 1500;`;

  // Ask all servers at once, use the first successful answer.
  const attempt = async (endpoint) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    return res.json();
  };

  try {
    const data = await Promise.any(OVERPASS_ENDPOINTS.map(attempt));
    return data.elements
      .map((el) => {
        const course = classify(el.tags || {});
        const point = el.type === "node" ? { lat: el.lat, lng: el.lon } : el.center && { lat: el.center.lat, lng: el.center.lon };
        if (!course || !point) return null;
        return toVenue({ id: `osm-${el.type[0]}${el.id}`, ...point, tags: el.tags, course, tz });
      })
      .filter(Boolean);
  } catch {
    return null;
  }
}

async function photonCourse(lat, lng, radiusKm, tz, course, tags) {
  const url = new URL("https://photon.komoot.io/reverse");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lng);
  url.searchParams.set("radius", radiusKm);
  url.searchParams.set("limit", 40);
  tags.forEach((t) => url.searchParams.append("osm_tag", t));

  for (let tryNo = 0; tryNo < 2; tryNo++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`Photon ${res.status}`);
      const data = await res.json();
      return data.features
        .filter((f) => f.properties.name)
        .map((f) => {
          const p = f.properties;
          const [fLng, fLat] = f.geometry.coordinates;
          const osmTags = { name: p.name, [p.osm_key]: p.osm_value, "addr:street": p.street, "addr:suburb": p.district, "addr:city": p.city };
          return toVenue({ id: `osm-${(p.osm_type || "n").toLowerCase()}${p.osm_id}`, lat: fLat, lng: fLng, tags: osmTags, course, tz });
        });
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return [];
}

// Query courses two at a time so we don't overload Photon.
async function fromPhoton(lat, lng, radiusKm, tz) {
  const entries = Object.entries(PHOTON_TAGS);
  const results = [];
  for (let i = 0; i < entries.length; i += 2) {
    const batch = entries.slice(i, i + 2).map(([course, tags]) => photonCourse(lat, lng, radiusKm, tz, course, tags));
    results.push(...(await Promise.all(batch)));
  }
  return results.flat();
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// A live query is made on every search (no cache).
export async function searchOsmVenues({ lat, lng, radiusKm }) {
  const tz = tzLookup(lat, lng);

  // If Overpass answers within 2.5 s use it; otherwise start Photon in parallel
  // and take whichever succeeds (Overpass preferred).
  const overpass = fromOverpass(lat, lng, radiusKm, tz);
  let raw = await Promise.race([overpass, wait(2500).then(() => undefined)]);
  if (!raw) {
    const photon = fromPhoton(lat, lng, radiusKm, tz);
    raw = (await overpass) ?? (await photon);
  }

  // The same venue is sometimes mapped both as a node and a building; drop duplicates.
  const seen = new Set();
  const unique = raw.filter((v) => !seen.has(v.id) && seen.add(v.id));
  return pickTop(unique, { lat, lng });
}
