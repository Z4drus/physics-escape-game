import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/** Police d'affichage : titres, cartels et libellés de HUD, à l'esprit musée. */
const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

/** Police d'interface : énoncés, corps de texte. */
const geist = Geist({
  variable: "--font-body",
  subsets: ["latin"],
});

/** Chiffres, unités et valeurs mesurées. */
const geistMono = Geist_Mono({
  variable: "--font-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Physics Escape : le Cabinet de Physique",
    template: "%s · Physics Escape",
  },
  description:
    "Escape game 3D dans un musée de physique : explorez la galerie, fouillez, résolvez six énigmes de physique et réunissez les sceaux pour rencontrer l'hologramme d'Einstein.",
  applicationName: "Physics Escape",
};

export const viewport: Viewport = {
  themeColor: "#17110d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-ink min-h-full">{children}</body>
    </html>
  );
}
