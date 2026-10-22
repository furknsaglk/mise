import { busyLevel } from "@/lib/insights/busyness";
import styles from "./BusynessBars.module.css";

const FROM = 7;
const TO = 24;

// Hour-by-hour busyness bars (07:00 – 24:00). The "highlight" hour is drawn darker.
export default function BusynessBars({ curve, highlight, label = "Tahmini yoğunluk" }) {
  const hours = curve.slice(FROM, TO);
  const current = curve[highlight];

  return (
    <figure className={styles.wrap}>
      <figcaption className={styles.caption}>
        <span className="eyebrow">{label}</span>
        {current != null && (
          <span className={styles.now} data-level={busyLevel(current).key}>
            {String(highlight).padStart(2, "0")}:00 · {busyLevel(current).label}
          </span>
        )}
      </figcaption>
      <div className={styles.bars} role="img" aria-label={`${label}, ${String(highlight).padStart(2, "0")}:00 saatinde ${busyLevel(current ?? 0).label.toLowerCase()}`}>
        {hours.map((v, i) => {
          const hour = FROM + i;
          return (
            <span
              key={hour}
              className={styles.bar}
              style={{ "--h": `${Math.max(v, 0.03) * 100}%` }}
              data-active={hour === highlight || undefined}
              data-closed={v === 0 || undefined}
              title={`${String(hour).padStart(2, "0")}:00 · ${v === 0 ? "Kapalı" : busyLevel(v).label}`}
            />
          );
        })}
      </div>
      <div className={`${styles.axis} mono`}>
        <span>07</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </figure>
  );
}
