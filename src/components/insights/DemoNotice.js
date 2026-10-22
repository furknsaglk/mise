import Icon from "@/components/ui/Icon";
import { IS_DEMO } from "@/lib/demo/config";
import styles from "./QuotaNotice.module.css";

// Shown only in the static demo build: makes it unmistakable that venues are fictional.
export default function DemoNotice() {
  if (!IS_DEMO) return null;
  return (
    <div className={styles.notice} role="note">
      <Icon name="ticket" size={16} />
      <p>
        <strong>Bu bir demo.</strong> Mekanlar, puanlar ve yorumlar <strong>kurgusaldır</strong>; gerçek işletmelere ait
        değildir ve aradığın yerin çevresinde otomatik üretilir. Konum arama, harita, hava durumu ve yürüme rotaları
        gerçektir.
      </p>
    </div>
  );
}
