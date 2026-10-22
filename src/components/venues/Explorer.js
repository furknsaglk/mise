"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import FilterBar from "./FilterBar";
import VenueCard from "./VenueCard";
import LocationSearch from "./LocationSearch";
import Badge from "@/components/ui/Badge";
import TodayStamp from "@/components/ui/TodayStamp";
import useVenues from "@/hooks/useVenues";
import useGeolocation from "@/hooks/useGeolocation";
import usePlan from "@/hooks/usePlan";
import useWeather from "@/hooks/useWeather";
import WeatherStrip from "@/components/insights/WeatherStrip";
import QuotaNotice from "@/components/insights/QuotaNotice";
import DemoNotice from "@/components/insights/DemoNotice";
import { planActions } from "@/lib/planStore";
import { reverseLabel } from "@/lib/geo";
import { venueOpenAt, weekdayIn, minutesNowIn } from "@/lib/time";
import styles from "./Explorer.module.css";

// The map only works in the browser, so it is loaded on the client, not on the server.
const MapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => <div className={styles.mapSkeleton} />,
});

const DEFAULT_FILTERS = {
  course: "all",
  verifiedOnly: false,
  openNow: false,
  maxPrice: 4,
  radiusKm: 2,
  sort: "score",
};

const SOURCE_LABELS = { osm: "OpenStreetMap", google: "Google", foursquare: "Foursquare", demo: "Kurgusal demo verisi" };

// The brain of the DISCOVER screen: location, filters, map and list come together here.
export default function Explorer() {
  // The location lives in the store shared with the planner (Lisbon on first visit).
  const { place } = usePlan();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);

  const center = useMemo(() => ({ lat: place.lat, lng: place.lng }), [place.lat, place.lng]);
  const { venues, sources, googleStatus, fetchedAt, loading, error } = useVenues(center, filters.radiusKm, place.at);
  const weather = useWeather(center, null, place.at);
  const { locate, status: geoStatus } = useGeolocation();
  const cardRefs = useRef({});

  const visible = useMemo(() => {
    const list = venues.filter(
      (v) =>
        (filters.course === "all" || v.course === filters.course) &&
        (!filters.verifiedOnly || v.verified) &&
        (v.price == null || v.price <= filters.maxPrice) &&
        (!filters.openNow || venueOpenAt(v, weekdayIn(v.tz), minutesNowIn(v.tz)) === true)
    );
    return filters.sort === "distance" ? [...list].sort((a, b) => a.distanceKm - b.distanceKm) : list;
  }, [venues, filters]);

  // When a marker is clicked on the map, scroll its card into view.
  useEffect(() => {
    if (selectedId) cardRefs.current[selectedId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  const goTo = (next) => {
    planActions.setPlace(next);
    setSelectedId(null);
  };

  // Find the name of the tapped point / dropped pin (e.g. "Moda, Kadıköy").
  const dropPin = async (point) => {
    goTo({ label: "Seçilen nokta", ...point });
    const label = await reverseLabel(point);
    if (label) planActions.renamePlace(point, label);
  };

  const handleLocate = async () => {
    const point = await locate();
    if (point) dropPin(point);
  };

  return (
    <div className={styles.explorer}>
      <section className={styles.panel}>
        <div className={`${styles.masthead} eyebrow`}>
          <span>No. 001 — Avrupa Gastronomi Rehberi</span>
          <TodayStamp />
        </div>

        <h1 className={styles.title}>
          Bugün nerede <em>yiyoruz?</em>
        </h1>

        <LocationSearch
          onSelect={(p) => goTo({ label: p.label, lat: p.lat, lng: p.lng })}
          onLocate={handleLocate}
          locating={geoStatus === "loading"}
        />
        {geoStatus === "denied" && <p className={styles.note}>Konum izni verilmedi; arama yapabilir ya da haritaya dokunabilirsin.</p>}

        <WeatherStrip weather={weather} mode="now" placeName={place.label.split(",")[0]} />

        <DemoNotice />

        <FilterBar filters={filters} onChange={setFilters} />

        {!loading && <QuotaNotice status={googleStatus} />}

        <div className={styles.resultsHead}>
          <p>
            <strong>{loading ? "…" : visible.length}</strong> mekan
            <span className="mono"> · {place.label} · {filters.radiusKm} km</span>
          </p>
          {!loading && sources.length > 0 && <Badge>{sources.map((s) => SOURCE_LABELS[s]).join(" + ")}</Badge>}
        </div>
        {!loading && fetchedAt && (
          <p className={`${styles.fresh} mono`}>
            Canlı veri · güncellendi {new Date(fetchedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}

        <div className={styles.list} aria-busy={loading}>
          {error && <p className={styles.empty}>{error}</p>}

          {loading && [0, 1, 2].map((i) => <div key={i} className={styles.skeleton} />)}

          {!loading && !error && visible.length === 0 && (
            <div className={styles.empty}>
              <h3>Burada henüz masa yok.</h3>
              <p>
                {venues.length === 0
                  ? "Bu çevrede kayıtlı mekan bulamadık. Yarıçapı büyütmeyi ya da yakındaki bir mahalleyi aramayı dene."
                  : "Filtreler biraz sıkı olabilir. Birkaçını gevşetmeyi dene."}
              </p>
            </div>
          )}

          {!loading &&
            visible.map((venue) => (
              <VenueCard
                key={venue.id}
                ref={(el) => {
                  // Drop the ref when the card unmounts (so stale entries don't pile up across searches)
                  if (el) cardRefs.current[venue.id] = el;
                  else delete cardRefs.current[venue.id];
                }}
                venue={venue}
                selected={venue.id === selectedId}
                onSelect={setSelectedId}
                onHover={setHoveredId}
              />
            ))}
        </div>
      </section>

      <section className={styles.mapCol} aria-label="Harita">
        <MapCanvas
          center={center}
          radiusKm={filters.radiusKm}
          venues={loading ? [] : visible}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={setSelectedId}
          onMoveCenter={dropPin}
        />
      </section>
    </div>
  );
}
