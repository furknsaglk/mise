import ReviewList, { Stars } from "@/components/venues/ReviewList";
import GooglePlaceCard from "@/components/venues/GooglePlaceCard";
import { googlePlaceIdFor } from "@/lib/googlePlaceLinks";
import { getCourse } from "@/lib/courses";
import { formatScore, formatCount, SOURCES } from "@/lib/scoring/miseScore";
import { openStatus } from "@/lib/time";
import { googleMapsPlace } from "@/lib/integrations/deepLinks";
import styles from "./VenuePopup.module.css";

// Card shown when a map marker is clicked: scores, short description and real reviews.
// Shared by the Discover and Day Menu maps.
export default function VenuePopup({ venue, numeral, time }) {
  const course = getCourse(venue.course);
  const status = openStatus(venue);
  const rated = venue.score != null;
  const googleCardId = venue.origin !== "google" ? googlePlaceIdFor(venue) : null;
  const blurb = venue.blurb && venue.blurb.length > 150 ? `${venue.blurb.slice(0, 150).replace(/\s+\S*$/, "")}…` : venue.blurb;

  return (
    <div className={styles.card} style={{ "--accent": course.color }}>
      <div className={styles.kicker}>
        {numeral && <span className={styles.numeral}>{numeral}</span>}
        <span className={styles.course}>{course.label}</span>
        {time && <span className="mono">{time}</span>}
        {venue.price && <span className="mono">{"€".repeat(venue.price)}</span>}
      </div>

      <h3 className={styles.name}>{venue.name}</h3>
      <p className={styles.meta}>{[venue.area, venue.cuisine].filter(Boolean).join(" · ")}</p>

      {/* If there is no score and Google's card will be shown, don't repeat the "no score" box */}
      {(rated || !googleCardId) && (
      <div className={styles.scores}>
        <div className={styles.mise} data-unrated={!rated || undefined}>
          <strong>{formatScore(venue.score)}</strong>
          <span className="eyebrow">{rated ? "Mise" : "Puan yok"}</span>
        </div>
        <div className={styles.sources}>
          {(venue.sources ?? []).map((s) => (
            <div key={s.id} className={styles.source}>
              <span className={styles.sourceName}>{SOURCES[s.id]?.label ?? s.label}</span>
              {s.scale === 5 ? <Stars value={s.rating} size={11} /> : null}
              <span className="mono">
                {s.rating.toLocaleString("tr-TR")}/{s.scale} · {formatCount(s.count)} yorum
              </span>
            </div>
          ))}
          {!rated && venue.popularityRank && (
            <span className={styles.note}>Foursquare popülerlik sırası: {venue.popularityRank}</span>
          )}
          <span className={styles.status} data-open={status.open || undefined}>
            {status.label}
          </span>
        </div>
      </div>
      )}

      {blurb && <p className={styles.blurb}>{blurb}</p>}

      <ReviewList reviews={venue.reviews} compact limit={2} />

      {/* No Google data but a matched Google place ID: Google's own card (live rating) */}
      {googleCardId && <GooglePlaceCard placeId={googleCardId} variant="compact" />}

      <div className={styles.footer}>
        <a href={venue.mapsUrl ?? googleMapsPlace(venue)} target="_blank" rel="noreferrer">
          {venue.reviews?.length ? "Tüm yorumlar Google'da" : "Google Haritalar'da aç"} →
        </a>
        {venue.origin === "google" && <span>Veri: Google Maps</span>}
        {venue.origin === "foursquare" && <span>Veri: Foursquare</span>}
      </div>
    </div>
  );
}
