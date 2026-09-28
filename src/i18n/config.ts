/** Langues proposées au joueur, dans l'ordre d'affichage de l'écran de choix. */
export const LOCALES = ["fr", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** Langue d'origine du jeu, retenue quand le navigateur n'exprime aucune préférence connue. */
export const DEFAULT_LOCALE: Locale = "fr";

/** Cookie qui mémorise la langue choisie, lu à chaque requête par `i18n/request`. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * Nom de chaque langue dans cette langue même (endonyme) et invitation à
 * jouer : l'écran de choix les affiche tels quels, quelle que soit la langue
 * active, pour qu'un joueur reconnaisse la sienne sans savoir lire l'autre.
 */
export const LOCALE_DETAILS: Readonly<
  Record<Locale, { name: string; tagline: string }>
> = {
  fr: { name: "Français", tagline: "Jouer en français" },
  en: { name: "English", tagline: "Play in English" },
};

/** Garde de type : la valeur est-elle une langue prise en charge ? */
export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}
