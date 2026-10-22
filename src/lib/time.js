// Opening hours are evaluated in the venue's own city time zone
// (when looking at Lisbon from Istanbul, Lisbon time is used).
//
// Venue hours come in two shapes:
//   hours:     { open, close }               → same every day (simple OSM records)
//   weekHours: { 0: [{open, close}], … 6 }   → per weekday, split hours (Google) — 0 = Sunday

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function minutesNowIn(timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return get("hour") * 60 + get("minute");
}

const DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
export const weekdayIn = (timeZone) => DAYS[new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(new Date())];
export const weekdayOf = (date) => new Date(`${date}T12:00:00`).getDay();

// Also supports hours past midnight (e.g. 18:00 – 02:00).
export function isOpenAt(hours, minutes) {
  if (!hours) return true;
  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close);
  if (close > open) return minutes >= open && minutes < close;
  return minutes >= open || minutes < close;
}

export const hasHours = (venue) => Boolean(venue.weekHours || venue.hours);

// Today's periods + yesterday's periods that run past midnight into today
function activePeriod(week, weekday, minutes) {
  const today = week[weekday] ?? [];
  const yesterday = week[(weekday + 6) % 7] ?? [];
  return (
    today.find((p) => {
      const o = toMinutes(p.open);
      const c = toMinutes(p.close);
      return c > o ? minutes >= o && minutes < c : minutes >= o;
    }) ??
    yesterday.find((p) => {
      const o = toMinutes(p.open);
      const c = toMinutes(p.close);
      return c <= o && minutes < c;
    }) ??
    null
  );
}

// Is the venue open at that minute on that weekday? (null = unknown when there are no hours)
export function venueOpenAt(venue, weekday, minutes) {
  if (minutes >= 1440) return venueOpenAt(venue, (weekday + 1) % 7, minutes - 1440);
  if (venue.weekHours) return Boolean(activePeriod(venue.weekHours, weekday, minutes));
  if (venue.hours) return isOpenAt(venue.hours, minutes);
  return null;
}

// Status text shown on cards: "Açık · kapanış 23:00" / "Kapalı · açılış 08:00"
export function openStatus(venue) {
  if (!hasHours(venue)) {
    const text = venue.hoursText;
    if (!text) return { open: null, label: "Saat bilgisi yok" };
    return { open: null, label: text.length > 34 ? `${text.slice(0, 33)}…` : text };
  }

  const now = minutesNowIn(venue.tz);

  if (!venue.weekHours) {
    return isOpenAt(venue.hours, now)
      ? { open: true, label: `Açık · kapanış ${venue.hours.close}` }
      : { open: false, label: `Kapalı · açılış ${venue.hours.open}` };
  }

  const day = weekdayIn(venue.tz);
  const current = activePeriod(venue.weekHours, day, now);
  if (current) return { open: true, label: `Açık · kapanış ${current.close === "24:00" ? "gece yarısı" : current.close}` };

  const later = (venue.weekHours[day] ?? []).find((p) => toMinutes(p.open) > now);
  if (later) return { open: false, label: `Kapalı · açılış ${later.open}` };
  const tomorrow = venue.weekHours[(day + 1) % 7]?.[0];
  return { open: false, label: tomorrow ? `Kapalı · yarın ${tomorrow.open}` : "Bugün kapalı" };
}
