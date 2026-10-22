import Icon from "@/components/ui/Icon";
import { describeWeather } from "@/lib/weather/codes";
import styles from "./WeatherStrip.module.css";

const HOURS = [8, 10, 12, 14, 16, 18, 20, 22];
const temp = (t) => `${Math.round(t)}°`;

// mode="now": current weather + tip on the Discover screen
// mode="day": hourly forecast + sunset in the planner
export default function WeatherStrip({ weather, mode = "day", placeName }) {
  if (!weather) return <div className={styles.skeleton} />;
  if (!weather.available) return <p className={styles.unavailable}>{weather.reason}</p>;

  if (mode === "now") {
    const now = describeWeather(weather.current.code);
    const wet = now.icon === "rain" || now.icon === "storm" || now.icon === "snow";
    const tip = wet
      ? "Kapalı ve sıcak mekanlar bugün daha iyi bir fikir."
      : weather.current.temp >= 17 && now.icon === "sun"
        ? "Teras havası — açık havada oturulacak yerler var."
        : weather.current.temp < 9
          ? "Serin bir gün; sıcak bir kahve iyi gider."
          : null;

    return (
      <div className={styles.now}>
        <Icon name={now.icon} size={26} />
        <div>
          <p>
            <strong>{temp(weather.current.temp)}</strong> {now.label}
            {placeName && <span className={styles.place}> · {placeName}</span>}
          </p>
          {tip && <p className={styles.tip}>{tip}</p>}
        </div>
        <span className={`${styles.sunset} mono`}>
          <Icon name="sunset" size={15} /> {weather.sunset}
        </span>
      </div>
    );
  }

  return (
    <div className={styles.day}>
      <ol className={styles.hours}>
        {HOURS.map((hour) => {
          const h = weather.hours.find((x) => x.hour === hour);
          if (!h) return null;
          const d = describeWeather(h.code);
          return (
            <li key={hour} data-wet={h.rain >= 50 || undefined}>
              <span className="mono">{String(hour).padStart(2, "0")}</span>
              <Icon name={d.icon} size={18} title={d.label} />
              <strong>{temp(h.temp)}</strong>
              {h.rain >= 20 && <small className="mono">%{h.rain}</small>}
            </li>
          );
        })}
      </ol>
      <div className={`${styles.sun} mono`}>
        <span>
          <Icon name="sun" size={13} /> {weather.sunrise}
        </span>
        <span>
          <Icon name="sunset" size={13} /> {weather.sunset}
        </span>
      </div>
    </div>
  );
}
