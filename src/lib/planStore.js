import { getCourse } from "@/lib/courses";

// PLAN STORE
// The selected place and the day's courses are stored in the browser (localStorage);
// the plan survives page reloads. Discover and the planner share the same store.

const KEY = "mise:plan:v1";

const uid = () => Math.random().toString(36).slice(2, 10);

export const makeSlot = (courseId, time) => ({
  uid: uid(),
  course: courseId,
  time: time ?? getCourse(courseId).time,
  pinned: null, // venue pinned by the user (full object)
});

// Today's date as "2026-10-22" (according to the user's device clock)
export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const DEFAULT_STATE = {
  place: { label: "Lizbon, Portekiz", lat: 38.7223, lng: -9.1393 },
  date: null, // filled with today's date in the browser
  radiusKm: 2,
  startAtCenter: true,
  // Fixed IDs: the default plan is identical on the server and in the browser
  slots: ["breakfast", "coffee", "tasting", "dinner"].map((c) => ({ ...makeSlot(c), uid: `default-${c}` })),
};

let state = null;
const listeners = new Set();

function load() {
  if (state) return state;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    state = saved?.slots ? { ...DEFAULT_STATE, ...saved } : DEFAULT_STATE;
  } catch {
    state = DEFAULT_STATE;
  }
  // Move the date to today if it's missing or in the past
  const today = todayIso();
  if (!state.date || state.date < today) state = { ...state, date: today };
  return state;
}

const sortSlots = (slots) => [...slots].sort((a, b) => a.time.localeCompare(b.time));

function update(updater) {
  const next = updater(load());
  state = { ...next, slots: sortSlots(next.slots) };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private window etc. — the plan only lasts for this session
  }
  listeners.forEach((fn) => fn());
}

// For React's useSyncExternalStore
export const getSnapshot = () => load();
export const getServerSnapshot = () => DEFAULT_STATE;
export function subscribe(fn) {
  listeners.add(fn);
  const onStorage = (e) => {
    if (e.key === KEY) {
      state = null;
      fn();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

export const planActions = {
  // "at": search moment — forces a refetch even when the same place is searched again
  setPlace: (place) => update((s) => ({ ...s, place: { ...place, at: Date.now() } })),
  renamePlace: (point, label) =>
    update((s) => (s.place.lat === point.lat && s.place.lng === point.lng ? { ...s, place: { ...s.place, label } } : s)),
  setRadius: (radiusKm) => update((s) => ({ ...s, radiusKm })),
  setDate: (date) => update((s) => ({ ...s, date })),
  setStartAtCenter: (startAtCenter) => update((s) => ({ ...s, startAtCenter })),

  addSlot: (courseId) => update((s) => ({ ...s, slots: [...s.slots, makeSlot(courseId)] })),
  removeSlot: (id) => update((s) => ({ ...s, slots: s.slots.filter((x) => x.uid !== id) })),
  updateSlot: (id, patch) => update((s) => ({ ...s, slots: s.slots.map((x) => (x.uid === id ? { ...x, ...patch } : x)) })),
  pin: (id, venue) => planActions.updateSlot(id, { pinned: venue }),
  unpin: (id) => planActions.updateSlot(id, { pinned: null }),

  // "Add to menu" on Discover: pins to an empty course of the same type, or opens a new course.
  addVenue: (venue) => {
    let target = null;
    update((s) => {
      const free = s.slots.find((x) => x.course === venue.course && !x.pinned);
      const same = s.slots.find((x) => x.course === venue.course);
      const slot = free ?? same ?? makeSlot(venue.course);
      target = slot.uid;
      const others = s.slots.filter((x) => x.uid !== slot.uid);
      return { ...s, slots: [...others, { ...slot, pinned: venue }] };
    });
    return target;
  },

  reset: () => update(() => ({ ...DEFAULT_STATE, date: todayIso(), slots: DEFAULT_STATE.slots.map((x) => makeSlot(x.course)) })),
};
