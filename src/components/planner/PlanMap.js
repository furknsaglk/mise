"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import VenuePopup from "@/components/map/VenuePopup";
import popupStyles from "@/components/map/VenuePopup.module.css";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import VectorBasemap from "@/components/map/VectorBasemap";
import usePrefersDark from "@/hooks/usePrefersDark";
import { getCourse, toRoman } from "@/lib/courses";
import styles from "./PlanMap.module.css";

const startIcon = L.divIcon({
  className: "",
  html: `<div class="${styles.start}"><span></span></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Same numeral/color/state → same icon object (avoids needless DOM rebuilds)
const iconCache = new Map();
function stopIcon(numeral, color, active) {
  const key = `${numeral}|${color}|${active ? 1 : 0}`;
  if (!iconCache.has(key)) iconCache.set(key, buildStopIcon(numeral, color, active));
  return iconCache.get(key);
}

function buildStopIcon(numeral, color, active) {
  return L.divIcon({
    className: "",
    html: `<div class="${styles.stop}" style="--accent:${color}" ${active ? "data-active" : ""}>${numeral}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

// Fit all stops on screen whenever the plan changes.
function FitStops({ points }) {
  const map = useMap();
  const key = points.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join("|");
  useEffect(() => {
    if (!points.length) return;
    map.invalidateSize(); // re-measure the map once the page layout has settled
    if (points.length === 1) map.flyTo(points[0], 16, { duration: 0.8 });
    else map.flyToBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 16, duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export default function PlanMap({ start, stops, route, focusedId, onFocus }) {
  const dark = usePrefersDark();
  const placed = stops.map((s, i) => ({ ...s, index: i })).filter((s) => s.venue);
  const points = [...(start ? [[start.lat, start.lng]] : []), ...placed.map((s) => [s.venue.lat, s.venue.lng])];
  const line = route?.line ?? points;

  return (
    <div className={styles.wrap}>
      <MapContainer center={points[0] ?? [38.7223, -9.1393]} zoom={14} className={styles.map} zoomControl={false} scrollWheelZoom>
        <VectorBasemap dark={dark} />

        {line.length > 1 && (
          <>
            <Polyline positions={line} pathOptions={{ color: dark ? "#14110f" : "#fbf8f2", weight: 8, opacity: 0.9 }} />
            <Polyline
              positions={line}
              pathOptions={{ color: "#d9472b", weight: 4, opacity: 0.95, dashArray: route ? null : "2 8", lineCap: "round" }}
            />
          </>
        )}

        {start && <Marker position={[start.lat, start.lng]} icon={startIcon} interactive={false} />}

        {placed.map((s) => (
          <Marker
            key={s.slot.uid}
            position={[s.venue.lat, s.venue.lng]}
            icon={stopIcon(toRoman(s.index + 1), getCourse(s.slot.course).color, s.venue.id === focusedId)}
            zIndexOffset={s.venue.id === focusedId ? 1000 : 100}
            eventHandlers={{ mouseover: () => onFocus(s.venue.id), mouseout: () => onFocus(null) }}
          >
            <Popup className={popupStyles.popup} minWidth={260} maxWidth={320} autoPanPadding={[24, 24]}>
              <VenuePopup venue={s.venue} numeral={toRoman(s.index + 1)} time={s.slot.time} />
            </Popup>
          </Marker>
        ))}

        <FitStops points={points} />
      </MapContainer>
    </div>
  );
}
