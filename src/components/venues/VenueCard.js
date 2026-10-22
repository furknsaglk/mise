"use client";

import { forwardRef, useState } from "react";
import Link from "next/link";
import ReviewList from "./ReviewList";
import GooglePlaceCard from "./GooglePlaceCard";
import { googlePlaceIdFor } from "@/lib/googlePlaceLinks";
import { planActions, todayIso } from "@/lib/planStore";
import BusynessBars from "@/components/insights/BusynessBars";
import { busynessCurve } from "@/lib/insights/busyness";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { getCourse, COURSES, toRoman } from "@/lib/courses";
import { formatScore, formatCount } from "@/lib/scoring/miseScore";
import { formatDistance, walkingMinutes } from "@/lib/routing/distance";
import { openStatus, minutesNowIn } from "@/lib/time";
import { googleMapsPlace } from "@/lib/integrations/deepLinks";
import styles from "./VenueCard.module.css";

const VenueCard = forwardRef(function VenueCard({ venue, selected, onSelect, onHover }, ref) {
  const course = getCourse(venue.course);
  const numeral = toRoman(COURSES.indexOf(course) + 1);
  const status = openStatus(venue);
  const rated = venue.score != null;
  const [added, setAdded] = useState(false);
  // Venue without its own Google data but with a matched Google ID → Google's card (computed only while open)
  const googleCardId = selected && venue.origin !== "google" ? googlePlaceIdFor(venue) : null;

  return (
    <article
      ref={ref}
      className={styles.card}
      data-selected={selected || undefined}
      style={{ "--accent": course.color }}
      onMouseEnter={() => onHover?.(venue.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <button className={styles.main} onClick={() => onSelect(selected ? null : venue.id)} aria-expanded={selected}>
        <div className={styles.photo}>
          {venue.photo ? (
            <img src={venue.photo} alt="" loading="lazy" />
          ) : (
            // Venues without a photo: typographic cover with the course numeral + initial
            <div className={styles.cover} aria-hidden>
              <span>{numeral}</span>
              <b>{venue.name.charAt(0)}</b>
            </div>
          )}
        </div>

        <div className={styles.body}>
          <div className={styles.kicker}>
            <span className={styles.course}>{course.label}</span>
            {venue.price && <span className="mono">{"€".repeat(venue.price)}</span>}
          </div>
          <h3 className={styles.name}>{venue.name}</h3>
          <p className={styles.meta}>{[venue.area, venue.cuisine].filter(Boolean).join(" · ")}</p>
          <div className={styles.facts}>
            <span className="mono">
              <Icon name="walk" size={13} /> {walkingMinutes(venue.distanceKm)} dk · {formatDistance(venue.distanceKm)}
            </span>
            <span className={styles.status} data-open={status.open || undefined}>
              {status.label}
            </span>
          </div>
        </div>

        <div className={styles.score} title={rated ? "Mise Puanı" : "Bu mekan için henüz puan verisi yok"} data-unrated={!rated || undefined}>
          <strong>{formatScore(venue.score)}</strong>
          <span className="eyebrow">{rated ? "Mise" : "Puan yok"}</span>
        </div>
      </button>

      {selected && (
        <div className={styles.detail}>
          {venue.photoDetail && <img className={styles.hero} src={venue.photoDetail} alt={venue.name} />}
          {venue.blurb && <p className={styles.blurb}>{venue.blurb}</p>}

          <div className={styles.badges}>
            {venue.verified && (
              <Badge tone="verified" icon="check">
                Doğrulandı
              </Badge>
            )}
            {venue.terrace && <Badge tone="weather" icon="sun">Teras</Badge>}
            {venue.cozy && <Badge>Kapalı alan</Badge>}
          </div>

          {rated ? (
            <dl className={styles.sources}>
              {venue.sources.map((s) => (
                <div key={s.id}>
                  <dt className="eyebrow">{s.label}</dt>
                  <dd className="mono">
                    {s.rating.toLocaleString("tr-TR")}
                    <small>/{s.scale}</small>
                    <span>{formatCount(s.count)} yorum</span>
                  </dd>
                </div>
              ))}
            </dl>
          ) : googleCardId ? null : (
            // If Google's card is shown below, a "no score" note would be misleading → hide it
            <p className={styles.unratedNote}>
              {venue.origin === "osm"
                ? "OpenStreetMap kaydı. Google ve Foursquare puanları, API anahtarları eklendiğinde burada görünecek."
                : venue.origin === "foursquare" && venue.popularityRank
                  ? `Foursquare popülerlik sırası: ${venue.popularityRank}. Puan, saat ve fotoğraf Foursquare kredisiyle açılır.`
                  : "Bu mekan için henüz yeterli puan yok."}
              {venue.hoursText && (
                <>
                  <br />
                  <span className="mono">Saatler: {venue.hoursText}</span>
                </>
              )}
            </p>
          )}

          {/* Venue without Google data (e.g. from Foursquare because the quota ran out) that was matched to Google
              earlier → Google's own card shows its rating and reviews live */}
          {googleCardId && (
            <section className={styles.reviews} aria-label="Google puanı ve yorumları">
              <span className="eyebrow">Google puanı ve yorumları</span>
              <GooglePlaceCard placeId={googleCardId} variant="full" />
            </section>
          )}

          {venue.reviews?.length > 0 && (
            <section className={styles.reviews} aria-label="Yorumlar">
              <span className="eyebrow">Ziyaretçiler ne diyor</span>
              <ReviewList reviews={venue.reviews} />
            </section>
          )}

          {(venue.origin === "google" || venue.origin === "foursquare") && (
            <p className={styles.attribution}>
              Veri: {venue.origin === "google" ? "Google Maps" : "Foursquare"}
              {venue.photoCredit && ` · Fotoğraf: ${venue.photoCredit}`}
            </p>
          )}

          <BusynessBars
            curve={busynessCurve(venue, todayIso())}
            highlight={Math.floor(minutesNowIn(venue.tz) / 60)}
            label="Bugün · tahmini yoğunluk"
          />

          <div className={styles.links}>
            {added ? (
              <Link href="/plan" className={styles.added}>
                <Icon name="check" size={15} strokeWidth={2} /> Menüne eklendi · Menüyü gör
              </Link>
            ) : (
              <button
                className={styles.add}
                onClick={() => {
                  planActions.addVenue(venue);
                  setAdded(true);
                }}
              >
                <Icon name="ticket" size={15} /> Menüye ekle
              </button>
            )}
            <a className={styles.link} href={venue.mapsUrl ?? googleMapsPlace(venue)} target="_blank" rel="noreferrer">
              <Icon name="pin" size={15} /> Google Haritalar'da aç
            </a>
            {venue.website && (
              <a className={styles.link} href={venue.website} target="_blank" rel="noreferrer">
                <Icon name="arrow" size={15} /> Web sitesi
              </a>
            )}
          </div>
        </div>
      )}
    </article>
  );
});

export default VenueCard;
