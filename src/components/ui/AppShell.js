import Link from "next/link";
import NavTabs from "./NavTabs";
import styles from "./AppShell.module.css";

// Frame around every page: logo on top, top menu on desktop, bottom menu on phones.
export default function AppShell({ children }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark} aria-label="Mise ana sayfa">
          Mise<span className={styles.dot}>.</span>
        </Link>
        <NavTabs variant="top" />
        <span className={`${styles.edition} eyebrow`}>Avrupa Baskısı</span>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={`${styles.footer} mono`}>
        <span>Mise — Günün, yerli yerinde.</span>
        <Link href="/credits">Künye & fotoğraf lisansları</Link>
      </footer>

      <NavTabs variant="bottom" />
    </div>
  );
}
