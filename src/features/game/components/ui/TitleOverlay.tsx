"use client";

import { motion } from "motion/react";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { formatDuration } from "@/features/game/logic/escape";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { TRANSITION, revealAt } from "@/lib/motion";

/** Écran titre : le nom du jeu, le pitch en une phrase et le classement local. */
export function TitleOverlay({ onStart }: { onStart: () => void }) {
  const leaderboard = useLeaderboard().slice(0, 3);

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
        className="glass my-auto w-full max-w-xl rounded-xl p-2"
      >
        <div className="bg-background-deep overflow-hidden rounded-lg">
          <header className="relative overflow-hidden px-6 pt-8 pb-7">
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(180deg,var(--brand-night),var(--brand-deep)_62%,var(--brand-brass))] opacity-80"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(rgb(255_240_220/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_240_220/0.05)_1px,transparent_1px)] bg-[length:8px_8px]"
            />
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={revealAt(0)}
              >
                <Eyebrow>Musée de Physique · Escape game</Eyebrow>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={revealAt(1)}
                className="mt-3 text-4xl sm:text-5xl"
              >
                Le Cabinet de Physique
              </motion.h1>
            </div>
          </header>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={revealAt(2)}
            className="border-line border-t px-6 py-5"
          >
            <p className="text-ink-fade text-sm">
              Un soir, un musée, six sceaux et une porte. Ceux qui sortent
              rencontrent Albert Einstein. Le classement retient le temps et les
              erreurs.
            </p>
          </motion.div>

          {leaderboard.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealAt(3)}
              className="border-line border-t px-6 py-4"
            >
              <Eyebrow>Meilleures sorties</Eyebrow>
              <ol className="mt-2 flex flex-col gap-1">
                {leaderboard.map((entry, index) => (
                  <li
                    key={`${entry.name}:${entry.date}`}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="text-accent-soft font-mono text-xs tabular-nums">
                      {index + 1}
                    </span>
                    <span className="flex-1 truncate">{entry.name}</span>
                    <span className="text-ink-mute font-mono text-xs tabular-nums">
                      {entry.errors} err. · {formatDuration(entry.timeMs)}
                    </span>
                  </li>
                ))}
              </ol>
            </motion.div>
          ) : null}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={revealAt(4)}
            className="border-line border-t px-6 py-5"
          >
            <Button onClick={onStart} withArrow className="w-full">
              Commencer
            </Button>
            <p className="text-ink-mute mt-3 text-center text-xs">
              Clavier et souris. Casque conseillé, calculette autorisée.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
