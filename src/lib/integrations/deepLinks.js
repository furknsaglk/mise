// LINKS TO EXTERNAL APPS (deep links / universal links)
// On a phone they open the app if installed, otherwise the web version.

const ll = (p) => `${p.lat},${p.lng}`;
const enc = encodeURIComponent;

// Show a single venue in Google Maps
export function googleMapsPlace(venue) {
  return `https://www.google.com/maps/search/?api=1&query=${enc(`${venue.name}, ${venue.area}`)}`;
}

// Open the whole day as one route in Google Maps (walking mode, at most 9 waypoints)
export function googleMapsRoute(points) {
  if (points.length < 2) return points[0] ? googleMapsPlace(points[0]) : null;
  const [origin, ...rest] = points;
  const destination = rest.at(-1);
  const waypoints = rest.slice(0, -1).slice(0, 9);
  const params = new URLSearchParams({ api: "1", origin: ll(origin), destination: ll(destination), travelmode: "walking" });
  if (waypoints.length) params.set("waypoints", waypoints.map(ll).join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}

// From one stop to the next (without `from`: from the user's current location)
export function googleMapsLeg(from, to) {
  const params = new URLSearchParams({ api: "1", destination: ll(to), travelmode: "walking" });
  if (from) params.set("origin", ll(from));
  return `https://www.google.com/maps/dir/?${params}`;
}

export function appleMapsLeg(from, to) {
  const params = new URLSearchParams({ daddr: ll(to), dirflg: "w" });
  if (from) params.set("saddr", ll(from));
  return `https://maps.apple.com/?${params}`;
}

// Citymapper: the best option for public transport in European cities
export function citymapperLeg(from, to) {
  const params = new URLSearchParams({ endcoord: ll(to), endname: to.name ?? "" });
  if (from) params.set("startcoord", ll(from));
  return `https://citymapper.com/directions?${params}`;
}

// Uber: opens the ride request screen with the drop-off pre-filled
export function uberRide(from, to) {
  const parts = ["action=setPickup"];
  if (from) {
    parts.push(`pickup[latitude]=${from.lat}`, `pickup[longitude]=${from.lng}`);
    if (from.name) parts.push(`pickup[nickname]=${enc(from.name)}`);
  } else {
    parts.push("pickup=my_location");
  }
  parts.push(`dropoff[latitude]=${to.lat}`, `dropoff[longitude]=${to.lng}`, `dropoff[nickname]=${enc(to.name ?? "Mise")}`);
  return `https://m.uber.com/ul/?${parts.join("&")}`;
}
