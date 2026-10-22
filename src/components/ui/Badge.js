import Icon from "./Icon";
import styles from "./Badge.module.css";

// tone: "verified" (zeytin) | "weather" (safran) | "rain" (mavi) | "alert" (pomodoro) | "neutral"
export default function Badge({ tone = "neutral", icon, children }) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      {icon && <Icon name={icon} size={13} strokeWidth={2} />}
      {children}
    </span>
  );
}
