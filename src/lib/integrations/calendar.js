import { getCourse, toRoman } from "@/lib/courses";
import { formatDuration, formatDistance } from "@/lib/routing/distance";
import { googleMapsPlace } from "./deepLinks";

// CALENDAR INTEGRATION
// • .ics file: the whole day in one file → Apple Calendar, Outlook, Google Calendar (import)
// • Google Calendar links: one click per course
// Times are in the venue's own time zone and written to the calendar as UTC,
// so they show up at the right time wherever the user is.
// (Future: one-click direct insert via the Google Calendar API + OAuth.)

// UTC offset of a time zone at a given instant (minutes)
function tzOffsetMinutes(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUtc - utcMs) / 60000;
}

// "2026-10-22" + "09:00" (Europe/Lisbon) → UTC timestamp
export function zonedToUtc(date, time, timeZone) {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  let utc = naive - tzOffsetMinutes(naive, timeZone) * 60000;
  utc = naive - tzOffsetMinutes(utc, timeZone) * 60000; // second pass for DST transitions
  return utc;
}

const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

// Turns every stop of the plan into a calendar event
export function planEvents(stops, date) {
  return stops
    .map((stop, i) => ({ stop, numeral: toRoman(i + 1) }))
    .filter(({ stop }) => stop.venue)
    .map(({ stop, numeral }) => {
      const course = getCourse(stop.slot.course);
      const tz = stop.venue.tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const start = zonedToUtc(date, stop.slot.time, tz);
      const walk = stop.leg
        ? `${stop.leg.fromStart ? "Başlangıç noktasından" : "Önceki duraktan"} ${formatDuration(stop.leg.minutes)} yürüyüş (${formatDistance(stop.leg.km)}).`
        : "";
      return {
        uid: `${stop.slot.uid}-${date}@mise`,
        title: `${numeral}. ${course.label} · ${stop.venue.name}`,
        start,
        end: start + course.duration * 60000,
        location: [stop.venue.name, stop.venue.area].filter(Boolean).join(", "),
        geo: stop.venue,
        walkMinutes: stop.leg?.minutes ?? 0,
        description: [walk, stop.venue.cuisine, `Harita: ${googleMapsPlace(stop.venue)}`, "Mise ile planlandı."].filter(Boolean).join("\n"),
      };
    });
}

const escapeIcs = (s) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

// RFC 5545: a line may be at most 75 OCTETS; continuation lines start with a space.
// Never split a character (Array.from → including multi-byte characters such as emoji);
// count the UTF-8 byte length of each piece (Turkish letters 2 bytes, emoji 4 bytes).
const encoder = new TextEncoder();
function fold(line) {
  const parts = [];
  let current = "";
  let bytes = 0;
  for (const ch of Array.from(line)) {
    const size = encoder.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // the leading space of a continuation line is 1 byte
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(events, calendarName = "Mise — Günün Menüsü") {
  const now = stamp(Date.now());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mise//Gunun Menusu//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
  ];

  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(e.start)}`,
      `DTEND:${stamp(e.end)}`,
      `SUMMARY:${escapeIcs(e.title)}`,
      `LOCATION:${escapeIcs(e.location)}`,
      `GEO:${e.geo.lat.toFixed(6)};${e.geo.lng.toFixed(6)}`,
      `DESCRIPTION:${escapeIcs(e.description)}`,
      // "Time to leave" reminder: walking time + 10 min before
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcs(`Yola çıkma vakti: ${e.title}`)}`,
      `TRIGGER:-PT${e.walkMinutes + 10}M`,
      "END:VALARM",
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarLink(event) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(event.start)}/${stamp(event.end)}`,
    details: event.description,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
