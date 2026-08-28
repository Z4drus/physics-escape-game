import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/** Police d'affichage : instrumentation, titres et libellés de HUD. */
const chakraPetch = Chakra_Petch({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
    default: "Physics Escape : sortez du laboratoire",
    template: "%s · Physics Escape",
  },
  description:
    "Escape game 3D : explorez le laboratoire, analysez les postes de mesure et résolvez six énigmes de physique pour récupérer les clés de la porte.",
  applicationName: "Physics Escape",
};

export const viewport: Viewport = {
  themeColor: "#000f18",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${chakraPetch.variable} ${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-ink min-h-full">{children}</body>
    </html>
  );
}
