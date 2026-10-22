// Maps WMO weather codes to Turkish labels and icons.
// https://open-meteo.com/en/docs (WMO Weather interpretation codes)

export function describeWeather(code) {
  if (code === 0) return { label: "Açık", icon: "sun" };
  if (code === 1) return { label: "Az bulutlu", icon: "sun" };
  if (code === 2) return { label: "Parçalı bulutlu", icon: "cloud" };
  // Not labeled "Kapalı" (overcast): it would be confused with a venue being closed
  if (code === 3) return { label: "Çok bulutlu", icon: "cloud" };
  if (code === 45 || code === 48) return { label: "Sisli", icon: "cloud" };
  if (code >= 51 && code <= 57) return { label: "Çisenti", icon: "rain" };
  if (code >= 61 && code <= 67) return { label: "Yağmurlu", icon: "rain" };
  if (code >= 71 && code <= 77) return { label: "Karlı", icon: "snow" };
  if (code >= 80 && code <= 82) return { label: "Sağanak", icon: "rain" };
  if (code === 85 || code === 86) return { label: "Kar sağanağı", icon: "snow" };
  if (code >= 95) return { label: "Fırtına", icon: "storm" };
  return { label: "Değişken", icon: "cloud" };
}

const WET_CODES = (c) => (c >= 51 && c <= 67) || (c >= 71 && c <= 86) || c >= 95;

// Weather at a given hour + Mise's interpretation
export function weatherAt(weather, time) {
  if (!weather?.available) return null;
  const hour = Number(time.slice(0, 2));
  const h = weather.hours.find((x) => x.hour === hour);
  if (!h) return null;
  const wet = h.rain >= 50 || WET_CODES(h.code);
  return {
    ...h,
    ...describeWeather(h.code),
    wet,
    cold: h.temp < 9,
    nice: !wet && h.rain < 25 && h.code <= 2 && h.temp >= 17,
  };
}
