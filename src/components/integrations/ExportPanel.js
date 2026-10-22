"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/Icon";
import { googleMapsRoute } from "@/lib/integrations/deepLinks";
import { planEvents, buildIcs, googleCalendarLink } from "@/lib/integrations/calendar";
import { renderShareCard } from "@/lib/integrations/shareCard";
import { downloadBlob, shareOrDownloadFile, shareOrCopyText, planAsText } from "@/lib/integrations/share";
import styles from "./ExportPanel.module.css";

const MESSAGES = {
  ics: "Takvim dosyası indirildi. Açınca tüm gün takvimine eklenir.",
  shared: "Paylaşıldı.",
  copied: "Plan panoya kopyalandı; WhatsApp'a yapıştırabilirsin.",
  downloaded: "Görsel indirildi.",
  failed: "Bu tarayıcı paylaşımı desteklemiyor.",
};

// TAKE YOUR DAY WITH YOU: send the plan to maps, calendars and friends.
export default function ExportPanel({ result, place, date, start }) {
  const [message, setMessage] = useState(null);
  const [showGcal, setShowGcal] = useState(false);
  const [card, setCard] = useState(null); // { blob, url }
  const [busy, setBusy] = useState(false);

  const placed = result.stops.filter((s) => s.venue);
  const routeUrl = useMemo(
    () => googleMapsRoute([...(start ? [start] : []), ...placed.map((s) => s.venue)]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result, start]
  );
  const events = useMemo(() => (date ? planEvents(result.stops, date) : []), [result, date]);
  const slug = place.label.split(",")[0].toLowerCase().replace(/[^a-z0-9ğüşıöç]+/gi, "-");

  useEffect(() => () => card && URL.revokeObjectURL(card.url), [card]);

  if (!placed.length) return null;

  const notify = (key) => {
    if (key === "cancelled") return;
    setMessage(MESSAGES[key]);
    setTimeout(() => setMessage(null), 4000);
  };

  const downloadIcs = () => {
    const ics = buildIcs(events, `Mise — ${place.label.split(",")[0]}`);
    downloadBlob(new Blob([ics], { type: "text/calendar;charset=utf-8" }), `mise-${slug}-${date}.ics`);
    notify("ics");
  };

  const makeCard = async () => {
    setBusy(true);
    try {
      const blob = await renderShareCard({ stops: result.stops, place, date, totals: result.totals });
      setCard({ blob, url: URL.createObjectURL(blob) });
    } finally {
      setBusy(false);
    }
  };

  const shareCard = async () => {
    const status = await shareOrDownloadFile(card.blob, `mise-${slug}-${date}.png`, { title: "Günün Menüsü" });
    notify(status);
  };

  const shareText = async () => {
    const status = await shareOrCopyText({ title: "Günün Menüsü", text: planAsText({ stops: result.stops, place, date, routeUrl }) });
    notify(status);
  };

  return (
    <section className={styles.panel} aria-label="Dışa aktar">
      <div className={styles.head}>
        <h2>Gününü taşı</h2>
        <span className="eyebrow">Entegrasyonlar</span>
      </div>

      <div className={styles.grid}>
        <a className={styles.tile} href={routeUrl} target="_blank" rel="noreferrer">
          <Icon name="map" size={22} />
          <strong>Google Haritalar</strong>
          <span>Tüm rota, yürüyüş modunda</span>
        </a>

        <button className={styles.tile} onClick={downloadIcs}>
          <Icon name="calendar" size={22} />
          <strong>Takvime ekle</strong>
          <span>Apple, Outlook, Google · hatırlatmalı</span>
        </button>

        <button className={styles.tile} onClick={() => setShowGcal((s) => !s)} aria-expanded={showGcal}>
          <Icon name="calendar" size={22} />
          <strong>Google Takvim</strong>
          <span>Servis servis tek tıkla</span>
        </button>

        <button className={styles.tile} onClick={makeCard} disabled={busy}>
          <Icon name="image" size={22} />
          <strong>{busy ? "Hazırlanıyor…" : "Menü kartı"}</strong>
          <span>Instagram & WhatsApp için görsel</span>
        </button>

        <button className={`${styles.tile} ${styles.wide}`} onClick={shareText}>
          <Icon name="share" size={22} />
          <strong>Planı paylaş</strong>
          <span>WhatsApp, Mesajlar ya da panoya kopyala</span>
        </button>
      </div>

      {showGcal && (
        <ul className={styles.gcal}>
          {events.map((e) => (
            <li key={e.uid}>
              <a href={googleCalendarLink(e)} target="_blank" rel="noreferrer">
                <span>{e.title}</span>
                <Icon name="arrow" size={14} />
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className={styles.hint}>
        Apple Haritalar, Citymapper ve Uber için her duraktaki <strong>Yol tarifi</strong> butonunu kullan.
      </p>

      {message && (
        <p className={styles.toast} role="status">
          <Icon name="check" size={15} strokeWidth={2} /> {message}
        </p>
      )}

      {card && (
        <div className={styles.overlay} role="dialog" aria-label="Menü kartı" onClick={() => setCard(null)}>
          <div className={styles.preview} onClick={(e) => e.stopPropagation()}>
            <img src={card.url} alt="Günün menüsü paylaşım kartı" />
            <div className={styles.previewActions}>
              <button className={styles.primary} onClick={shareCard}>
                <Icon name="share" size={16} /> Paylaş / indir
              </button>
              <button className={styles.ghost} onClick={() => setCard(null)}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
