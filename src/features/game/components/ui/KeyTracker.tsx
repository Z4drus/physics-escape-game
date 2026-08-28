"use client";

import { AnimatePresence, motion } from "motion/react";

import { PUZZLES } from "@/features/game/data/puzzles";
import type { RoomKey } from "@/types/game";

/**
 * Trousseau du joueur : une pastille par énigme, allumée une fois la clé
 * obtenue. Le rayon des pastilles suit le rayon du conteneur moins son
 * padding (concentricité).
 */
export function KeyTracker({ keys }: { keys: readonly RoomKey[] }) {
  const collected = new Map(keys.map((key) => [key.id, key]));

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-2xl bg-white/5 p-1.5">
        {PUZZLES.map((puzzle) => {
          const key = collected.get(puzzle.reward.id);
          return (
            <div
              key={puzzle.reward.id}
              title={key ? key.label : "Clé à découvrir"}
              className="relative grid size-7 place-items-center rounded-[10px] bg-white/5"
            >
              <span className="absolute size-3 rounded-full bg-white/12" />
              <AnimatePresence initial={false}>
                {key ? (
                  <motion.span
                    key="lit"
                    initial={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
                    animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                    exit={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
                    transition={{ type: "spring", duration: 0.4, bounce: 0 }}
                    className="relative size-3 rounded-full"
                    style={{
                      backgroundColor: key.color,
                      boxShadow: `0 0 12px ${key.color}`,
                    }}
                  />
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <span className="text-muted font-mono text-xs tabular-nums">
        {keys.length}/{PUZZLES.length}
      </span>
    </div>
  );
}
