import { useLocale } from "next-intl";
import { useMemo } from "react";

import { formatDecimal, formatInteger } from "@/lib/format";

/**
 * Formateurs de nombres liés à la langue active, pour les valeurs affichées
 * hors des messages (légendes de schémas, puissances des disjoncteurs).
 */
export function useNumberFormat() {
  const locale = useLocale();
  return useMemo(
    () => ({
      decimal: (value: number, digits: number) =>
        formatDecimal(value, digits, locale),
      integer: (value: number) => formatInteger(value, locale),
    }),
    [locale],
  );
}
