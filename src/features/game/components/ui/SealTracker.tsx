"use client";

import { AnimatePresence, motion } from "motion/react";

import { STATIONS } from "@/features/game/data/stations";
import type { Seal } from "@/types/game";

/**
 * Sceaux du joueur : une pastille par poste, allumée une fois le sceau
 * obtenu. Le rayon des pastilles suit celui du conteneur moins son padding.
 */
export function SealTracker({ seals }: { seals: readonly Seal[] }) {
  const collected = new Map(seals.map((seal) => [seal.id, seal]));

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center gap-1">
        {STATIONS.map((station) => {
          const seal = collected.get(station.reward.id);
          return (
            <div
              key={station.reward.id}
              role="img"
              aria-label={
                seal
                  ? `${seal.label} obtenu`
                  : `${station.label} : sceau à obtenir`
              }
              title={seal ? seal.label : "Sceau à obtenir"}
              className="bg-surface-raised rounded-pill relative grid size-6 place-items-center"
            >
              <span
                aria-hidden
                className="bg-line-strong rounded-pill absolute size-2"
              />
              <AnimatePresence initial={false}>
                {seal ? (
                  <motion.span
                    key="lit"
                    initial={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
                    animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                    exit={{ scale: 0.25, opacity: 0, filter: "blur(4px)" }}
                    transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                    className="rounded-pill relative size-2.5"
                    style={{
                      backgroundColor: seal.color,
                      boxShadow: `0 0 10px ${seal.color}`,
                    }}
                  />
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <span className="text-ink-fade font-mono text-xs tabular-nums">
        {seals.length}/{STATIONS.length}
      </span>
    </div>
  );
}
