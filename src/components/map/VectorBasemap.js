"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import { loadMiseStyle } from "@/lib/map/miseStyle";

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
