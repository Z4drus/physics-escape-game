import { IconFrance, IconUnitedKingdom } from "nucleo-flags";

import type { Locale } from "@/i18n/config";

const FLAGS: Readonly<Record<Locale, typeof IconFrance>> = {
  fr: IconFrance,
  en: IconUnitedKingdom,
};

/** Drapeau d'une langue du jeu, décoratif : le nom de la langue l'accompagne toujours. */
export function LocaleFlag({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const Flag = FLAGS[locale];
  return <Flag aria-hidden className={className} />;
}
