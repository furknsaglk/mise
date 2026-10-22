import { getCourse, toRoman } from "@/lib/courses";
import { formatDistance, formatDuration } from "@/lib/routing/distance";

// Download the file to the device ("Downloads" on desktop, share/open sheet on iPhone)
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// The phone's native share sheet (WhatsApp, Messages, Instagram…); otherwise download.
export async function shareOrDownloadFile(blob, filename, { title, text } = {}) {
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return "shared";
    } catch (err) {
      if (err.name === "AbortError") return "cancelled";
    }
  }
  downloadBlob(blob, filename);
  return "downloaded";
}

// Share text; if there is no share sheet, copy it to the clipboard.
export async function shareOrCopyText({ title, text }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (err) {
      if (err.name === "AbortError") return "cancelled";
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

// Plain-text plan for WhatsApp/Messages
export function planAsText({ stops, place, date, routeUrl }) {
  const day = new Date(`${date}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  const lines = [`🍽 Günün Menüsü — ${place.label.split(",")[0]} (${day})`, ""];
  stops.forEach((s, i) => {
    if (!s.venue) return;
    if (s.leg && i > 0) lines.push(`   ↓ ${formatDuration(s.leg.minutes)} yürüyüş · ${formatDistance(s.leg.km)}`);
    lines.push(`${toRoman(i + 1)}. ${s.slot.time}  ${getCourse(s.slot.course).label} — ${s.venue.name}`);
  });
  if (routeUrl) lines.push("", `Rota: ${routeUrl}`);
  lines.push("", "Mise ile planlandı.");
  return lines.join("\n");
}
