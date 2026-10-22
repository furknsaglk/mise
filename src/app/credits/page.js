import credits from "@/lib/data/photoCredits.json";
import { withBase } from "@/lib/basePath";
import styles from "./page.module.css";

export const metadata = { title: "Künye — Mise" };

// Required by the photo licenses: author, license and source of every photo used.
export default function CreditsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <span className="eyebrow">Künye</span>
        <h1>Teşekkürler</h1>
        <p>
          Mise her aramada verileri aşağıdaki kaynaklardan canlı olarak çeker; eski ya da önbellekteki veriyle
          devam etmez.
        </p>
      </header>

      <ul className={styles.sources}>
        <li><strong>Mekanlar</strong> OpenStreetMap katkıcıları (Overpass, Photon) · Google Places ve Foursquare (anahtar eklendiğinde)</li>
        <li><strong>Harita</strong> OpenFreeMap · OpenMapTiles · © OpenStreetMap katkıcıları</li>
        <li><strong>Yürüme rotası</strong> OSRM · routing.openstreetmap.de</li>
        <li><strong>Hava durumu</strong> Open-Meteo.com (CC BY 4.0)</li>
        <li><strong>Yükseklik (demo)</strong> Open-Meteo · Copernicus DEM GLO-90 © DLR e.V. 2010–2014 ve © Airbus Defence and Space GmbH 2014–2018, Avrupa Birliği ve ESA tarafından COPERNICUS kapsamında sağlanmıştır</li>
        <li><strong>Konum arama</strong> Photon · komoot</li>
        <li><strong>Yoğunluk</strong> Mise tahmin modeli (gerçek ölçüm değildir)</li>
      </ul>

      <h2 className={styles.sub}>Fotoğraflar</h2>
      <p className={styles.note}>Örnek kategori görselleri Wikimedia Commons'tan, açık lisanslarla kullanılıyor.</p>

      <ul className={styles.grid}>
        {credits.map((c) => (
          <li key={c.file}>
            <img src={withBase(c.file)} alt={c.title} loading="lazy" />
            <div>
              <p className={styles.author}>{c.author || "Bilinmiyor"}</p>
              <p className="mono">
                {c.license} ·{" "}
                <a href={c.source} target="_blank" rel="noreferrer">
                  Kaynak
                </a>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
