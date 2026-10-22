import { reversePlace } from "@/lib/dataClient";

// Finds a readable name for a point picked on the map (e.g. "Moda, Caferağa").
export async function reverseLabel(point) {
  try {
    return (await reversePlace(point))?.label ?? null;
  } catch {
    return null;
  }
}
