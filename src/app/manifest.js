// Lets the app open like a native app when added to the phone's home screen.
export default function manifest() {
  return {
    name: "Mise — Günün, yerli yerinde",
    short_name: "Mise",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe6",
    theme_color: "#f4efe6",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
