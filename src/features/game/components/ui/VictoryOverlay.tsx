"use client";

import { motion } from "motion/react";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Panel";
import { STATIONS } from "@/features/game/data/stations";
import { TRANSITION, revealAt } from "@/lib/motion";

/** Écran de fin affiché lorsque le joueur franchit la porte. */
export function VictoryOverlay({
  durationMs,
  attempts,
  onRestart,
}: {
  durationMs: number;
  attempts: number;
  onRestart: () => void;
}) {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const accuracy =
    attempts > 0 ? Math.round((STATIONS.length / attempts) * 100) : 100;

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
          <header className="relative overflow-hidden px-6 py-7 text-center">
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(180deg,var(--brand-night),var(--brand-deep)_55%,var(--brand-sky))] opacity-70"
            />
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={revealAt(0)}
              >
                <Eyebrow>Sortie réussie</Eyebrow>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={revealAt(1)}
                className="mt-3 text-3xl"
              >
                Vous êtes libre
              </motion.h1>
            </div>
          </header>

          <motion.dl
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={revealAt(2)}
            className="border-line grid grid-cols-3 border-t"
          >
            <Stat label="Temps" value={`${minutes}:${seconds}`} />
            <Stat label="Réponses" value={String(attempts)} />
            <Stat label="Précision" value={`${accuracy} %`} />
          </motion.dl>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={revealAt(3)}
            className="border-line border-t px-6 py-5"
          >
            <Button onClick={onRestart} withArrow className="w-full">
              Rejouer
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-line px-4 py-4 text-center not-first:border-l">
      <dt className="text-ink-mute text-xs font-medium uppercase">{label}</dt>
      <dd className="mt-1.5 font-mono text-lg tabular-nums">{value}</dd>
    </div>
  );
}
