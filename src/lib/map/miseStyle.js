// MISE MAP STYLE
// Downloads OpenFreeMap's free "Positron" style and recolors every layer
// with the Mise palette: cream paper background, olive parks,
// pale sea-green water. Also produces a dark variant for dark mode.

const BASE_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

const PALETTES = {
  light: {
    background: "#f1ebe0",
    residential: "#ece5d8",
    park: "#e1e3c8",
    wood: "#dfe2c6",
    water: "#cddad6",
    building: "#e5dccb",
    road: "#fbf8f2",
    roadMajor: "#fffdf8",
    casing: "#e0d5c2",
    rail: "#d6cbb8",
    boundary: "#c9bca7",
    label: "#6b6159",
    labelMajor: "#3d3631",
    halo: "#f4efe6",
  },
  dark: {
    background: "#17130f",
    residential: "#1a1613",
    park: "#1d1f16",
    wood: "#1c1e15",
    water: "#0f1a1c",
    building: "#221d19",
    road: "#2a241f",
    roadMajor: "#352d27",
    casing: "#1f1a16",
    rail: "#2c2621",
    boundary: "#3a322c",
    label: "#8c837a",
    labelMajor: "#c3b8ab",
    halo: "#14110f",
  },
};

let baseStylePromise;

function fetchBaseStyle() {
  baseStylePromise ??= fetch(BASE_STYLE_URL).then((res) => {
    if (!res.ok) throw new Error("Failed to load the map style");
    return res.json();
  });
  return baseStylePromise;
}

function paintFor(layer, p) {
  const id = layer.id;

  if (layer.type === "background") return { "background-color": p.background };

  if (layer.type === "fill") {
    if (id === "water") return { "fill-color": p.water };
    if (id === "park") return { "fill-color": p.park };
    if (id.includes("wood")) return { "fill-color": p.wood };
    if (id.includes("residential")) return { "fill-color": p.residential };
    if (id === "building") return { "fill-color": p.building, "fill-outline-color": p.building };
    if (id.includes("aeroway") || id.includes("pier")) return { "fill-color": p.residential };
    return null;
  }

  if (layer.type === "line") {
    if (id === "waterway") return { "line-color": p.water };
    if (id.startsWith("railway")) return { "line-color": p.rail };
    if (id.startsWith("boundary")) return { "line-color": p.boundary };
    if (id.includes("casing")) return { "line-color": p.casing };
    if (id.includes("major") || id.includes("motorway")) return { "line-color": p.roadMajor };
    if (id.startsWith("highway") || id.startsWith("road") || id.startsWith("tunnel") || id.startsWith("aeroway"))
      return { "line-color": p.road };
    return null;
  }

  if (layer.type === "symbol") {
    const major = id.includes("city") || id.includes("country") || id.includes("state");
    return { "text-color": major ? p.labelMajor : p.label, "text-halo-color": p.halo };
  }

  return null;
}

export async function loadMiseStyle(mode = "light") {
  const base = await fetchBaseStyle();
  const palette = PALETTES[mode] ?? PALETTES.light;
  const style = structuredClone(base);

  style.layers = style.layers.map((layer) => {
    const paint = paintFor(layer, palette);
    return paint ? { ...layer, paint: { ...layer.paint, ...paint } } : layer;
  });

  return style;
}
