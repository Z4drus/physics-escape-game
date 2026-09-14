"use client";

import { motion } from "motion/react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { TOTAL_SEALS } from "@/features/game/data/stations";
import { formatDuration } from "@/features/game/logic/escape";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { saveScore } from "@/lib/leaderboard";
import { cn } from "@/lib/cn";
import { TRANSITION, revealAt } from "@/lib/motion";

/** Écran de fin : score, inscription au classement local, rejouer. */
export function VictoryOverlay({
  durationMs,
  errors,
  attempts,
  onRestart,
}: {
  durationMs: number;
  errors: number;
  attempts: number;
  onRestart: () => void;
}) {
  const [name, setName] = useState("");
  const [savedDate, setSavedDate] = useState<string | null>(null);
  const leaderboard = useLeaderboard();
  const accuracy =
    attempts > 0 ? Math.round((TOTAL_SEALS / attempts) * 100) : 100;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || savedDate) return;
    const created = saveScore({
      name: trimmed.slice(0, 24),
      errors,
      timeMs: durationMs,
    });
    setSavedDate(created.date);
  };

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
        className="glass my-auto w-full max-w-lg rounded-xl p-2"
      >
        <div className="bg-background-deep overflow-hidden rounded-lg">
          <header className="relative overflow-hidden px-6 py-7 text-center">
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(180deg,var(--brand-night),var(--brand-deep)_55%,var(--brand-brass-light))] opacity-75"
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
                className="mt-3 text-3xl sm:text-4xl"
              >
                Einstein vous salue
              </motion.h1>
            </div>
          </header>

          <motion.dl
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={revealAt(2)}
            className="border-line grid grid-cols-3 border-t"
          >
            <Stat label="Temps" value={formatDuration(durationMs)} />
            <Stat label="Erreurs" value={String(errors)} />
            <Stat label="Précision" value={`${accuracy} %`} />
          </motion.dl>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={revealAt(3)}
            className="border-line border-t px-6 py-5"
          >
            {savedDate ? (
              <p className="text-positive text-sm">
                Score enregistré au classement.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <label className="flex flex-1 flex-col gap-1.5 text-xs">
                  <span className="text-ink-fade font-medium uppercase">
                    Votre nom pour le classement
                  </span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={24}
                    autoComplete="nickname"
                    className="bg-surface outline-line-strong focus-visible:outline-accent-soft h-11 rounded-md px-3.5 text-base outline-1 outline-offset-[-1px] focus-visible:outline-2"
                  />
                </label>
                <Button type="submit" disabled={!name.trim()}>
                  Enregistrer
                </Button>
              </form>
            )}
          </motion.div>

          {leaderboard.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealAt(4)}
              className="border-line border-t px-6 py-4"
            >
              <Eyebrow>Classement</Eyebrow>
              <ol className="mt-2 flex max-h-44 flex-col gap-1 overflow-y-auto">
                {leaderboard.map((entry, index) => (
                  <li
                    key={`${entry.name}:${entry.date}`}
                    className={cn(
                      "flex items-center gap-3 rounded-xs px-1.5 py-1 text-sm",
                      entry.date === savedDate && "bg-surface-raised",
                    )}
                  >
                    <span className="text-accent-soft w-4 font-mono text-xs tabular-nums">
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
            transition={revealAt(5)}
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
