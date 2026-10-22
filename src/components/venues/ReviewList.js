import styles from "./ReviewList.module.css";

// Stars out of 5 (full/empty) — with a text label for screen readers
export function Stars({ value, size = 12 }) {
  if (value == null) return null;
  const full = Math.round(value);
  return (
    <span className={styles.stars} style={{ fontSize: size }} role="img" aria-label={`5 üzerinden ${value}`}>
      {"★".repeat(full)}
      <span className={styles.empty}>{"★".repeat(5 - full)}</span>
    </span>
  );
}

// User reviews (Google). compact: shorter layout for the map card
export default function ReviewList({ reviews, compact = false, limit = 3 }) {
  if (!reviews?.length) return null;

  return (
    <ul className={styles.list} data-compact={compact || undefined}>
      {reviews.slice(0, limit).map((r, i) => (
        <li key={i} className={styles.review}>
          <div className={styles.head}>
            <Stars value={r.rating} />
            <span className={styles.when}>{r.when}</span>
          </div>
          <p className={styles.text}>“{r.text}”</p>
          <p className={styles.author}>
            —{" "}
            {r.authorUrl ? (
              <a href={r.authorUrl} target="_blank" rel="noreferrer">
                {r.author}
              </a>
            ) : (
              r.author
            )}
            {r.translated && <span className={styles.translated}> · Google tarafından çevrildi</span>}
          </p>
        </li>
      ))}
    </ul>
  );
}
