import { withBase } from "@/lib/basePath";

// Lets the app open like a native app when added to the phone's home screen.
// Static export needs this metadata route to be explicitly static.
export const dynamic = "force-static";

export default function manifest() {
  return {
    name: "Mise — Günün, yerli yerinde",
    short_name: "Mise",
    start_url: withBase("/"),
    display: "standalone",
    background_color: "#f4efe6",
    theme_color: "#f4efe6",
    icons: [{ src: withBase("/icon.svg"), sizes: "any", type: "image/svg+xml" }],
  };
}
