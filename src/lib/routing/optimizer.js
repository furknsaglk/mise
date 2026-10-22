import { getCourse } from "@/lib/courses";
import { distanceKm, walkingMinutes } from "./distance";
import { hasHours, venueOpenAt, weekdayOf, toMinutes } from "@/lib/time";
import { weatherAt } from "@/lib/weather/codes";
import { busynessAt } from "@/lib/insights/busyness";

// DAY MENU OPTIMIZATION
//
// Goal: pick one venue per course — not the individually "best" one each time,
// but the best combination for the WHOLE day.
//
//   Total utility = Σ (venue quality + context bonus) − λ × Σ walking distance
//
// Context: the weather at that hour (indoor venues in rain, terraces in sun), sunset,
// estimated busyness. Since the order of courses is fixed, the problem is a
// "layered shortest path" and is solved exactly with dynamic programming (Viterbi).

const LAMBDA = 0.22; // "cost" of walking 1 km (on the 0–1 quality scale)
const HEAVY = new Set(["dinner", "tasting"]); // a longer digestive walk afterwards is welcome
const DIGESTIVE_DISCOUNT = 0.55;
const RAIN_WALK_FACTOR = 1.5; // walking in the rain is more "expensive"
const UNKNOWN_HOURS_PENALTY = 0.08;
const MAX_CANDIDATES = 30;

// Venue quality 0–1: Mise score for rated venues, prominence signal for unrated ones.
export function quality(v) {
  if (v.score != null) return v.score / 10;
  return Math.min(0.62, 0.4 + (v.prominence ?? 0) * 0.05);
}

// Is it open on arrival on the plan's day (weekday) and will it stay open for at least 45 min?
function openFit(v, startMin, duration, weekday) {
  if (!hasHours(v)) return { ok: true, penalty: UNKNOWN_HOURS_PENALTY, known: false };
  const stay = Math.min(duration, 45);
  const ok = venueOpenAt(v, weekday, startMin) && venueOpenAt(v, weekday, startMin + stay);
  return { ok, penalty: 0, known: true };
}

// Course context: the weather at that hour and whether it overlaps with sunset
function slotContext(slot, weather, date) {
  const course = getCourse(slot.course);
  const start = toMinutes(slot.time);
  const w = weatherAt(weather, slot.time);
  const sunset = weather?.available ? toMinutes(weather.sunset) : null;
  const sunsetIn = sunset != null && sunset >= start - 20 && sunset <= start + course.duration;
  const weekday = date ? weekdayOf(date) : new Date().getDay();
  return { w, sunsetIn, sunset: weather?.sunset, date, weekday };
}

// Small bonuses/penalties from weather, sunset and busyness + "why it was chosen" notes
function contextAdjust(venue, slot, ctx) {
  let delta = 0;
  const reasons = [];
  const { w } = ctx;

  if (w?.wet) {
    if (venue.terrace && !venue.cozy) delta -= 0.12;
    if (venue.cozy) {
      delta += 0.04;
      reasons.push("Yağmurda kapalı, sıcak bir mekan");
    }
  } else if (w?.nice && venue.terrace) {
    delta += 0.06;
    reasons.push("Teras havası");
  }
  if (w?.cold && venue.cozy && (slot.course === "breakfast" || slot.course === "coffee")) {
    delta += 0.03;
    reasons.push("Soğukta sıcak bir köşe");
  }
  if (ctx.sunsetIn && venue.terrace && w && !w.wet && w.cloud < 70) {
    delta += 0.08;
    reasons.push("Gün batımına terasta");
  }
  if (ctx.date) {
    const busy = busynessAt(venue, ctx.date, slot.time);
    if (busy.value >= 0.85) delta -= 0.04;
  }
  return { delta, reasons };
}

function candidatesFor(slot, venues, ctx) {
  const course = getCourse(slot.course);
  const start = toMinutes(slot.time);
  const score = (venue, fit) => {
    const adj = contextAdjust(venue, slot, ctx);
    return { venue, fit, value: quality(venue) - fit.penalty + adj.delta, reasons: adj.reasons };
  };

  if (slot.pinned) return [score(slot.pinned, openFit(slot.pinned, start, course.duration, ctx.weekday))];

  return venues
    .filter((v) => v.course === slot.course)
    .map((v) => ({ v, fit: openFit(v, start, course.duration, ctx.weekday) }))
    .filter(({ fit }) => fit.ok)
    .map(({ v, fit }) => score(v, fit))
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_CANDIDATES);
}

const legCost = (fromCourse, km, wet) =>
  LAMBDA * km * (HEAVY.has(fromCourse) ? DIGESTIVE_DISCOUNT : 1) * (wet ? RAIN_WALK_FACTOR : 1);

function solve(layers, start) {
  // best[i][j] = best total utility ending at candidate j of layer i
  const best = [];
  const back = [];

  layers.forEach((layer, i) => {
    best[i] = [];
    back[i] = [];
    const wet = layer.ctx.w?.wet;
    layer.cands.forEach((cand, j) => {
      if (i === 0) {
        best[i][j] = cand.value - (start ? legCost("start", distanceKm(start, cand.venue), wet) : 0);
        back[i][j] = -1;
        return;
      }
      // Don't pick the same venue twice in a row — but allow it if the user pinned the same place
      // for both courses. If no transition is left (e.g. both courses have the same single candidate),
      // relax the rule; otherwise backtracking would hit index -1 and the plan would crash.
      const bothPinned = layer.slot.pinned && layers[i - 1].slot.pinned;
      const bestFrom = (allowSame) => {
        let top = -Infinity;
        let arg = -1;
        layers[i - 1].cands.forEach((prev, k) => {
          if (!allowSame && prev.venue.id === cand.venue.id) return;
          const total = best[i - 1][k] + cand.value - legCost(layers[i - 1].slot.course, distanceKm(prev.venue, cand.venue), wet);
          if (total > top) {
            top = total;
            arg = k;
          }
        });
        return { top, arg };
      };
      let pick = bestFrom(bothPinned);
      if (pick.arg === -1) pick = bestFrom(true);
      best[i][j] = pick.top;
      back[i][j] = pick.arg;
    });
  });

  // Backtrack from the end
  const picks = new Array(layers.length);
  let j = best.at(-1).reduce((bi, v, idx, arr) => (v > arr[bi] ? idx : bi), 0);
  for (let i = layers.length - 1; i >= 0; i--) {
    picks[i] = j;
    j = back[i][j];
  }
  return picks;
}

export function planDay({ slots, venues, start, weather = null, date = null }) {
  const ctxs = new Map(slots.map((s) => [s.uid, slotContext(s, weather, date)]));
  const excluded = new Set();
  let layers;
  let picks;

  // If the same venue appears in two separate courses (e.g. two coffee breaks), exclude the later one and solve again.
  for (let round = 0; round < 4; round++) {
    layers = slots
      .map((slot) => {
        const ctx = ctxs.get(slot.uid);
        const cands = candidatesFor(slot, venues, ctx).filter((c) => slot.pinned || !excluded.has(`${slot.uid}:${c.venue.id}`));
        return { slot, ctx, cands };
      })
      .filter((l) => l.cands.length);
    if (!layers.length) break;
    picks = solve(layers, start);

    const seen = new Map();
    let clash = false;
    layers.forEach((l, i) => {
      const id = l.cands[picks[i]].venue.id;
      // Don't exclude in a single-candidate course: it would leave that course empty
      if (seen.has(id) && !l.slot.pinned && l.cands.length > 1) {
        excluded.add(`${l.slot.uid}:${id}`);
        clash = true;
      }
      seen.set(id, i);
    });
    if (!clash) break;
  }

  const chosen = new Map(layers?.map((l, i) => [l.slot.uid, l.cands[picks[i]]]) ?? []);

  // Stops, alternatives, context and walking legs for every course
  const stops = [];
  let prevPoint = start;
  let prevCourse = "start";

  slots.forEach((slot, i) => {
    const ctx = ctxs.get(slot.uid);
    const pick = chosen.get(slot.uid);

    if (!pick) {
      stops.push({ slot, venue: null, alternatives: [], leg: null, closedPin: false, weather: ctx.w });
      return;
    }

    const venue = pick.venue;
    const wet = ctx.w?.wet;
    const km = prevPoint ? distanceKm(prevPoint, venue) : 0;
    const minutes = prevPoint ? walkingMinutes(km) : 0;

    // Best 2 alternatives given the neighboring stops
    const nextSlot = slots.slice(i + 1).find((s) => chosen.get(s.uid));
    const nextPick = nextSlot && chosen.get(nextSlot.uid).venue;
    const nextWet = nextSlot && ctxs.get(nextSlot.uid).w?.wet;
    const alternatives = slot.pinned
      ? []
      : candidatesFor(slot, venues, ctx)
          .filter((c) => c.venue.id !== venue.id)
          .map((c) => ({
            ...c,
            fitScore:
              c.value -
              (prevPoint ? legCost(prevCourse, distanceKm(prevPoint, c.venue), wet) : 0) -
              (nextPick ? legCost(slot.course, distanceKm(c.venue, nextPick), nextWet) : 0),
          }))
          .sort((a, b) => b.fitScore - a.fitScore)
          .slice(0, 2)
          .map((c) => ({ ...c.venue, extraKm: (prevPoint ? distanceKm(prevPoint, c.venue) : 0) - km }));

    stops.push({
      slot,
      venue,
      hoursKnown: pick.fit.known,
      closedPin: Boolean(slot.pinned && !pick.fit.ok),
      alternatives,
      reasons: pick.reasons,
      weather: ctx.w,
      sunset: ctx.sunsetIn ? ctx.sunset : null,
      busy: date ? busynessAt(venue, date, slot.time) : null,
      leg: prevPoint ? { km, minutes, wet, digestive: HEAVY.has(prevCourse), fromStart: prevCourse === "start" } : null,
    });

    prevPoint = venue;
    prevCourse = slot.course;
  });

  return schedule(stops);
}

// SCHEDULE: leg durations are known (estimated or from the real route);
// lateness, free time, warnings and totals are computed here.
export function schedule(stops) {
  const warnings = [];
  let prevEnd = null;

  const timed = stops.map((stop) => {
    const course = getCourse(stop.slot.course);
    if (!stop.venue) {
      warnings.push(`${course.label} için ${stop.slot.time} saatinde açık bir mekan bulunamadı.`);
      return stop;
    }

    const startMin = toMinutes(stop.slot.time);
    let leg = stop.leg;
    if (leg && prevEnd != null) {
      const arrival = prevEnd + leg.minutes;
      leg = { ...leg, late: Math.max(0, arrival - startMin), free: Math.max(0, startMin - arrival) };
      if (leg.late > 0) warnings.push(`${course.label} için ${leg.late} dk geç kalabilirsin; saati biraz ileri al.`);
    }
    if (stop.closedPin) warnings.push(`${stop.venue.name}, ${stop.slot.time} saatinde kapalı görünüyor.`);

    prevEnd = startMin + course.duration;
    return { ...stop, leg };
  });

  const placed = timed.filter((s) => s.venue);
  const legs = placed.map((s) => s.leg).filter(Boolean);
  const rated = placed.filter((s) => s.venue.score != null);

  return {
    stops: timed,
    warnings,
    totals: {
      km: legs.reduce((sum, l) => sum + l.km, 0),
      minutes: legs.reduce((sum, l) => sum + l.minutes, 0),
      stops: placed.length,
      avgScore: rated.length ? rated.reduce((s, x) => s + x.venue.score, 0) / rated.length : null,
      verified: placed.filter((s) => s.venue.verified).length,
    },
  };
}
