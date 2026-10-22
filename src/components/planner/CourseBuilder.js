"use client";

import { COURSES, getCourse, toRoman } from "@/lib/courses";
import { planActions, todayIso } from "@/lib/planStore";
import Icon from "@/components/ui/Icon";
import styles from "./CourseBuilder.module.css";

const RADII = [1, 2, 3, 5];

// Builds the day's courses: add, remove, change time or type.
// Courses are sorted by time automatically.
export default function CourseBuilder({ plan }) {
  return (
    <section className={styles.builder} aria-label="Servisler">
      <div className={styles.head}>
        <h2>Servisler</h2>
        <span className="eyebrow">Saate göre sıralı</span>
      </div>

      <label className={styles.date}>
        <span className="eyebrow">Tarih</span>
        <input
          type="date"
          className="mono"
          value={plan.date ?? ""}
          // The page is prerendered at build time: compute "today" only in the browser
          // (plan.date is empty in the server snapshot, set in the browser) — otherwise a hydration mismatch
          min={plan.date ? todayIso() : undefined}
          onChange={(e) => e.target.value && planActions.setDate(e.target.value)}
        />
      </label>

      <ol className={styles.slots}>
        {plan.slots.map((slot, i) => {
          const course = getCourse(slot.course);
          return (
            <li key={slot.uid} className={styles.slot} style={{ "--accent": course.color }}>
              <span className={styles.numeral}>{toRoman(i + 1)}</span>

              <select
                className={styles.select}
                value={slot.course}
                onChange={(e) => planActions.updateSlot(slot.uid, { course: e.target.value, pinned: null })}
                aria-label="Servis türü"
              >
                {COURSES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              <input
                type="time"
                className={`${styles.time} mono`}
                value={slot.time}
                onChange={(e) => e.target.value && planActions.updateSlot(slot.uid, { time: e.target.value })}
                aria-label={`${course.label} saati`}
              />

              <button className={styles.remove} onClick={() => planActions.removeSlot(slot.uid)} aria-label={`${course.label} servisini kaldır`}>
                ×
              </button>

              {slot.pinned && (
                <button className={styles.pinned} onClick={() => planActions.unpin(slot.uid)} title="Kilidi aç">
                  <Icon name="lock" size={12} strokeWidth={2} /> {slot.pinned.name}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <div className={styles.add}>
        <span className="eyebrow">Servis ekle</span>
        <div className={styles.addRow}>
          {COURSES.map((c) => (
            <button key={c.id} onClick={() => planActions.addSlot(c.id)} style={{ "--accent": c.color }}>
              <span className={styles.dot} /> {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.options}>
        <div>
          <span className="eyebrow">Yürüme alanı</span>
          <div className={styles.segment} role="group" aria-label="Yürüme alanı">
            {RADII.map((km) => (
              <button key={km} aria-pressed={plan.radiusKm === km} onClick={() => planActions.setRadius(km)}>
                {km} km
              </button>
            ))}
          </div>
        </div>
        <label className={styles.check}>
          <input type="checkbox" checked={plan.startAtCenter} onChange={(e) => planActions.setStartAtCenter(e.target.checked)} />
          Güne iğnenin olduğu yerden başla
        </label>
      </div>
    </section>
  );
}
