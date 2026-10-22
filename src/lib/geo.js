// Finds a readable name for a point picked on the map (e.g. "Moda, Caferağa").
export async function reverseLabel(point) {
  try {
    const res = await fetch(`/api/geocode?lat=${point.lat}&lng=${point.lng}`);
    const { places } = await res.json();
    return places?.[0]?.label ?? null;
  } catch {
    return null;
  }
}
