"use client";

import { motion } from "motion/react";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { KeyTracker } from "@/features/game/components/ui/KeyTracker";
import { SessionTimer } from "@/features/game/components/ui/SessionTimer";
import { STATIONS } from "@/features/game/data/stations";
import { TRANSITION } from "@/lib/motion";
import type { RoomKey } from "@/types/game";

const CONTROLS: readonly { keys: string; label: string }[] = [
  { keys: "ZQSD", label: "Se déplacer" },
  { keys: "Maj", label: "Courir" },
  { keys: "E", label: "Analyser" },
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
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={TRANSITION.base}
        className="flex items-start justify-between gap-4"
      >
        <div className="glass rounded-pill flex h-11 items-center gap-3 pr-4 pl-3">
          <span
            aria-hidden
            className="rounded-pill size-1.5"
            style={{
              backgroundColor: doorOpen
                ? "var(--brand-sky)"
                : "var(--brand-amber)",
              boxShadow: `0 0 10px ${doorOpen ? "var(--brand-sky)" : "var(--brand-amber)"}`,
            }}
          />
          <div className="leading-tight">
            <h1 className="sr-only">Physics Escape, laboratoire B-204</h1>
            <Eyebrow className="text-[0.6875rem]">Labo B-204</Eyebrow>
            <p className="text-ink-mute hidden text-[0.6875rem] sm:block">
              {doorOpen ? "Porte déverrouillée" : "Porte verrouillée"}
            </p>
          </div>
          <span aria-hidden className="bg-line-strong ml-1 h-6 w-px" />
          <SessionTimer startedAt={startedAt} finishedAt={finishedAt} />
        </div>

        <div className="glass rounded-pill flex h-11 items-center gap-3 pr-4 pl-3">
          <Eyebrow className="hidden text-[0.6875rem] sm:block">Clés</Eyebrow>
          <KeyTracker keys={keys} />
        </div>
      </motion.header>

      <motion.footer
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...TRANSITION.base, delay: 0.075 }}
        className="flex justify-center"
      >
        <ul className="glass rounded-pill flex flex-wrap items-center justify-center gap-1 px-2 py-1.5">
          {CONTROLS.map((control) => (
            <li
              key={control.keys}
              className="flex items-center gap-2 px-2 py-1"
            >
              <kbd className="bg-surface-raised outline-line rounded-xs px-1.5 py-0.5 font-mono text-[0.6875rem] outline-1 outline-offset-[-1px]">
                {control.keys}
              </kbd>
              <span className="text-ink-mute text-[0.6875rem]">
                {control.label}
              </span>
            </li>
          ))}
        </ul>
      </motion.footer>

      <p className="sr-only" aria-live="polite">
        {keys.length} clé{keys.length > 1 ? "s" : ""} sur {STATIONS.length}{" "}
        récupérée{keys.length > 1 ? "s" : ""}.{" "}
        {doorOpen ? "Porte déverrouillée." : "Porte verrouillée."}
      </p>
    </div>
  );
}
