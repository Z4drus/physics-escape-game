"use client";

import { AnimatePresence, motion } from "motion/react";

import { TRANSITION } from "@/lib/motion";

/** Invite affichée sous le réticule quand un poste est à portée. */
export function InteractionPrompt({ label }: { label: string | null }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(50%+2.25rem)] flex justify-center">
      <AnimatePresence initial={false} mode="wait">
        {label ? (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={TRANSITION.base}
            className="glass rounded-pill flex items-center gap-2.5 py-1.5 pr-4 pl-1.5"
          >
            <kbd className="bg-ink text-background rounded-pill grid size-7 place-items-center font-mono text-xs font-bold">
              E
            </kbd>
            <span className="text-sm">
              Analyser <span className="font-medium">{label}</span>
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
