"use client";

import { COURSES } from "@/lib/courses";
import Icon from "@/components/ui/Icon";
import styles from "./FilterBar.module.css";

const RADII = [1, 2, 4, 8];
const PRICES = [1, 2, 3, 4];

// All filters of the Discover screen. State lives in Explorer.
export default function FilterBar({ filters, onChange }) {
  const set = (patch) => onChange({ ...filters, ...patch });

  return (
    <div className={styles.bar}>
      <div className={styles.scroller} role="group" aria-label="Servis">
        <button className={styles.chip} aria-pressed={filters.course === "all"} onClick={() => set({ course: "all" })}>
          Tümü
        </button>
        {COURSES.map((c) => (
          <button
            key={c.id}
            className={styles.chip}
            aria-pressed={filters.course === c.id}
            onClick={() => set({ course: c.id })}
            style={{ "--accent": c.color }}
          >
            <span className={styles.dot} />
            {c.label}
          </button>
        ))}
      </div>

      <div className={styles.row}>
        <button
          className={styles.toggle}
          aria-pressed={filters.verifiedOnly}
          onClick={() => set({ verifiedOnly: !filters.verifiedOnly })}
        >
          <Icon name="check" size={14} strokeWidth={2} /> Doğrulanmış
        </button>
        <button className={styles.toggle} aria-pressed={filters.openNow} onClick={() => set({ openNow: !filters.openNow })}>
          <span className={styles.live} /> Şimdi açık
        </button>

        <div className={styles.segment} role="group" aria-label="En fazla fiyat">
          {PRICES.map((p) => (
            <button key={p} aria-pressed={filters.maxPrice === p} onClick={() => set({ maxPrice: p })}>
              {"€".repeat(p)}
            </button>
          ))}
        </div>

        <div className={styles.segment} role="group" aria-label="Yarıçap">
          {RADII.map((km) => (
            <button key={km} aria-pressed={filters.radiusKm === km} onClick={() => set({ radiusKm: km })}>
              {km} km
            </button>
          ))}
        </div>

        <div className={styles.segment} role="group" aria-label="Sıralama">
          <button aria-pressed={filters.sort === "score"} onClick={() => set({ sort: "score" })}>
            Puan
          </button>
          <button aria-pressed={filters.sort === "distance"} onClick={() => set({ sort: "distance" })}>
            Yakınlık
          </button>
        </div>
      </div>
    </div>
  );
}
