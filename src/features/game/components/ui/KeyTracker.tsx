"use client";

import { AnimatePresence, motion } from "motion/react";

import { STATIONS } from "@/features/game/data/stations";
import { TRANSITION } from "@/lib/motion";
import type { RoomKey } from "@/types/game";

/**
 * Trousseau du joueur : une pastille par poste, allumée une fois la clé
 * obtenue. Le rayon des pastilles suit celui du conteneur moins son padding.
 */
export function KeyTracker({ keys }: { keys: readonly RoomKey[] }) {
  const collected = new Map(keys.map((key) => [key.id, key]));

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1">
        {STATIONS.map((station) => {
          const key = collected.get(station.reward.id);
          return (
            <div
              key={station.reward.id}
              role="img"
              aria-label={
                key
                  ? `${key.label} récupérée`
                  : `${station.label} : clé à découvrir`
              }
              title={key ? key.label : "Clé à découvrir"}
              className="bg-surface-raised rounded-pill relative grid size-6 place-items-center"
            >
              <span
                aria-hidden
                className="bg-line-strong rounded-pill absolute size-2"
              />
              <AnimatePresence initial={false}>
                {key ? (
                  <motion.span
                    key="lit"
                    initial={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
                    animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                    exit={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
                    transition={TRANSITION.base}
                    className="rounded-pill relative size-2.5"
                    style={{
                      backgroundColor: key.color,
                      boxShadow: `0 0 10px ${key.color}`,
                    }}
                  />
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <span className="text-ink-fade font-mono text-xs tabular-nums">
        {keys.length}/{STATIONS.length}
      </span>
    </div>
  );
}
