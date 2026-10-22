import tzLookup from "tz-lookup";
import { distanceKm } from "@/lib/routing/distance";
import { scoreVenue } from "@/lib/scoring/miseScore";
import { fetchElevations } from "@/lib/services/openMeteo";

// FICTIONAL DEMO VENUES
// Generated deterministically around any searched place, so the demo works anywhere without
// API keys. Names, ratings, reviews and opening hours are invented and clearly labeled as demo
// data in the UI; ratings come from two fictional sources ("Demo A", "Demo B"), never from real
// platforms. The same place always produces the same venues. Positions are checked against
// Open-Meteo's elevation data so venues don't end up in the sea.

const PER_COURSE = 9;

const NAMES = {
  breakfast: ["Sabah Atölyesi", "Forno Aurora", "Maison Lever", "Padaria Brisa", "Kahvaltı Avlusu", "Bakehouse Nordlys", "Petit Matin", "Simit & Sis", "Casa do Pão Doce", "Morning Ledger", "Brunch Bahçesi"],
  coffee: ["Kavrulmuş Ada", "Café Lumen", "Filtro & Taş", "Roastery Halde", "Kahve Kulesi", "Tostado Norte", "Espresso Avlu", "Moka Atlas", "Café Verso", "Demlik Kooperatifi", "Barista Mahzeni"],
  tasting: ["Pazar Tezgâhı", "Gelateria Luna", "Pastelaria Ondas", "Lokum Evi", "Tapa Parlak", "Börek Durağı", "Cheese Cellar Vale", "Dondurmacı Rüzgâr", "Fırın Sokağı", "Mercado Pequeno", "Tatlı Haritası"],
  dinner: ["Meyhane Liman", "Trattoria Ponte", "Bistro Ardıç", "Taverna Mavi", "Sofra Mahallesi", "Cozinha Sal", "Ocakbaşı Kervan", "Osteria Gelso", "Brasserie Kule", "Masa Yirmi", "Ateş & Zeytin"],
  drinks: ["Şarap Mahzeni Gölge", "Bar Neon Kuşu", "Taproom Çınar", "Vermut Köşesi", "Cocktail Atlası", "Rakı Balkonu", "Wine Bar Ocre", "Speakeasy Anahtar", "Teras Yıldız", "Bira Fabrikası Sis", "Bar Pusula"],
};

const CUISINE = {
  breakfast: ["Kahvaltı", "Brunch", "Fırın", "Pastane"],
  coffee: ["Specialty kahve", "Kavurucu", "Kafe", "Espresso bar"],
  tasting: ["Sokak lezzeti", "Dondurma", "Pastane", "Pazar", "Peynirci"],
  dinner: ["Meyhane", "İtalyan", "Akdeniz", "Bistro", "Yöresel", "Deniz ürünleri"],
  drinks: ["Şarap barı", "Kokteyl", "Bira evi", "Çatı barı"],
};

const AREAS = ["Merkez", "Eski Çarşı", "Liman", "Bahçeler", "Kuzey Yakası", "Tepe", "Sahil", "Kale Altı"];

const BLURBS = {
  breakfast: ["Günün ilk ışığıyla açılan küçük bir salon.", "Ev yapımı reçeller ve taze ekmek.", "Hafta sonları uzun bir kahvaltı sırası."],
  coffee: ["Kendi kavurduğu çekirdekler, sakin bir bar.", "Pencere kenarında filtre kahve.", "Mahallenin uğrak noktası."],
  tasting: ["Ayakta yenen, hızlı ve lezzetli.", "Sıcak sıcak tezgâhtan.", "Yerel üreticilerden küçük tadımlar."],
  dinner: ["Mevsimlik menü, uzun masalar.", "Akşamları dolan, sıcak bir salon.", "Şefin günlük önerileri tebeşir tahtasında."],
  drinks: ["Gün batımında terasta bir kadeh.", "Küçük üreticilerden şaraplar.", "Gece geç saate kadar açık."],
};

// Shared review lines plus a few per course, so a dinner place isn't praised for its coffee
const REVIEWS = [
  "Servis çok güler yüzlüydü, tekrar geleceğim.",
  "Biraz kalabalıktı ama beklemeye değdi.",
  "Fiyat/performans olarak bölgedeki en iyi yerlerden.",
  "Yerel halkın gittiği bir yer, turist tuzağı değil.",
];
const COURSE_REVIEWS = {
  breakfast: ["Ekmekleri sıcacık geldi, reçeller ev yapımı.", "Hafta sonu erken gelin, masalar çabuk doluyor."],
  coffee: ["Kahvesi beklediğimden de iyiydi.", "Filtre kahve için şehirdeki favorim."],
  tasting: ["Ayakta hızlıca bir şeyler atıştırmak için ideal.", "Porsiyonlar küçük ama lezzet yerinde."],
  dinner: ["Şefin önerisi harikaydı, rezervasyon şart.", "Atmosferi çok sevdim, akşamları ayrı güzel."],
  drinks: ["Gün batımında terasta bir kadeh için birebir.", "Şarap listesi kısa ama çok iyi seçilmiş."],
};

const WHEN = ["2 gün önce", "1 hafta önce", "3 hafta önce", "1 ay önce", "2 ay önce"];

// Opening hours by course: [open, close] (closing after midnight is allowed)
const HOURS = {
  breakfast: ["07:30", "15:00"],
  coffee: ["08:00", "19:00"],
  tasting: ["10:00", "21:00"],
  dinner: ["12:00", "23:30"],
  drinks: ["17:00", "02:00"],
};

// Small seeded PRNG (mulberry32) — same input, same venues
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const between = (rand, min, max) => min + rand() * (max - min);
const logBetween = (rand, min, max) => Math.round(Math.exp(between(rand, Math.log(min), Math.log(max))));

function weekHours(course, rand) {
  const [open, close] = HOURS[course];
  const closedDay = rand() < 0.35 ? Math.floor(rand() * 7) : -1; // some venues close one day a week
  const week = {};
  for (let d = 0; d < 7; d++) week[d] = d === closedDay ? [] : [{ open, close }];
  return week;
}

// Point `km` away from `from` in direction `theta` (radians, 0 = north)
function offset(from, km, theta) {
  return {
    lat: from.lat + (km / 111.32) * Math.cos(theta),
    lng: from.lng + (km / (111.32 * Math.cos((from.lat * Math.PI) / 180))) * Math.sin(theta),
  };
}

// Uniform point inside the search circle (at most 90% of the radius)
const pointInCircle = (rand, center, radiusKm) => offset(center, Math.sqrt(rand()) * radiusKm * 0.9, rand() * 2 * Math.PI);

// Candidate positions, those on land first (elevation 0 = open water). One elevation request per
// search; if it fails, the candidates are used as they are.
async function landPoints(rand, center, radiusKm, count) {
  const candidates = Array.from({ length: Math.min(100, count * 2) }, () => pointInCircle(rand, center, radiusKm));
  try {
    const elevations = await fetchElevations(candidates, { signal: AbortSignal.timeout(4000) });
    const land = candidates.filter((_, i) => elevations[i] !== 0);
    return [...land, ...candidates.filter((_, i) => elevations[i] === 0)];
  } catch {
    return candidates;
  }
}

export async function demoVenues({ lat, lng, radiusKm }) {
  const center = { lat, lng };
  const tz = tzLookup(lat, lng);
  const seedBase = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const venues = [];

  const courses = Object.keys(NAMES);
  const points = await landPoints(rng(hash(`${seedBase}|points`)), center, radiusKm, courses.length * PER_COURSE);
  let slot = 0;

  for (const course of courses) {
    const rand = rng(hash(`${seedBase}|${course}`));
    const names = [...NAMES[course]].sort(() => rand() - 0.5).slice(0, PER_COURSE);

    names.forEach((name, i) => {
      const { lat: vLat, lng: vLng } = points[slot++];

      const ratingA = Math.round(between(rand, 3.9, 4.9) * 10) / 10;
      const ratings = {
        demoA: { rating: ratingA, count: logBetween(rand, 60, 6000) },
        demoB: { rating: Math.round(Math.min(9.8, ratingA * 2 + between(rand, -0.5, 0.4)) * 10) / 10, count: logBetween(rand, 15, 1500) },
      };
      const reviewCount = 2 + Math.floor(rand() * 2);
      const lines = [...COURSE_REVIEWS[course], ...REVIEWS].sort(() => rand() - 0.5);
      const reviews = Array.from({ length: reviewCount }, (_, k) => ({
        rating: Math.max(3, Math.min(5, Math.round(ratingA + between(rand, -1, 0.6)))),
        text: lines[k],
        translated: false,
        author: `Demo kullanıcısı ${k + 1}`,
        authorUrl: null,
        when: pick(rand, WHEN),
      }));

      venues.push({
        id: `demo-${hash(`${seedBase}|${course}|${name}`).toString(36)}`,
        origin: "demo",
        name,
        course,
        area: pick(rand, AREAS),
        cuisine: pick(rand, CUISINE[course]),
        blurb: pick(rand, BLURBS[course]),
        lat: vLat,
        lng: vLng,
        tz,
        price: 1 + Math.floor(rand() * (course === "dinner" ? 4 : 3)),
        hours: null,
        weekHours: weekHours(course, rand),
        hoursText: null,
        ratings,
        reviews,
        photo: `/photos/${course}-${1 + ((i + Math.floor(rand() * 5)) % (course === "drinks" ? 4 : 5))}.jpg`,
        terrace: rand() < 0.4,
        cozy: rand() < 0.6,
        prominence: 0,
        distanceKm: distanceKm(center, { lat: vLat, lng: vLng }),
      });
    });
  }

  const scored = venues
    .map((v) => ({ ...v, ...scoreVenue(v.ratings) }))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  return {
    sources: ["demo"],
    googleStatus: "off",
    links: [],
    venues: scored,
    center,
    radiusKm,
    fetchedAt: new Date().toISOString(),
  };
}
