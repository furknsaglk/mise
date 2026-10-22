"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import { loadMiseStyle } from "@/lib/map/miseStyle";
import { withBase } from "@/lib/basePath";

// MapLibre 6 loads its web worker from a separate module file. After bundling it can't find that
// file next to itself, so point it to the copy served from our own origin
// (copied by scripts/copy-maplibre-worker.mjs before dev/build).
let workerConfigured = false;
function configureWorker() {
  if (workerConfigured) return;
  setWorkerUrl(new URL(withBase("/vendor/maplibre-gl-worker.mjs"), window.location.origin).href);
  workerConfigured = true;
}

const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';

// Places a vector basemap, recolored with the Mise palette, underneath the Leaflet map.
export default function VectorBasemap({ dark }) {
  const map = useMap();

  useEffect(() => {
    let layer;
    let cancelled = false;

    loadMiseStyle(dark ? "dark" : "light")
      .then((style) => {
        if (cancelled) return;
        configureWorker();
        layer = maplibreGL({ style, attribution: ATTRIBUTION, interactive: false }).addTo(map);
      })
      .catch((err) => console.error(err));

    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map, dark]);

  return null;
}
