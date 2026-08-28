"use client";

import { motion } from "motion/react";

const STEPS: readonly string[] = [
  "Explorez la salle et repérez les cinq dispositifs de physique.",
  "Approchez-vous et appuyez sur E pour analyser un dispositif.",
  "Répondez correctement pour récupérer la clé associée.",
  "Une fois les cinq clés réunies, la porte s'ouvre : sortez.",
];

/**
 * Écran d'accueil et écran de pause. Le bouton principal est le seul point
 * d'entrée du verrouillage du pointeur : il doit rester un vrai clic
 * utilisateur pour que le navigateur l'autorise.
 */
export function StartOverlay({
  variant,
  onEnter,
}: {
  variant: "idle" | "paused";
  onEnter: () => void;
}) {
  const isPaused = variant === "paused";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-20 grid place-items-center bg-black/70 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0 }}
        className="panel-shadow bg-surface w-full max-w-lg rounded-[28px] p-2"
      >
        <div className="bg-surface-raised rounded-[20px] p-7">
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="text-accent font-display text-[11px] tracking-[0.24em] uppercase"
          >
            {isPaused ? "Partie en pause" : "Escape game · Laboratoire B-204"}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.16 }}
            className="mt-3 text-2xl leading-tight font-bold sm:text-3xl"
          >
            {isPaused ? "Reprendre l'expérience" : "Physics Escape"}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.24 }}
            className="text-muted mt-3 text-sm"
          >
            {isPaused
              ? "Votre progression est conservée. Reprenez le contrôle pour continuer à explorer la salle."
              : "Vous êtes enfermé dans un laboratoire de physique. Cinq dispositifs, cinq questions, cinq clés : c'est le prix de la sortie."}
          </motion.p>

          {!isPaused ? (
            <motion.ol
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.32 }}
              className="mt-6 flex flex-col gap-2"
            >
              {STEPS.map((step, index) => (
                <li
                  key={step}
                  className="flex items-start gap-3 rounded-2xl bg-white/[0.04] px-4 py-3"
                >
                  <span className="bg-accent/15 text-accent grid size-6 shrink-0 place-items-center rounded-xl font-mono text-xs">
                    {index + 1}
                  </span>
                  <span className="text-muted text-sm">{step}</span>
                </li>
              ))}
            </motion.ol>
          ) : null}

          <motion.button
            type="button"
            onClick={onEnter}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.4 }}
            className="bg-accent text-background mt-7 h-12 w-full cursor-pointer rounded-2xl text-sm font-semibold transition-[scale,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-[var(--accent-strong)] active:scale-[0.96]"
          >
            {isPaused ? "Reprendre la partie" : "Entrer dans la salle"}
          </motion.button>

          <p className="text-muted mt-3 text-center text-xs">
            La souris sera capturée par le jeu. Appuyez sur Échap pour la
            libérer.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
