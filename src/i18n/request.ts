import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { MESSAGES } from "@/i18n/catalog";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  type Locale,
} from "@/i18n/config";

/**
 * Configuration next-intl de chaque requête, sans préfixe de langue dans
 * l'URL : le jeu tient sur une seule page. La langue vient du cookie posé par
 * l'écran de choix, sinon des préférences du navigateur.
 */
export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return { locale, messages: MESSAGES[locale] };
});

async function resolveLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(stored)) return stored;
  return negotiateLocale((await headers()).get("accept-language"));
}

/**
 * Première langue prise en charge dans l'en-tête `Accept-Language`, par
 * poids décroissant (« en-GB,en;q=0.9,fr;q=0.8 » donne `en`).
 */
function negotiateLocale(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...parameters] = part.trim().split(";");
      const quality = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.startsWith("q="));
      return {
        language: tag.split("-")[0].toLowerCase(),
        weight: quality ? Number.parseFloat(quality.slice(2)) : 1,
      };
    })
    .filter((entry) => entry.weight > 0)
    .sort((first, second) => second.weight - first.weight);

  for (const { language } of ranked) {
    if (isLocale(language)) return language;
  }
  return DEFAULT_LOCALE;
}
