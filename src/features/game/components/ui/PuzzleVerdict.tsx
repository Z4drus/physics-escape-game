"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { TRANSITION } from "@/lib/motion";
import type { AnswerResult } from "@/features/game/state/useGameStore";
import type { Seal } from "@/types/game";

/**
 * Correction affichée après une réponse : la relation mise en jeu, le
 * raisonnement chiffré, et la clé obtenue le cas échéant.
 */
export function PuzzleVerdict({
  formula,
  explanation,
  result,
  reward,
  sealName,
  onRetry,
  onClose,
}: {
  formula: string;
  explanation: string;
  result: AnswerResult;
  reward: Seal;
  sealName: string;
  onRetry: () => void;
  onClose: () => void | Promise<void>;
}) {
  const t = useTranslations("ui.puzzle");
  const isCorrect = result === "correct";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={TRANSITION.base}
      className="border-line border-t p-5"
    >
      {isCorrect ? (
        <>
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="rounded-pill size-2"
              style={{
                backgroundColor: reward.color,
                boxShadow: `0 0 12px ${reward.color}`,
              }}
            />
            <p className="text-positive text-sm font-medium">
              {t("correct", { seal: sealName })}
            </p>
          </div>

          <p className="text-accent-soft mt-4 font-mono text-sm">{formula}</p>
          <p className="text-ink-fade mt-2 text-sm">{explanation}</p>
        </>
      ) : (
        <>
          <p className="text-negative text-sm font-medium">{t("wrongTitle")}</p>
          <p className="text-ink-fade mt-2 text-sm">{t("wrongBody")}</p>
        </>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {isCorrect ? (
          <Button onClick={onClose} withArrow>
            {t("backToRoom")}
          </Button>
        ) : (
          <>
            <Button onClick={onRetry}>{t("retry")}</Button>
            <Button variant="glass" size="md" onClick={onClose}>
              {t("leave")}
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
