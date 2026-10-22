// Small, app-specific line icon set.
const PATHS = {
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z" />
      <path d="M9 6v12" strokeDasharray="2 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  walk: (
    <>
      <circle cx="13" cy="4.5" r="1.5" />
      <path d="m9 21 2.5-6 2.5 2.5V21M8 11l2.5-3.5 3 1 1.5 3.5 2.5 1M11.5 15l1-6" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  rain: (
    <>
      <path d="M7 15a4.5 4.5 0 1 1 .9-8.9A5.5 5.5 0 0 1 18.5 8 3.5 3.5 0 0 1 18 15z" />
      <path d="m9 18-1 2m5-2-1 2m5-2-1 2" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  cloud: <path d="M7 18a4.5 4.5 0 1 1 .9-8.9A5.5 5.5 0 0 1 18.5 11 3.5 3.5 0 0 1 18 18z" />,
  snow: (
    <>
      <path d="M7 14a4.5 4.5 0 1 1 .9-8.9A5.5 5.5 0 0 1 18.5 7 3.5 3.5 0 0 1 18 14z" />
      <path d="M8 18h.01M12 20h.01M16 18h.01" strokeWidth="2.5" />
    </>
  ),
  storm: (
    <>
      <path d="M7 15a4.5 4.5 0 1 1 .9-8.9A5.5 5.5 0 0 1 18.5 8 3.5 3.5 0 0 1 18 15" />
      <path d="m13 12-3 5h4l-3 5" />
    </>
  ),
  sunset: (
    <>
      <path d="M17 18a5 5 0 0 0-10 0M3 18h18M5 22h14" />
      <path d="M12 2v6m0 0-3-3m3 3 3-3M4.2 10.2l1.4 1.4M18.4 11.6l1.4-1.4" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0M16 4a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  swap: <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />,
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  share: (
    <>
      <path d="M12 15V3m0 0L8 7m4-4 4 4" />
      <path d="M7 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
    </>
  ),
  image: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="9.5" cy="9.5" r="1.5" />
      <path d="m20 15-4.5-4.5L6 20" />
    </>
  ),
  car: (
    <>
      <path d="M5 16V11l2-5h10l2 5v5" />
      <path d="M3 16h18v3H3zM5 11h14" />
      <circle cx="7.5" cy="16" r="1" />
      <circle cx="16.5" cy="16" r="1" />
    </>
  ),
  transit: (
    <>
      <rect x="6" y="3" width="12" height="14" rx="3" />
      <path d="M6 11h12M9 21l1.5-4M15 21l-1.5-4" />
      <circle cx="9" cy="14" r=".5" />
      <circle cx="15" cy="14" r=".5" />
    </>
  ),
  map: (
    <>
      <path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
};

export default function Icon({ name, size = 18, strokeWidth = 1.6, className, title }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}
