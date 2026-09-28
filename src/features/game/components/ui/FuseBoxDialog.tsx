"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CloseButton, ModalShell } from "@/components/ui/ModalShell";
import { useMuseumCopy } from "@/features/game/i18n/useMuseumCopy";
import type { BreakerOutcome } from "@/features/game/state/useGameStore";
import { useNumberFormat } from "@/i18n/useNumberFormat";
import { cn } from "@/lib/cn";
import { TRANSITION, revealAt } from "@/lib/motion";
import type { Breaker } from "@/types/game";

/**
 * Tableau électrique : le fusible est en place, il reste à réarmer les
 * quatre disjoncteurs par puissance croissante. Un mauvais ordre fait tout
 * sauter et compte une erreur.
 */
export function FuseBoxDialog({
  breakers,
  armedIds,
  powered,
  onArm,
  onClose,
}: {
  breakers: readonly Breaker[];
  armedIds: readonly string[];
  powered: boolean;
  onArm: (breakerId: string) => BreakerOutcome;
  onClose: () => void | Promise<void>;
}) {
  const t = useTranslations("ui.fuseBox");
  const museum = useMuseumCopy();
  const { decimal } = useNumberFormat();
  const [message, setMessage] = useState<"idle" | "tripped">("idle");

  /** Puissance telle que l'appareil l'affiche : « 1,2 kW », « 45 W ». */
  const formatPower = (breaker: Breaker) => {
    const value = breaker.unit === "kW" ? breaker.watts / 1000 : breaker.watts;
    const digits = String(value).split(".")[1]?.length ?? 0;
    return `${decimal(value, digits)} ${breaker.unit}`;
  };

  const handleArm = (id: string) => {
    const outcome = onArm(id);
    setMessage(outcome === "tripped" ? "tripped" : "idle");
  };

  return (
    <ModalShell labelledBy="fuse-title" onClose={onClose} maxWidth="max-w-lg">
      <header className="border-line flex items-center justify-between gap-4 border-b px-5 py-3.5">
        <div>
          <Eyebrow>{museum.room("gallery")}</Eyebrow>
          <h2 id="fuse-title" className="mt-1 text-2xl">
            {t("title")}
          </h2>
        </div>
        <CloseButton onClick={onClose} label={t("close")} />
      </header>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={revealAt(0, 0.05)}
        className="text-ink-fade px-5 pt-5 text-sm"
      >
        {t("instructions")}
      </motion.p>

      <motion.ul
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={revealAt(1, 0.05)}
        className="grid grid-cols-2 gap-3 px-5 py-5 sm:grid-cols-4"
      >
        {breakers.map((breaker) => {
          const armed = armedIds.includes(breaker.id);
          return (
            <li key={breaker.id}>
              <button
                type="button"
                onClick={() => handleArm(breaker.id)}
                disabled={armed || powered}
                aria-pressed={armed}
                className={cn(
                  "group flex w-full cursor-pointer flex-col items-center gap-3 rounded-md px-3 pt-4 pb-3 text-center",
                  "bg-surface outline-line-strong outline-1 outline-offset-[-1px]",
                  "ease-smooth transition-[background-color,scale] duration-[200ms] active:scale-[0.96]",
                  "hover:bg-surface-raised disabled:hover:bg-surface disabled:cursor-default",
                )}
              >
                <span
                  aria-hidden
                  className="bg-background-deep outline-line-strong relative h-14 w-7 rounded-xs outline-1 outline-offset-[-1px]"
                >
                  <motion.span
                    animate={{ y: armed ? 2 : 26 }}
                    transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                    className={cn(
                      "absolute inset-x-1 top-0 h-6 rounded-[3px]",
                      armed ? "bg-positive" : "bg-ink-mute",
                    )}
                    style={
                      armed
                        ? { boxShadow: "0 0 10px var(--positive)" }
                        : undefined
                    }
                  />
                </span>
                <span className="text-xs leading-tight">
                  {museum.breaker(breaker.id)}
                </span>
                <span className="text-accent-soft font-mono text-sm tabular-nums">
                  {formatPower(breaker)}
                </span>
                <span className="sr-only">
                  {armed ? t("armed") : t("disarmed")}
                </span>
              </button>
            </li>
          );
        })}
      </motion.ul>

      <div className="border-line flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4">
        <div className="min-h-5 text-sm" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {powered ? (
              <motion.p
                key="ok"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={TRANSITION.micro}
                className="text-positive"
              >
                {t("powered")}
              </motion.p>
            ) : message === "tripped" ? (
              <motion.p
                key="trip"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={TRANSITION.micro}
                className="text-negative"
              >
                {t("tripped")}
              </motion.p>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={TRANSITION.micro}
                className="text-ink-mute"
              >
                {t("progress", {
                  armed: armedIds.length,
                  total: breakers.length,
                })}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        {powered ? (
          <Button onClick={onClose} withArrow>
            {t("back")}
          </Button>
        ) : null}
      </div>
    </ModalShell>
  );
}
