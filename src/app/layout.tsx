import type { Metadata, Viewport } from "next";
import { Orbitron, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

/** Police d'affichage sci-fi utilisée pour les titres et le HUD. */
const orbitron = Orbitron({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

/** Police d'interface : technique mais confortable pour les énoncés. */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

/** Chiffres et libellés courts du HUD. */
const spaceMono = Space_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Physics Escape — Sortez de la salle de physique",
    template: "%s · Physics Escape",
  },
  description:
    "Escape game 3D : explorez la salle, interagissez avec les dispositifs et résolvez des énigmes de physique pour récupérer les clés de la porte.",
  applicationName: "Physics Escape",
};

export const viewport: Viewport = {
  themeColor: "#07090f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${orbitron.variable} ${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground min-h-full">
        {children}
      </body>
    </html>
  );
}
