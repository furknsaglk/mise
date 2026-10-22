import Icon from "./Icon";
import styles from "./Badge.module.css";

// tone: "verified" (olive) | "weather" (saffron) | "rain" (blue) | "alert" (pomodoro) | "neutral"
export default function Badge({ tone = "neutral", icon, children }) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      {icon && <Icon name={icon} size={13} strokeWidth={2} />}
      {children}
    </span>
  );
}
