"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { SealTracker } from "@/features/game/components/ui/SealTracker";
import { TOTAL_SEALS } from "@/features/game/data/stations";
import { ROOMS } from "@/features/game/data/world";
import { formatDuration } from "@/features/game/logic/escape";
import { TRANSITION } from "@/lib/motion";
import type { RoomId, Seal } from "@/types/game";

const CONTROLS: readonly { keys: string; label: string }[] = [
  { keys: "ZQSD", label: "Se déplacer" },
  { keys: "Maj", label: "Courir" },
  { keys: "E", label: "Interagir" },
  { keys: "Tab", label: "Carnet" },
  { keys: "M", label: "Son" },
  { keys: "Échap", label: "Pause" },
];

/**
 * Interface de jeu : pièce, chronomètre et erreurs en haut à gauche, sceaux
 * en haut à droite, objectif et rappel des commandes en bas.
 */
export function Hud({
  roomId,
  seals,
  errors,
  objective,
  startedAt,
  finishedAt,
}: {
  roomId: RoomId;
  seals: readonly Seal[];
  errors: number;
  objective: string;
  startedAt: number | null;
  finishedAt: number | null;
}) {
  const complete = seals.length >= TOTAL_SEALS;

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
              backgroundColor: complete ? "var(--positive)" : "var(--accent)",
              boxShadow: `0 0 10px ${complete ? "var(--positive)" : "var(--accent)"}`,
            }}
          />
          <div className="leading-tight">
            <h1 className="sr-only">Physics Escape, le Cabinet de Physique</h1>
            <Eyebrow className="text-[0.6875rem]">
              {ROOMS[roomId].label}
            </Eyebrow>
            <p className="text-ink-mute hidden text-[0.6875rem] sm:block">
              {errors === 0
                ? "Aucune erreur"
                : `${errors} erreur${errors > 1 ? "s" : ""}`}
            </p>
          </div>
          <span aria-hidden className="bg-line-strong ml-1 h-6 w-px" />
          <SessionTimer startedAt={startedAt} finishedAt={finishedAt} />
        </div>

        <div className="glass rounded-pill flex h-11 items-center gap-3 pr-4 pl-3">
          <Eyebrow className="hidden text-[0.6875rem] sm:block">Sceaux</Eyebrow>
          <SealTracker seals={seals} />
        </div>
      </motion.header>

      <motion.footer
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...TRANSITION.base, delay: 0.075 }}
        className="flex flex-col items-center gap-2"
      >
        <p className="glass rounded-pill text-ink-fade max-w-xl px-4 py-1.5 text-center text-xs">
          <span className="text-accent-soft font-medium">Objectif</span>
          <span aria-hidden className="mx-2 opacity-40">
            ·
          </span>
          {objective}
        </p>
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
        {seals.length} sceau{seals.length > 1 ? "x" : ""} sur {TOTAL_SEALS}.{" "}
        {objective}
      </p>
    </div>
  );
}

/**
 * Chronomètre de la partie. Il se rafraîchit une fois par seconde plutôt
 * qu'à chaque frame, et utilise des chiffres tabulaires pour éviter que le
 * HUD ne tressaute à chaque changement de chiffre.
 */
function SessionTimer({
  startedAt,
  finishedAt,
}: {
  startedAt: number | null;
  finishedAt: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt || finishedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startedAt, finishedAt]);

  const elapsed = startedAt ? (finishedAt ?? now) - startedAt : 0;

  return (
    <span className="font-mono text-sm tabular-nums">
      {formatDuration(elapsed)}
    </span>
  );
}
