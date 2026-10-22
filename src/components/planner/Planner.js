"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import CourseBuilder from "./CourseBuilder";
import Itinerary from "./Itinerary";
import ExportPanel from "@/components/integrations/ExportPanel";
import LocationSearch from "@/components/venues/LocationSearch";
import usePlan from "@/hooks/usePlan";
import useVenues from "@/hooks/useVenues";
import useGeolocation from "@/hooks/useGeolocation";
import useWalkingRoute from "@/hooks/useWalkingRoute";
import useWeather from "@/hooks/useWeather";
import WeatherStrip from "@/components/insights/WeatherStrip";
import QuotaNotice from "@/components/insights/QuotaNotice";
import { planActions } from "@/lib/planStore";
import { planDay, schedule } from "@/lib/routing/optimizer";
import { reverseLabel } from "@/lib/geo";
import styles from "./Planner.module.css";

const PlanMap = dynamic(() => import("./PlanMap"), {
  ssr: false,
  loading: () => <div className={styles.mapSkeleton} />,
});

// Replaces estimated legs with the real walking route's distances/durations.
function withRealLegs(stops, legs) {
  let i = 0;
  return stops.map((stop) => {
    if (!stop.venue || !stop.leg) return stop;
    const real = legs[i++];
    return real ? { ...stop, leg: { ...stop.leg, km: real.km, minutes: real.minutes } } : stop;
  });
}

// The brain of the DAY MENU screen
export default function Planner() {
  const plan = usePlan();
  const [focusedId, setFocusedId] = useState(null);
  const { locate, status: geoStatus } = useGeolocation();

  const center = useMemo(() => ({ lat: plan.place.lat, lng: plan.place.lng }), [plan.place.lat, plan.place.lng]);
  const start = plan.startAtCenter ? center : null;
  const { venues, loading, fetchedAt, googleStatus } = useVenues(center, plan.radiusKm, plan.place.at);
  const weather = useWeather(center, plan.date, plan.place.at);

  // Pinned venues are stored in the browser; swap in the freshly fetched version when available
  const slots = useMemo(
    () =>
      plan.slots.map((s) => {
        const fresh = s.pinned && venues.find((v) => v.id === s.pinned.id);
        return fresh ? { ...s, pinned: fresh } : s;
      }),
    [plan.slots, venues]
  );

  // 1) Find the best combination (straight-line distances + weather, sunset, busyness)
  const base = useMemo(
    () => planDay({ slots, venues, start, weather, date: plan.date }),
    [slots, venues, start, weather, plan.date]
  );

  // 2) Fetch the real walking route for the chosen stops
  const routePoints = useMemo(
    () => [...(start ? [start] : []), ...base.stops.filter((s) => s.venue).map((s) => s.venue)],
    [base, start]
  );
  const route = useWalkingRoute(routePoints);

  // 3) Recompute the schedule with real durations
  const result = useMemo(() => {
    const expected = routePoints.length - 1;
    return route && route.legs.length === expected ? schedule(withRealLegs(base.stops, route.legs)) : base;
  }, [base, route, routePoints.length]);

  const pickPlace = (place) => planActions.setPlace({ label: place.label, lat: place.lat, lng: place.lng });

  const handleLocate = async () => {
    const point = await locate();
    if (!point) return;
    planActions.setPlace({ label: "Konumum", ...point });
    const label = await reverseLabel(point);
    if (label) planActions.renamePlace(point, label);
  };

  return (
    <div className={styles.planner}>
      <header className={styles.head}>
        <div>
          <span className="eyebrow">Planlayıcı</span>
          <h1 className={styles.title}>
            Günün <em>Menüsü</em>
          </h1>
        </div>
        <div className={styles.search}>
          <p className={styles.lede}>
            Servisleri sırala; Mise puanı, açık saatleri ve yürüme mesafesini birlikte tartıp günün en iyi
            kombinasyonunu kursun.
          </p>
          <LocationSearch onSelect={pickPlace} onLocate={handleLocate} locating={geoStatus === "loading"} />
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.builder}>
          <CourseBuilder plan={plan} />
        </div>

        <div className={styles.ticket}>
          <div className={styles.weather}>
            <WeatherStrip weather={weather} mode="day" />
            {!loading && <QuotaNotice status={googleStatus} />}
            {!loading && fetchedAt && (
              <p className={`${styles.fresh} mono`}>
                Canlı veri · güncellendi {new Date(fetchedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
          <Itinerary
            plan={result}
            place={plan.place}
            start={start}
            routed={Boolean(route)}
            loading={loading}
            focusedId={focusedId}
            onFocus={setFocusedId}
          />
          {!loading && <ExportPanel result={result} place={plan.place} date={plan.date} start={start} />}
        </div>

        <div className={styles.map}>
          <PlanMap start={start} stops={loading ? [] : result.stops} route={route} focusedId={focusedId} onFocus={setFocusedId} />
        </div>
      </div>
    </div>
  );
}
