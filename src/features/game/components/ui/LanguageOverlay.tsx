"use client";

import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LocaleFlag } from "@/components/ui/LocaleFlag";
import { setUserLocale } from "@/i18n/actions";
import { LOCALES, LOCALE_DETAILS, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { TRANSITION, revealAt } from "@/lib/motion";

/**
 * Première étape de la présentation : le choix de la langue, avant l'écran
 * titre. La langue bascule dès qu'une option est cochée (le serveur renvoie
 * les messages de la nouvelle langue sans démonter la page), ce qui montre
 * tout de suite l'effet du choix ; « Continuer » mène ensuite au titre.
 */
export function LanguageOverlay({ onContinue }: { onContinue: () => void }) {
  const t = useTranslations("ui.language");
  const locale = useLocale();
  const [switching, startTransition] = useTransition();
  // L'option cochée suit le clic immédiatement, pendant l'aller-retour serveur.
  const [selected, setSelected] = useOptimistic(locale);

  const choose = (next: Locale) => {
    if (next === selected) return;
    startTransition(async () => {
      setSelected(next);
      await setUserLocale(next);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TRANSITION.micro}
      className="scrim fixed inset-0 z-20 flex justify-center overflow-y-auto overscroll-contain p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={TRANSITION.base}
        className="glass my-auto w-full max-w-xl rounded-xl p-2"
      >
        <div className="bg-background-deep overflow-hidden rounded-lg">
          <header className="px-6 pt-7 pb-5">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealAt(0)}
            >
              <Eyebrow>{t("eyebrow")}</Eyebrow>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealAt(1)}
              className="mt-3 text-3xl text-balance sm:text-4xl"
            >
              {t("title")}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealAt(2)}
              className="text-ink-fade mt-3 text-sm text-pretty"
            >
              {t("body")}
            </motion.p>
          </header>

          <motion.fieldset
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={revealAt(3)}
            className="border-line border-t px-6 py-5"
          >
            <legend className="sr-only">{t("legend")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {LOCALES.map((option) => (
                <LanguageOption
                  key={option}
                  locale={option}
                  checked={option === selected}
                  onSelect={() => choose(option)}
                />
              ))}
            </div>
          </motion.fieldset>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={revealAt(4)}
            className="border-line border-t px-6 py-5"
          >
            <Button
              onClick={onContinue}
              disabled={switching}
              withArrow
              className="w-full"
            >
              {t("continue")}
            </Button>
          </motion.div>
        </div>

        <p className="sr-only" aria-live="polite">
          {switching ? t("switching") : ""}
        </p>
      </motion.div>
    </motion.div>
  );
}

/**
 * Carte d'une langue : un vrai bouton radio, masqué, porte la sémantique et la
 * navigation aux flèches ; la carte entière est cliquable.
 */
function LanguageOption({
  locale,
  checked,
  onSelect,
}: {
  locale: Locale;
  checked: boolean;
  onSelect: () => void;
}) {
  const details = LOCALE_DETAILS[locale];

  return (
    <label
      lang={locale}
      className={cn(
        "flex cursor-pointer items-center gap-3.5 rounded-md px-4 py-3.5",
        "outline-1 outline-offset-[-1px]",
        "ease-smooth transition-[background-color,outline-color,scale] duration-[200ms] active:scale-[0.98]",
        "has-focus-visible:outline-accent-soft has-focus-visible:outline-2",
        checked
          ? "bg-surface-strong outline-accent"
          : "bg-surface outline-line-strong hover:bg-surface-raised",
      )}
    >
      <input
        type="radio"
        name="locale"
        value={locale}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <LocaleFlag
        locale={locale}
        className="size-9 shrink-0 drop-shadow-[0_2px_6px_rgb(13_9_8/0.5)]"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-display text-xl leading-tight">
          {details.name}
        </span>
        <span className="text-ink-mute text-xs">{details.tagline}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "rounded-pill grid size-5 shrink-0 place-items-center outline-1 outline-offset-[-1px]",
          "ease-smooth transition-colors duration-[200ms]",
          checked
            ? "bg-accent-soft outline-transparent"
            : "outline-line-strong",
        )}
      >
        <span
          className={cn(
            "rounded-pill bg-background size-2 transition-transform duration-[200ms]",
            checked ? "scale-100" : "scale-0",
          )}
        />
      </span>
    </label>
  );
}
