import { searchOsmVenues } from "./osm";
import { searchGoogleVenues } from "./google";
import { enrichWithFoursquare, searchFoursquareVenues } from "./foursquare";
import { scoreVenue } from "@/lib/scoring/miseScore";
import { distanceKm } from "@/lib/routing/distance";

// Single entry point for all venue sources.
// The rest of the app doesn't know where the data comes from; it only calls this function.
//
//  • With GOOGLE_PLACES_API_KEY and/or FOURSQUARE_API_KEY: Google's rated venues +
//    Foursquare's popular venues together (if one fails, continue with the other).
//  • Without keys (or if those sources fail): live OpenStreetMap venues from anywhere in the world.
//  No server-side cache for any source; every search fetches fresh data from the internet.

const normalize = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

const byQuality = (a, b) => {
  if (a.score != null || b.score != null) return (b.score ?? -1) - (a.score ?? -1);
  return b.prominence - a.prominence || a.distanceKm - b.distanceKm;
};

// Same venue in both sources? (similar name + within 150 m)
const sameVenue = (a, b) => {
  const ka = normalize(a.name);
  const kb = normalize(b.name);
  return (ka === kb || ka.includes(kb) || kb.includes(ka)) && distanceKm(a, b) < 0.15;
};

// Google's status for this search: "ok" | "quota" (daily limit reached) | "error" | "off" (no key)
function googleStatusOf(result, hasKey) {
  if (!hasKey) return "off";
  if (result.status === "fulfilled") return "ok";
  return /\b429\b|RESOURCE_EXHAUSTED|Quota exceeded/i.test(result.reason?.message ?? "") ? "quota" : "error";
}

// Google (rated) + Foursquare (popular, free) together, in parallel.
// If Google's daily limit is reached or it fails, only Foursquare is used.
async function fromCommercial(query) {
  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  const fsqKey = process.env.FOURSQUARE_API_KEY;
  if (!googleKey && !fsqKey) return { empty: true, googleStatus: "off" };

  const [g, f] = await Promise.allSettled([
    googleKey ? searchGoogleVenues(query, googleKey) : Promise.resolve([]),
    fsqKey ? searchFoursquareVenues(query, fsqKey) : Promise.resolve([]),
  ]);
  if (g.status === "rejected") console.error("Google Places failed (daily quota may be exhausted):", g.reason?.message);
  if (f.status === "rejected") console.error("Foursquare failed:", f.reason?.message);
  const googleStatus = googleStatusOf(g, Boolean(googleKey));

  let google = g.status === "fulfilled" ? g.value : [];
  const fsq = f.status === "fulfilled" ? f.value : [];
  if (!google.length && !fsq.length) return { empty: true, googleStatus };

  // If Foursquare credits are available, add a second rating to Google venues ("Verified" badge)
  if (google.length && fsqKey) {
    try {
      google = await enrichWithFoursquare(google, query, fsqKey);
    } catch (err) {
      console.error("Foursquare enrichment failed:", err.message);
    }
  }

  // Add Foursquare venues that aren't in Google's results (unrated but popular).
  // When both sources return the same venue, ONLY their IDs are matched (links): Google's terms
  // only allow storing the place ID. The browser stores these matches; when the Google quota
  // is exhausted it uses this ID to open Google's own card (Places UI Kit) for the Foursquare venue.
  const links = [];
  const extra = fsq.filter((fv) => {
    const match = google.find((gv) => sameVenue(gv, fv));
    if (match) links.push({ venue: fv.id, place: match.googleId });
    return !match;
  });
  const sources = [google.length && "google", fsq.length && "foursquare"].filter(Boolean);
  return {
    sources,
    googleStatus,
    links,
    venues: [...google, ...extra].map((v) => ({ ...v, ...scoreVenue(v.ratings) })).sort(byQuality),
  };
}

async function fromOpenData({ lat, lng, radiusKm }) {
  let osm = [];
  try {
    osm = await searchOsmVenues({ lat, lng, radiusKm });
  } catch (err) {
    console.error("OSM search failed:", err);
  }
  return {
    sources: osm.length ? ["osm"] : [],
    venues: osm.map((o) => ({ ...o, ...scoreVenue(o.ratings) })).sort(byQuality),
  };
}

export async function searchVenues({ lat, lng, radiusKm = 2 }) {
  const query = { lat, lng, radiusKm };
  const commercial = await fromCommercial(query);
  const result = commercial.empty ? { ...(await fromOpenData(query)), googleStatus: commercial.googleStatus, links: [] } : commercial;
  return { ...result, center: { lat, lng }, radiusKm };
}
