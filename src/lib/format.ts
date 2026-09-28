import type { Locale } from "@/i18n/config";

/**
 * Nombre à virgule fixe : virgule décimale en français, point en anglais.
 * Volontairement plus simple qu'`Intl.NumberFormat` : les schémas l'appellent
 * à chaque image pour les valeurs animées.
 */
export function formatDecimal(
  value: number,
  digits: number,
  locale: Locale,
): string {
  const fixed = value.toFixed(digits);
  return locale === "fr" ? fixed.replace(".", ",") : fixed;
}

/**
 * Entier arrondi avec séparateur de milliers : espace en français
 * (« 334 000 »), virgule en anglais (« 334,000 »).
 */
export function formatInteger(value: number, locale: Locale): string {
  const separator = locale === "fr" ? " " : ",";
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}
