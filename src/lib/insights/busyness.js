import { venueOpenAt, weekdayOf } from "@/lib/time";

// BUSYNESS ESTIMATE
// Real "popular times" data isn't available from a free source
// (Google doesn't expose it in its API; BestTime.app is paid). So this is an
// estimation model, clearly labeled "estimated" in the UI:
//   typical daily curve of the venue type × day of week × venue popularity
// A real data source (e.g. BestTime.app with an API key) could replace this function in the future.

// [peak hour, width (hours), height]
const PEAKS = {
  breakfast: [[9.5, 1.3, 0.85], [12, 1.2, 0.45]],
  coffee: [[9, 1.1, 0.7], [15.5, 1.5, 0.75]],
  tasting: [[13, 1.4, 0.85], [18, 1.6, 0.6]],
  dinner: [[13.3, 1.1, 0.55], [20.7, 1.4, 0.95]],
  drinks: [[19, 1.2, 0.45], [22.8, 1.6, 0.95]],
};

const gauss = (x, mu, sigma) => Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));

// Give each venue a small but stable "personality" (same venue → same curve every time)
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

function popularity(venue) {
  if (venue.totalReviews) return Math.min(1.15, 0.7 + Math.log10(venue.totalReviews + 10) * 0.1);
  return 0.8 + (venue.prominence ?? 0) * 0.04;
}

// Busyness array of 0–1 values for hours 0–23
export function busynessCurve(venue, date) {
  const day = new Date(`${date}T12:00:00`).getDay(); // 0 Pazar … 6 Cumartesi
  const weekend = day === 0 || day === 6;
  const nightOut = day === 5 || day === 6;
  const jitter = hash(venue.id);
  const shift = (jitter - 0.5) * 0.8 + (weekend && venue.course === "breakfast" ? 1 : 0);
  let scale = popularity(venue) * (0.92 + jitter * 0.16);
  if (weekend && (venue.course === "breakfast" || venue.course === "tasting")) scale *= 1.2;
  if (nightOut && (venue.course === "dinner" || venue.course === "drinks")) scale *= 1.15;

  const weekday = weekdayOf(date);
  return Array.from({ length: 24 }, (_, hour) => {
    if (venueOpenAt(venue, weekday, hour * 60 + 30) === false) return 0;
    const raw = PEAKS[venue.course].reduce((sum, [mu, sd, amp]) => sum + amp * gauss(hour + 0.5, mu + shift, sd), 0.06);
    return Math.max(0, Math.min(1, raw * scale));
  });
}

export function busyLevel(value) {
  if (value < 0.35) return { key: "calm", label: "Sakin" };
  if (value < 0.65) return { key: "medium", label: "Orta" };
  if (value < 0.85) return { key: "busy", label: "Hareketli" };
  return { key: "packed", label: "Kalabalık" };
}

// Busyness at the planned time + a tip such as "come an hour earlier"
export function busynessAt(venue, date, time) {
  const curve = busynessCurve(venue, date);
  const hour = Number(time.slice(0, 2));
  const value = curve[hour];
  let tip = null;
  if (value >= 0.7) {
    if (hour > 0 && curve[hour - 1] > 0 && curve[hour - 1] < value - 0.2) tip = "1 saat erken daha sakin";
    else if (hour < 23 && curve[hour + 1] > 0 && curve[hour + 1] < value - 0.2) tip = "1 saat sonra daha sakin";
  }
  return { value, level: busyLevel(value), tip, curve, hour };
}
