import { Instrument_Serif, DM_Sans, JetBrains_Mono } from "next/font/google";
import "@/styles/tokens.css";
import "./globals.css";
import AppShell from "@/components/ui/AppShell";
import { withBase } from "@/lib/basePath";

const display = Instrument_Serif({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
});

const sans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-dmsans",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains",
});

export const metadata = {
  title: "Mise — Günün, yerli yerinde",
  description:
    "Avrupa'nın en iyi puanlı mekanlarını keşfet, gününü bir tadım menüsü gibi planla.",
  icons: { icon: withBase("/icon.svg") },
  manifest: withBase("/manifest.webmanifest"),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#14110f" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
