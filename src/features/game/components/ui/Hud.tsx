"use client";

import { motion } from "motion/react";

import { KeyTracker } from "@/features/game/components/ui/KeyTracker";
import { SessionTimer } from "@/features/game/components/ui/SessionTimer";
import { TOTAL_KEYS } from "@/features/game/data/puzzles";
import type { RoomKey } from "@/types/game";

const CONTROLS: readonly { keys: string; label: string }[] = [
  { keys: "ZQSD", label: "Se déplacer" },
  { keys: "Souris", label: "Regarder" },
  { keys: "Maj", label: "Courir" },
  { keys: "E", label: "Interagir" },
  { keys: "Échap", label: "Pause" },
];

/** Interface de jeu : progression en haut, rappel des commandes en bas. */
export function Hud({
  keys,
  startedAt,
  finishedAt,
  doorOpen,
}: {
  keys: readonly RoomKey[];
  startedAt: number | null;
  finishedAt: number | null;
  doorOpen: boolean;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 flex flex-col justify-between p-4 sm:p-6">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div className="panel-shadow bg-surface/80 rounded-[22px] p-1.5 backdrop-blur-md">
          <div className="flex items-center gap-3 rounded-2xl px-3 py-2">
            <span className="bg-accent size-2 rounded-full shadow-[0_0_10px_var(--accent)]" />
            <div className="leading-tight">
              <p className="font-display text-[11px] tracking-[0.18em] uppercase">
                Labo B-204
              </p>
              <p className="text-muted text-[11px]">
                {doorOpen ? "Porte déverrouillée" : "Porte verrouillée"}
              </p>
            </div>
            <span className="bg-hairline mx-1 h-8 w-px" />
            <SessionTimer startedAt={startedAt} finishedAt={finishedAt} />
          </div>
        </div>

        <div className="panel-shadow bg-surface/80 rounded-[22px] p-1.5 backdrop-blur-md">
          <div className="flex items-center gap-3 rounded-2xl px-2 py-1">
            <span className="text-muted font-display hidden text-[11px] tracking-[0.18em] uppercase sm:block">
              Clés
            </span>
            <KeyTracker keys={keys} />
          </div>
        </div>
      </motion.header>

      <motion.footer
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0, delay: 0.1 }}
        className="flex justify-center"
      >
        <div className="panel-shadow bg-surface/70 rounded-[22px] p-1.5 backdrop-blur-md">
          <ul className="flex flex-wrap items-center justify-center gap-1 rounded-2xl px-1">
            {CONTROLS.map((control) => (
              <li
                key={control.keys}
                className="flex items-center gap-2 rounded-[14px] px-2.5 py-1.5"
              >
                <kbd className="bg-surface-raised rounded-lg px-1.5 py-0.5 font-mono text-[11px] shadow-[inset_0_-1px_0_rgb(0_0_0/0.4),0_1px_0_rgb(255_255_255/0.06)]">
                  {control.keys}
                </kbd>
                <span className="text-muted text-[11px]">{control.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.footer>

      <span className="sr-only" aria-live="polite">
        {keys.length} clé{keys.length > 1 ? "s" : ""} sur {TOTAL_KEYS} récupérée
        {keys.length > 1 ? "s" : ""}.
      </span>
    </div>
  );
}
