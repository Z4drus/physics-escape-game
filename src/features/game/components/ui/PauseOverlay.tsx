"use client";

import { motion } from "motion/react";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TRANSITION, revealAt } from "@/lib/motion";

/** Écran de pause : la progression est conservée, la souris est rendue. */
export function PauseOverlay({
  onResume,
  ready,
}: {
  onResume: () => void;
  /** `false` pendant le délai de garde imposé après une sortie de Pointer Lock. */
  ready: boolean;
}) {
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
        className="glass my-auto w-full max-w-md rounded-xl p-2"
      >
        <div className="bg-background-deep overflow-hidden rounded-lg">
          <header className="px-6 pt-6 pb-5">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealAt(0)}
            >
              <Eyebrow>Partie en pause</Eyebrow>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealAt(1)}
              className="mt-3 text-3xl"
            >
              Le musée vous attend
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealAt(2)}
              className="text-ink-fade mt-3 text-sm"
            >
              Le chronomètre continue de tourner. Reprenez le contrôle pour
              continuer l&apos;exploration.
            </motion.p>
          </header>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={revealAt(3)}
            className="border-line border-t px-6 py-5"
          >
            <Button
              onClick={onResume}
              disabled={!ready}
              withArrow
              className="w-full"
            >
              {ready ? "Reprendre la partie" : "Un instant…"}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
