"use server";

import { cookies } from "next/headers";

import { LOCALE_COOKIE, isLocale } from "@/i18n/config";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * Mémorise la langue choisie. Poser un cookie depuis une Server Action fait
 * re-rendre la page par Next.js : l'interface bascule sans être démontée, la
 * partie en cours n'est pas perdue. La valeur est revérifiée ici, une action
 * serveur pouvant être appelée avec n'importe quel argument.
 */
export async function setUserLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    maxAge: ONE_YEAR_IN_SECONDS,
    sameSite: "lax",
    path: "/",
  });
}
