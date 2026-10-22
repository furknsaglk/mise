import Icon from "@/components/ui/Icon";
import { googleMapsLeg, appleMapsLeg, citymapperLeg, uberRide } from "@/lib/integrations/deepLinks";
import styles from "./LegLinks.module.css";

// Directions from the previous stop to this one: walking, public transport or ride.
// Without `from` (first stop of the day) the user's current location is used.
export default function LegLinks({ from, to }) {
  const links = [
    { label: "Google Haritalar", icon: "map", href: googleMapsLeg(from, to) },
    { label: "Apple Haritalar", icon: "map", href: appleMapsLeg(from, to) },
    { label: "Citymapper", icon: "transit", href: citymapperLeg(from, to) },
    { label: "Uber", icon: "car", href: uberRide(from, to) },
  ];

  return (
    <div className={styles.links}>
      <span className="eyebrow">{from ? "Önceki duraktan" : "Bulunduğun yerden"}</span>
      <div className={styles.row}>
        {links.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
            <Icon name={l.icon} size={14} /> {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}
