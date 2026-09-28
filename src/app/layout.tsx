import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
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

/** Titre et description dans la langue retenue pour la requête. */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ui.meta");
  return {
    title: { default: t("title"), template: "%s · Kelvin Hall" },
    description: t("description"),
    applicationName: "Kelvin Hall",
  };
}

export const viewport: Viewport = {
  themeColor: "#17110d",
  colorScheme: "dark",
};

/**
 * Racine : polices, langue du document et messages de la langue active,
 * transmis aux composants clients par `NextIntlClientProvider`.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${geist.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-ink min-h-full">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
