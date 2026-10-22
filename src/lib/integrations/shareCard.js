import { getCourse, toRoman } from "@/lib/courses";
import { formatScore } from "@/lib/scoring/miseScore";
import { formatDistance, formatDuration } from "@/lib/routing/distance";

// SHAREABLE MENU CARD
// Draws the day's plan onto a 1080×1350 image (Instagram/WhatsApp portrait).
// The design matches the in-app ticket exactly.

const W = 1080;
const H = 1350;
const C = {
  paper: "#f4efe6",
  surface: "#fbf8f2",
  ink: "#1e1a17",
  ink2: "#5a524b",
  ink3: "#8c837a",
  line: "rgba(30,26,23,0.16)",
  pomodoro: "#d9472b",
  olive: "#6b7a3a",
};

// Read the real family names of the next/font fonts from the page
function fontFamilies() {
  const css = getComputedStyle(document.documentElement);
  const pick = (v, fb) => css.getPropertyValue(v).trim() || fb;
  return {
    serif: pick("--font-instrument", "Georgia, serif"),
    sans: pick("--font-dmsans", "system-ui, sans-serif"),
    mono: pick("--font-jetbrains", "monospace"),
  };
}

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export async function renderShareCard({ stops, place, date, totals }) {
  const F = fontFamilies();
  await Promise.all([
    document.fonts.load(`400 80px ${F.serif}`),
    document.fonts.load(`italic 400 80px ${F.serif}`),
    document.fonts.load(`500 24px ${F.sans}`),
    document.fonts.load(`400 24px ${F.mono}`),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "alphabetic";

  // Background + ticket card
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  const M = 56;
  ctx.fillStyle = C.surface;
  ctx.shadowColor = "rgba(30,26,23,0.18)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  roundRect(ctx, M, M, W - 2 * M, H - 2 * M, 36);
  ctx.fill();
  ctx.shadowColor = "transparent";

  const L = M + 56;
  const R = W - M - 56;

  // Header
  const dateLabel = new Date(`${date}T12:00:00`)
    .toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })
    .toLocaleUpperCase("tr-TR");
  ctx.fillStyle = C.ink3;
  ctx.font = `400 24px ${F.mono}`;
  ctx.fillText(`GÜNÜN MENÜSÜ · ${dateLabel}`, L, M + 92);

  ctx.fillStyle = C.ink;
  ctx.font = `400 104px ${F.serif}`;
  ctx.fillText(fitText(ctx, place.label.split(",")[0], R - L - 230), L, M + 210);

  ctx.textAlign = "right";
  ctx.fillStyle = C.ink2;
  ctx.font = `400 24px ${F.mono}`;
  ctx.fillText(`${formatDistance(totals.km)} yürüyüş`, R, M + 172);
  ctx.fillText(formatDuration(totals.minutes), R, M + 208);
  ctx.textAlign = "left";

  // Perforated divider
  const perfY = M + 262;
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(L - 20, perfY);
  ctx.lineTo(R + 20, perfY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = C.paper;
  for (const x of [M, W - M]) {
    ctx.beginPath();
    ctx.arc(x, perfY, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  // Duraklar
  const placed = stops.map((s, i) => ({ ...s, numeral: toRoman(i + 1) })).filter((s) => s.venue);
  const areaTop = perfY + 40;
  const bottom = H - M - 150;
  const rowH = Math.min(150, (bottom - areaTop) / Math.max(placed.length, 1));
  // With only a few stops, center the list vertically
  const top = areaTop + Math.max(0, (bottom - areaTop - rowH * placed.length) / 2);
  const nameSize = rowH < 120 ? 40 : 50;

  placed.forEach((s, i) => {
    const course = getCourse(s.slot.course);
    const y = top + i * rowH;

    // Walking connector from the previous stop
    if (i > 0 && s.leg) {
      ctx.strokeStyle = C.line;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(L + 26, y - rowH + 92);
      ctx.lineTo(L + 26, y + 14);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.ink3;
      ctx.font = `400 20px ${F.mono}`;
      ctx.fillText(`${formatDuration(s.leg.minutes)} · ${formatDistance(s.leg.km)}`, L + 48, y + 6);
    }

    ctx.fillStyle = course.hex;
    ctx.font = `italic 400 64px ${F.serif}`;
    ctx.fillText(s.numeral, L, y + 82);

    ctx.font = `600 20px ${F.sans}`;
    ctx.fillText(course.label.toLocaleUpperCase("tr-TR"), L + 110, y + 40);

    ctx.fillStyle = C.ink;
    ctx.font = `400 ${nameSize}px ${F.serif}`;
    ctx.fillText(fitText(ctx, s.venue.name, R - L - 290), L + 110, y + 40 + nameSize + 4);

    // Time box
    ctx.font = `400 26px ${F.mono}`;
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    roundRect(ctx, R - 112, y + 22, 112, 46, 10);
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.textAlign = "center";
    ctx.fillText(s.slot.time, R - 56, y + 55);
    if (s.venue.score != null) {
      ctx.font = `400 38px ${F.serif}`;
      ctx.textAlign = "right";
      ctx.fillText(formatScore(s.venue.score), R, y + 112);
    }
    ctx.textAlign = "left";
  });

  // Alt bilgi
  const fy = H - M - 64;
  ctx.strokeStyle = C.line;
  ctx.beginPath();
  ctx.moveTo(M, fy - 62);
  ctx.lineTo(W - M, fy - 62);
  ctx.stroke();

  ctx.fillStyle = C.ink;
  ctx.font = `italic 400 58px ${F.serif}`;
  ctx.fillText("Mise", L, fy + 8);
  const w = ctx.measureText("Mise").width;
  ctx.fillStyle = C.pomodoro;
  ctx.fillText(".", L + w + 2, fy + 8);

  ctx.fillStyle = C.ink3;
  ctx.font = `400 22px ${F.mono}`;
  ctx.textAlign = "right";
  const avg = totals.avgScore != null ? `ort. Mise ${formatScore(totals.avgScore)} · ` : "";
  ctx.fillText(`${avg}Günün, yerli yerinde.`, R, fy);
  ctx.textAlign = "left";

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
