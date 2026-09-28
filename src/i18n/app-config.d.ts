import type { Messages } from "@/i18n/catalog";
import type { Locale } from "@/i18n/config";

/**
 * Typage de next-intl : `useTranslations` et `getTranslations` refusent à la
 * compilation une clé absente des messages français.
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
