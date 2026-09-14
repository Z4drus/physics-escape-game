"use client";

import { motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/cn";
import { TRANSITION } from "@/lib/motion";

/**
 * Coque commune des fenêtres du jeu : voile plein écran, carte de verre à
 * rayons concentriques (extérieur 1,75 rem, padding 0,5 rem, intérieur
 * 1,25 rem), piège à focus et fermeture par Échap.
 */
export function ModalShell({
  children,
  label,
  labelledBy,
  onClose,
  closeOnEscape = true,
  maxWidth = "max-w-2xl",
  minHeight,
  className,
}: {
  children: ReactNode;
  /** Intitulé accessible, si aucun titre visible ne le porte. */
  label?: string;
  /** Identifiant de l'élément qui sert de titre. */
  labelledBy?: string;
  onClose: () => void | Promise<void>;
  /** Désactivé quand une surcouche gère elle-même Échap. */
  closeOnEscape?: boolean;
  maxWidth?: string;
  /** Hauteur minimale de la carte, pour les fenêtres qui méritent de l'air. */
  minHeight?: string;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, true);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!closeOnEscape) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeOnEscape, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TRANSITION.micro}
      className="scrim fixed inset-0 z-20 flex justify-center overflow-y-auto overscroll-contain p-4"
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={TRANSITION.base}
        className={cn(
          "glass my-auto w-full rounded-xl p-2 outline-none",
          maxWidth,
          className,
        )}
      >
        <div
          className={cn(
            "bg-background-deep flex flex-col overflow-hidden rounded-lg",
            minHeight,
          )}
        >
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Bouton de fermeture d'une fenêtre, en croix, 40 px minimum. */
export function CloseButton({
  onClick,
  label = "Fermer",
}: {
  onClick: () => void | Promise<void>;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="text-ink-mute hover:text-ink hover:bg-surface-raised ease-smooth tap-target grid size-10 cursor-pointer place-items-center rounded-sm transition-[color,background-color,scale] duration-[200ms] active:scale-[0.96]"
    >
      <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-4">
        <path
          d="M4 4L12 12M12 4L4 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
