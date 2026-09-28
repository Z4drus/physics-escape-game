"use client";

import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LocaleFlag } from "@/components/ui/LocaleFlag";
import { TRANSITION, revealAt } from "@/lib/motion";

/**
 * Écran titre : le nom du jeu et le pitch en une phrase. Le drapeau ramène à
 * l'étape du choix de la langue.
 */
export function TitleOverlay({
  onStart,
  onChangeLanguage,
}: {
  onStart: () => void;
  onChangeLanguage: () => void;
}) {
  const t = useTranslations("ui.title");
  const locale = useLocale();

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
          <header className="relative overflow-hidden px-6 pt-8 pb-7">
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(180deg,var(--brand-night),var(--brand-deep)_62%,var(--brand-brass))] opacity-80"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(rgb(255_240_220/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_240_220/0.05)_1px,transparent_1px)] bg-[length:8px_8px]"
            />
            <button
              type="button"
              onClick={onChangeLanguage}
              className="glass rounded-pill text-ink-fade hover:text-ink ease-smooth tap-target absolute top-4 right-4 z-10 flex h-9 cursor-pointer items-center gap-2 pr-3 pl-2 font-mono text-xs uppercase transition-[color,scale] duration-[200ms] active:scale-[0.96]"
            >
              <LocaleFlag locale={locale} className="size-5" />
              <span className="sr-only">{t("changeLanguage")}</span>
              {locale}
            </button>
            <div className="relative">
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
                className="mt-3 text-4xl sm:text-5xl"
              >
                Kelvin Hall
              </motion.h1>
            </div>
          </header>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={revealAt(2)}
            className="border-line border-t px-6 py-5"
          >
            <p className="text-ink-fade text-sm text-pretty">{t("pitch")}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={revealAt(3)}
            className="border-line border-t px-6 py-5"
          >
            <Button onClick={onStart} withArrow className="w-full">
              {t("start")}
            </Button>
            <p className="text-ink-mute mt-3 text-center text-xs text-pretty">
              {t("hint")}
            </p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
