import styles from "./Ticket.module.css";

// Mise's signature component: a perforated, printed ticket / menu card.
export default function Ticket({ eyebrow, title, meta, children, footer, className = "" }) {
  return (
    <article className={`${styles.ticket} ${className}`}>
      <header className={styles.head}>
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          {title && <h2 className={styles.title}>{title}</h2>}
        </div>
        {meta && <div className={styles.meta}>{meta}</div>}
      </header>

      <div className={styles.perforation} aria-hidden />

      <div className={styles.body}>{children}</div>

      {footer && <footer className={styles.foot}>{footer}</footer>}
    </article>
  );
}
