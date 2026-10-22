// The "courses" of a day (food activities).
// time: default start time, duration: average duration in minutes.
export const COURSES = [
  {
    id: "breakfast",
    label: "Kahvaltı",
    time: "09:00",
    duration: 60,
    color: "var(--c-breakfast)",
    hex: "#e8a33d", // for places where CSS variables can't be used (share card)
    note: "Güne yavaş başla",
  },
  {
    id: "coffee",
    label: "Kahve",
    time: "11:30",
    duration: 30,
    color: "var(--c-coffee)",
    hex: "#8a5a3b",
    note: "Üçüncü dalga, iyi çekirdek",
  },
  {
    id: "tasting",
    label: "Yerel Lezzet",
    time: "14:00",
    duration: 60,
    color: "var(--c-tasting)",
    hex: "#6b7a3a",
    note: "Pazarlar, tezgahlar, ustalar",
  },
  {
    id: "dinner",
    label: "Akşam Yemeği",
    time: "19:30",
    duration: 120,
    color: "var(--c-dinner)",
    hex: "#d9472b",
    note: "Günün ana servisi",
  },
  {
    id: "drinks",
    label: "Gece Kadehi",
    time: "22:00",
    duration: 60,
    color: "var(--c-drinks)",
    hex: "#7a3b57",
    note: "Doğal şarap, kokteyl",
  },
];

export const getCourse = (id) => COURSES.find((c) => c.id === id);

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
export const toRoman = (n) => NUMERALS[n - 1] ?? String(n);
