"use client";

import { useState } from "react";
import Ticket from "@/components/ui/Ticket";
import Badge from "@/components/ui/Badge";
import Icon from "@/components/ui/Icon";
import { getCourse, toRoman } from "@/lib/courses";
import { formatScore } from "@/lib/scoring/miseScore";
import { formatDistance, formatDuration } from "@/lib/routing/distance";
import { planActions } from "@/lib/planStore";
import LegLinks from "@/components/integrations/LegLinks";
import BusynessBars from "@/components/insights/BusynessBars";
import styles from "./Itinerary.module.css";

// Walking row between two stops
function Leg({ leg }) {
  return (
    <div className={`${styles.leg} mono`} data-late={leg.late > 0 || undefined}>
      <Icon name="walk" size={14} />
      <span>
        {formatDuration(leg.minutes)} · {formatDistance(leg.km)}
        {leg.fromStart && " · iğneden"}
      </span>
      {leg.digestive && leg.km > 0.6 && <Badge tone="weather">Sindirim yürüyüşü</Badge>}
      {leg.wet && leg.km > 0.2 && (
        <Badge tone="rain" icon="rain">
          Şemsiye al
        </Badge>
      )}
      {leg.late > 0 && <Badge tone="alert">{leg.late} dk geç</Badge>}
      {leg.free >= 45 && (
        <span className={styles.free}>
          <Icon name="clock" size={13} /> {formatDuration(leg.free)} serbest
        </span>
      )}
    </div>
  );
}

// Stop context: weather, sunset, why it was chosen, estimated busyness
function StopInsights({ stop }) {
  const [showBusy, setShowBusy] = useState(false);
  const { weather, busy } = stop;
  const hasAny = weather || stop.sunset || stop.reasons?.length || busy;
  if (!hasAny) return null;

  return (
    <div className={styles.insights}>
      <div className={styles.chips}>
        {weather && (
          <span className={styles.weather} data-wet={weather.wet || undefined}>
            <Icon name={weather.icon} size={14} /> {Math.round(weather.temp)}° {weather.label}
            {weather.rain >= 30 && <span className="mono"> · %{weather.rain}</span>}
          </span>
        )}
        {stop.sunset && (
          <span className={styles.sunset}>
            <Icon name="sunset" size={14} /> Gün batımı {stop.sunset}
          </span>
        )}
        {stop.reasons?.map((r) => (
          <span key={r} className={styles.reason}>
            {r}
          </span>
        ))}
        {busy && (
          <button className={styles.busy} data-level={busy.level.key} onClick={() => setShowBusy((s) => !s)} aria-expanded={showBusy}>
            <Icon name="people" size={14} /> {busy.level.label}
            {busy.tip && <span> · {busy.tip}</span>}
          </button>
        )}
      </div>
      {showBusy && busy && <BusynessBars curve={busy.curve} highlight={busy.hour} />}
    </div>
  );
}

function Stop({ stop, index, active, onFocus, from }) {
  const [showAlts, setShowAlts] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const course = getCourse(stop.slot.course);
  const { venue } = stop;

  return (
    <li className={styles.stop} style={{ "--accent": course.color }} data-active={active || undefined}>
      {stop.leg && <Leg leg={stop.leg} />}

      <div className={styles.row} onMouseEnter={() => onFocus(venue?.id ?? null)} onMouseLeave={() => onFocus(null)}>
        <span className={styles.numeral}>{toRoman(index + 1)}</span>

        <div className={styles.text}>
          <span className={styles.course}>
            {course.label}
            {stop.slot.pinned && <Icon name="lock" size={11} strokeWidth={2.2} />}
          </span>
          {venue ? (
            <>
              <span className={styles.venue}>{venue.name}</span>
              <span className={styles.meta}>{[venue.area, venue.cuisine].filter(Boolean).join(" · ")}</span>
            </>
          ) : (
            <span className={styles.missing}>Bu saatte açık mekan bulunamadı</span>
          )}
        </div>

        <div className={styles.side}>
          <span className={`${styles.time} mono`}>{stop.slot.time}</span>
          {venue && (
            <span className={styles.score} data-unrated={venue.score == null || undefined}>
              {formatScore(venue.score)}
            </span>
          )}
        </div>
      </div>

      {venue && <StopInsights stop={stop} />}

      {venue && (
        <div className={styles.actions}>
          {venue.verified && (
            <Badge tone="verified" icon="check">
              Doğrulandı
            </Badge>
          )}
          {!stop.hoursKnown && <Badge>Saat bilgisi yok</Badge>}
          <button onClick={() => setShowDirections((s) => !s)} aria-expanded={showDirections}>
            <Icon name="map" size={13} /> Yol tarifi
          </button>
          {stop.slot.pinned ? (
            <button onClick={() => planActions.unpin(stop.slot.uid)}>
              <Icon name="lock" size={13} /> Kilidi aç
            </button>
          ) : (
            <>
              <button onClick={() => planActions.pin(stop.slot.uid, venue)}>
                <Icon name="lock" size={13} /> Kilitle
              </button>
              {stop.alternatives.length > 0 && (
                <button onClick={() => setShowAlts((s) => !s)} aria-expanded={showAlts}>
                  <Icon name="swap" size={13} /> Alternatifler
                </button>
              )}
            </>
          )}
        </div>
      )}

      {showDirections && venue && <LegLinks from={from} to={venue} />}

      {showAlts && (
        <ul className={styles.alts}>
          {stop.alternatives.map((alt) => (
            <li key={alt.id}>
              <button
                onClick={() => {
                  planActions.pin(stop.slot.uid, alt);
                  setShowAlts(false);
                }}
              >
                <span className={styles.altName}>{alt.name}</span>
                <span className="mono">
                  {formatScore(alt.score)} · {alt.extraKm >= 0 ? "+" : "−"}
                  {formatDistance(Math.abs(alt.extraKm))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// DAY MENU ticket
export default function Itinerary({ plan, place, start, routed, loading, focusedId, onFocus }) {
  const { totals } = plan;

  // Previous point for each stop (start of its directions)
  const fromPoints = [];
  let prev = start ? { ...start, name: "Başlangıç" } : null;
  for (const stop of plan.stops) {
    fromPoints.push(prev);
    if (stop.venue) prev = stop.venue;
  }

  return (
    <Ticket
      className={styles.ticket}
      eyebrow={`Günün Menüsü · ${totals.stops} servis`}
      title={place.label.split(",")[0]}
      meta={
        <>
          {formatDistance(totals.km)} yürüyüş
          <br />
          {formatDuration(totals.minutes)}
        </>
      }
      footer={
        <>
          <div className={styles.summary}>
            {totals.avgScore != null && (
              <span>
                <strong>{formatScore(totals.avgScore)}</strong> ort. Mise
              </span>
            )}
            {totals.verified > 0 && <Badge tone="verified" icon="check">{totals.verified} doğrulanmış</Badge>}
          </div>
          <span className="mono">{routed ? "Gerçek yürüme rotası" : "Kuş uçuşu tahmin"}</span>
        </>
      }
    >
      {loading && <p className={styles.loading}>Çevredeki mekanlar taranıyor…</p>}

      {!loading && plan.warnings.length > 0 && (
        <ul className={styles.warnings}>
          {plan.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {!loading && (
        <ol className={styles.stops}>
          {plan.stops.map((stop, i) => (
            <Stop
              key={stop.slot.uid}
              stop={stop}
              index={i}
              from={fromPoints[i]}
              active={stop.venue && stop.venue.id === focusedId}
              onFocus={onFocus}
            />
          ))}
        </ol>
      )}
    </Ticket>
  );
}
