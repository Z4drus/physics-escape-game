"use client";

import { motion } from "motion/react";

import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Panel";
import { STATIONS } from "@/features/game/data/stations";
import { TRANSITION, revealAt } from "@/lib/motion";

const STEPS: readonly string[] = [
  `Explorez le laboratoire et repérez les ${STATIONS.length} postes de mesure.`,
  "Approchez-vous d'un poste et appuyez sur E pour l'analyser.",
  "Un schéma animé illustre la situation : répondez juste pour obtenir la clé.",
  "Les clés réunies, la porte se déverrouille. Sortez.",
];

/**
 * Écran d'accueil et écran de pause. Le bouton principal est le seul point
 * d'entrée du verrouillage du pointeur : il doit rester un vrai clic
 * utilisateur pour que le navigateur l'autorise.
 */
export function StartOverlay({
  variant,
  onEnter,
  ready,
}: {
  variant: "idle" | "paused";
  onEnter: () => void;
  /** `false` pendant le délai de garde imposé après une sortie de Pointer Lock. */
  ready: boolean;
}) {
  const isPaused = variant === "paused";

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
          <header className="relative overflow-hidden px-6 py-7">
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(180deg,var(--brand-night),var(--brand-deep)_58%,var(--brand-cyan))] opacity-70"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.05)_1px,transparent_1px)] bg-[length:8px_8px]"
            />

            <div className="relative">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={revealAt(0)}
              >
                <Eyebrow>
                  {isPaused
                    ? "Partie en pause"
                    : "Escape game · Laboratoire B-204"}
                </Eyebrow>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={revealAt(1)}
                className="mt-3 text-3xl sm:text-4xl"
              >
                {isPaused ? "Reprendre l'expérience" : "Physics Escape"}
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
              {isPaused
                ? "Votre progression est conservée. Reprenez le contrôle pour continuer l'exploration."
                : "Vous êtes enfermé dans un laboratoire de physique. Six postes de mesure, six questions, six clés : c'est le prix de la sortie."}
            </p>
          </motion.div>

          {!isPaused ? (
            <motion.ol
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealAt(3)}
              className="border-line flex flex-col border-t"
            >
              {STEPS.map((step, index) => (
                <li
                  key={step}
                  className="border-line flex items-start gap-3 border-t px-6 py-3 first:border-t-0"
                >
                  <span className="text-accent-soft bg-surface-raised rounded-pill grid size-6 shrink-0 place-items-center font-mono text-xs">
                    {index + 1}
                  </span>
                  <span className="text-ink-fade text-sm">{step}</span>
                </li>
              ))}
            </motion.ol>
          ) : null}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={revealAt(4)}
            className="border-line border-t px-6 py-5"
          >
            <Button
              onClick={onEnter}
              disabled={!ready}
              withArrow
              className="w-full"
            >
              {!ready
                ? "Un instant…"
                : isPaused
                  ? "Reprendre la partie"
                  : "Entrer dans le laboratoire"}
            </Button>
            <p className="text-ink-mute mt-3 text-center text-xs">
              La souris sera capturée par le jeu. Échap pour la libérer.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
