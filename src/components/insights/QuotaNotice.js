import Icon from "@/components/ui/Icon";
import styles from "./QuotaNotice.module.css";

// Honestly informs the user when Google's free daily search quota is used up.
export default function QuotaNotice({ status }) {
  if (status !== "quota") return null;
  return (
    <div className={styles.notice} role="status">
      <Icon name="clock" size={16} />
      <p>
        <strong>Bugünkü ücretsiz Google arama sınırı doldu.</strong> Liste şimdilik Foursquare'den geliyor. Daha önce
        Google'la eşleşmiş mekanları açtığında puan ve yorumlarını Google'ın kendi kartı gösterir. Tam Google verisi
        yarın sabah geri gelir — ücret çıkmaz.
      </p>
    </div>
  );
}
