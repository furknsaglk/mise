"use client";

import { useEffect, useRef, useState } from "react";
import { loadPlacesUiKit, hasGoogleBrowserKey } from "@/lib/googleMapsLoader";
import styles from "./GooglePlaceCard.module.css";

const TIMEOUT_MS = 12000;

// Place card rendered by Google itself (Places UI Kit). Rating, review count and (in the full card)
// reviews come live from Google; Mise never sees or stores this data.
//   variant="compact" → map popup (photo, rating, type, price, open/closed)
//   variant="full"    → venue card details (rating + reviews)
// Each render counts as 1 card load at Google; the free daily limit is enforced by a Cloud quota.
export default function GooglePlaceCard({ placeId, variant = "compact" }) {
  const ref = useRef(null);
  const [state, setState] = useState("loading"); // loading | ready | error

  useEffect(() => {
    if (!placeId || !hasGoogleBrowserKey()) return;
    let cancelled = false;
    setState("loading");

    const el = ref.current;
    const timer = setTimeout(() => !cancelled && setState((s) => (s === "loading" ? "error" : s)), TIMEOUT_MS);
    const onLoad = () => !cancelled && setState("ready");
    const onError = () => !cancelled && setState("error");

    // Attach listeners BEFORE the library loads so the event isn't missed if the card loads very fast
    el?.addEventListener("gmp-load", onLoad);
    el?.addEventListener("gmp-error", onError);
    loadPlacesUiKit().catch(onError);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      el?.removeEventListener("gmp-load", onLoad);
      el?.removeEventListener("gmp-error", onError);
    };
  }, [placeId]);

  if (!placeId || !hasGoogleBrowserKey()) return null;

  if (state === "error") {
    return (
      <p className={styles.error}>
        Google kartı şu an gösterilemiyor (bugünkü ücretsiz kart sınırı dolmuş olabilir).
      </p>
    );
  }

  const content = (
    <gmp-place-content-config>
      {variant === "compact" && <gmp-place-media></gmp-place-media>}
      <gmp-place-rating></gmp-place-rating>
      <gmp-place-type></gmp-place-type>
      <gmp-place-price></gmp-place-price>
      <gmp-place-open-now-status></gmp-place-open-now-status>
      {variant === "full" && <gmp-place-reviews></gmp-place-reviews>}
      <gmp-place-attribution light-scheme-color="gray" dark-scheme-color="white"></gmp-place-attribution>
    </gmp-place-content-config>
  );

  return (
    <div className={styles.wrap} data-variant={variant} data-state={state}>
      {state === "loading" && <div className={styles.skeleton} aria-label="Google kartı yükleniyor" />}
      {variant === "compact" ? (
        <gmp-place-details-compact ref={ref} orientation="vertical" className={styles.element}>
          <gmp-place-details-place-request place={placeId}></gmp-place-details-place-request>
          {content}
        </gmp-place-details-compact>
      ) : (
        <gmp-place-details ref={ref} className={styles.element}>
          <gmp-place-details-place-request place={placeId}></gmp-place-details-place-request>
          {content}
        </gmp-place-details>
      )}
    </div>
  );
}
