"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";

import type { Toast } from "@/features/game/state/useGameStore";
import { TRANSITION } from "@/lib/motion";

const TOAST_DURATION_MS = 4200;

/** Notifications éphémères empilées sous le bandeau du HUD. */
export function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: readonly Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-10 flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
      <p className="sr-only" aria-live="polite">
        {toasts.at(-1)?.text ?? ""}
      </p>
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timeout = setTimeout(() => onDismiss(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={TRANSITION.base}
      className="glass rounded-pill flex max-w-lg items-center gap-2.5 py-2 pr-4 pl-3 text-sm"
    >
      <span
        aria-hidden
        className="rounded-pill size-1.5 shrink-0"
        style={{
          backgroundColor: "var(--accent-soft)",
          boxShadow: "0 0 10px var(--accent-soft)",
        }}
      />
      <span>{toast.text}</span>
    </motion.div>
  );
}
