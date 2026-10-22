"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Circle, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import VectorBasemap from "./VectorBasemap";
import VenuePopup from "./VenuePopup";
import popupStyles from "./VenuePopup.module.css";
import usePrefersDark from "@/hooks/usePrefersDark";
import { getCourse } from "@/lib/courses";
import { formatScore } from "@/lib/scoring/miseScore";
import styles from "./MapCanvas.module.css";

// When the center or radius changes, fly the map so the whole search circle is visible.
function FitSearchArea({ center, radiusKm }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLng(center.lat, center.lng).toBounds(radiusKm * 2000);
    map.flyToBounds(bounds, { padding: [24, 24], maxZoom: 16, duration: 0.9 });
  }, [center.lat, center.lng, radiusKm, map]);
  return null;
}

// If the selected venue is off-screen, pan the map to it.
function PanToSelected({ venue }) {
  const map = useMap();
  useEffect(() => {
    if (!venue) return;
    const point = L.latLng(venue.lat, venue.lng);
    if (!map.getBounds().pad(-0.15).contains(point)) map.panTo(point, { duration: 0.6 });
  }, [venue, map]);
  return null;
}

// Tapping the map moves the search center (the pin) there.
// Exception: a tap that just closes an open venue card does NOT start a new search
// (every search is a paid API request).
function ClickToDrop({ onDrop }) {
  const lastPopupClose = useRef(0);
  const popupOpen = useRef(false);
  useMapEvents({
    popupopen: () => {
      popupOpen.current = true;
    },
    popupclose: () => {
      popupOpen.current = false;
      lastPopupClose.current = Date.now();
    },
    click: (e) => {
      if (popupOpen.current || Date.now() - lastPopupClose.current < 400) return;
      onDrop({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// When a venue is selected from the list, open its card on the map too
function OpenSelectedPopup({ selectedId, markerRefs }) {
  useEffect(() => {
    if (!selectedId) return;
    // The marker may have been created in this render: open on the next frame
    const id = requestAnimationFrame(() => markerRefs.current[selectedId]?.openPopup());
    return () => cancelAnimationFrame(id);
  }, [selectedId, markerRefs]);
  return null;
}

const centerIcon = L.divIcon({
  className: "",
  html: `<div class="${styles.centerPin}"><span></span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Cache icons: if a new icon were created for every marker on each render (e.g. while hovering
// the list), react-leaflet would rebuild every marker's DOM. Same content → same object.
const iconCache = new Map();

function venueIcon(venue, active) {
  const key = `${venue.course}|${venue.score ?? "-"}|${active ? 1 : 0}`;
  if (!iconCache.has(key)) iconCache.set(key, buildVenueIcon(venue, active));
  return iconCache.get(key);
}

function buildVenueIcon(venue, active) {
  const course = getCourse(venue.course);
  const rated = venue.score != null;
  // Rated venue: score label. Unrated venue: just a small dot in the course color.
  // Note: only a number (the score) and the app's own color variable go into the HTML — never the venue name (no XSS).
  return L.divIcon({
    className: "",
    html: rated
      ? `<div class="${styles.marker}" style="--accent:${course.color}" ${active ? "data-active" : ""}>
           <i></i>${formatScore(venue.score)}
         </div>`
      : `<div class="${styles.dot}" style="--accent:${course.color}" ${active ? "data-active" : ""}></div>`,
    iconSize: rated ? [52, 26] : [16, 16],
    iconAnchor: rated ? [26, 26] : [8, 8],
  });
}

export default function MapCanvas({ center, radiusKm, venues, selectedId, hoveredId, onSelect, onMoveCenter }) {
  const dark = usePrefersDark();
  const selected = useMemo(() => venues.find((v) => v.id === selectedId), [venues, selectedId]);
  const markerRefs = useRef({});

  return (
    <div className={styles.wrap}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={14}
        className={styles.map}
        zoomControl={false}
        scrollWheelZoom
      >
        <VectorBasemap dark={dark} />

        <Circle
          center={[center.lat, center.lng]}
          radius={radiusKm * 1000}
          pathOptions={{ color: "#d9472b", weight: 1, opacity: 0.5, fillOpacity: 0.04, dashArray: "4 6" }}
        />

        <Marker
          position={[center.lat, center.lng]}
          icon={centerIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const { lat, lng } = e.target.getLatLng();
              onMoveCenter({ lat, lng });
            },
          }}
        />

        {venues.map((venue) => {
          const active = venue.id === selectedId || venue.id === hoveredId;
          return (
            <Marker
              key={venue.id}
              ref={(m) => {
                if (m) markerRefs.current[venue.id] = m;
                else delete markerRefs.current[venue.id];
              }}
              position={[venue.lat, venue.lng]}
              icon={venueIcon(venue, active)}
              zIndexOffset={active ? 1000 : 0}
              eventHandlers={{ click: () => onSelect(venue.id) }}
            >
              {/* Popup content is only rendered while open (react-leaflet) — no overhead for 75 markers */}
              <Popup className={popupStyles.popup} minWidth={260} maxWidth={320} autoPanPadding={[24, 24]}>
                <VenuePopup venue={venue} />
              </Popup>
            </Marker>
          );
        })}

        <FitSearchArea center={center} radiusKm={radiusKm} />
        <PanToSelected venue={selected} />
        <OpenSelectedPopup selectedId={selectedId} markerRefs={markerRefs} />
        <ClickToDrop onDrop={onMoveCenter} />
      </MapContainer>

      <p className={`${styles.hint} mono`}>Haritaya dokun ya da iğneyi sürükle</p>
    </div>
  );
}
