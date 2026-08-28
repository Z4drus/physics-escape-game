"use client";

import { motion } from "motion/react";

import { TOTAL_KEYS } from "@/features/game/data/puzzles";

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
    attempts > 0 ? Math.round((TOTAL_KEYS / attempts) * 100) : 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-20 grid place-items-center bg-black/75 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0 }}
        className="panel-shadow bg-surface w-full max-w-md rounded-[28px] p-2"
      >
        <div className="bg-surface-raised rounded-[20px] p-7 text-center">
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="text-accent font-display text-[11px] tracking-[0.24em] uppercase"
          >
            Sortie réussie
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.16 }}
            className="mt-3 text-2xl font-bold"
          >
            Vous êtes libre
          </motion.h1>

          <motion.dl
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.24 }}
            className="mt-6 grid grid-cols-3 gap-2"
          >
            <Stat label="Temps" value={`${minutes}:${seconds}`} />
            <Stat label="Réponses" value={String(attempts)} />
            <Stat label="Précision" value={`${accuracy}%`} />
          </motion.dl>

          <motion.button
            type="button"
            onClick={onRestart}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.32 }}
            className="bg-accent text-background mt-7 h-12 w-full cursor-pointer rounded-2xl text-sm font-semibold transition-[scale,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-[var(--accent-strong)] active:scale-[0.96]"
          >
            Rejouer
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] px-3 py-4">
      <dt className="text-muted font-display text-[10px] tracking-[0.16em] uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-lg tabular-nums">{value}</dd>
    </div>
  );
}
