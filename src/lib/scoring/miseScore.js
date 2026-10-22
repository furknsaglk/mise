// MISE PUANI
// Combines the ratings of different platforms into one reliable score (0–10).
//
// 1) Each platform's rating is converted to a 5-point scale (Foursquare rates out of 10).
// 2) "Bayesian average": venues with few reviews are pulled toward the mean.
//    So a place with 5.0 from 3 reviews can't beat one with 4.7 from 2,000 reviews.
// 3) Platforms are weighted by review count and reliability.
// 4) Venues with a strong rating on at least two platforms get the "Verified" badge.

export const SOURCES = {
  google: { label: "Google", short: "G", scale: 5, prior: 40, weight: 1 },
  foursquare: { label: "Foursquare", short: "FSQ", scale: 10, prior: 15, weight: 0.8 },
  tripadvisor: { label: "Tripadvisor", short: "TA", scale: 5, prior: 25, weight: 0.9 },
};

const PRIOR_MEAN = 4.1; // "default" rating of a good venue in Europe
const VERIFIED_MIN_RATING = 4.5;
const VERIFIED_MIN_REVIEWS = 200;

export function scoreVenue(ratings = {}) {
  let weighted = 0;
  let weights = 0;
  let totalReviews = 0;
  let strongSources = 0;
  const sources = [];

  for (const [id, cfg] of Object.entries(SOURCES)) {
    const entry = ratings[id];
    if (!entry || !entry.rating || !entry.count) continue;

    const on5 = (entry.rating / cfg.scale) * 5;
    const bayes = (cfg.prior * PRIOR_MEAN + entry.count * on5) / (cfg.prior + entry.count);
    const w = cfg.weight * Math.log10(entry.count + 10);

    weighted += bayes * w;
    weights += w;
    totalReviews += entry.count;
    if (on5 >= VERIFIED_MIN_RATING && entry.count >= VERIFIED_MIN_REVIEWS) strongSources += 1;

    sources.push({ id, label: cfg.label, short: cfg.short, rating: entry.rating, scale: cfg.scale, count: entry.count });
  }

  if (!weights) return { score: null, verified: false, totalReviews: 0, sources };

  const combined = weighted / weights; // 0–5
  const score = Math.min(10, Math.max(0, ((combined - 2.5) / 2.5) * 10));

  return {
    score: Math.round(score * 10) / 10,
    verified: strongSources >= 2,
    totalReviews,
    sources,
  };
}

export function formatScore(score) {
  return score == null ? "—" : score.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// "10.993" — full number, because abbreviations like "11B" can read as "billion"; "123 bin" if very large
export function formatCount(n) {
  if (n >= 100000) return `${Math.round(n / 1000).toLocaleString("tr-TR")} bin`;
  return n.toLocaleString("tr-TR");
}
