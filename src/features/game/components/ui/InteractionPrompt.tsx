"use client";

import { AnimatePresence, motion } from "motion/react";

/** Invite affichée sous le réticule quand un dispositif est à portée. */
export function InteractionPrompt({ label }: { label: string | null }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(50%+2.5rem)] flex justify-center">
      <AnimatePresence initial={false} mode="wait">
        {label ? (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="panel-shadow bg-surface/85 flex items-center gap-2.5 rounded-2xl px-3 py-2 backdrop-blur-md"
          >
            <kbd className="bg-accent text-background grid size-6 place-items-center rounded-lg font-mono text-xs font-bold">
              E
            </kbd>
            <span className="text-sm">
              Examiner <span className="font-medium">{label}</span>
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
