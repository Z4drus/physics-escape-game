/**
 * Vocabulaire de mouvement du design system.
 *
 * Un seul easing structure toute l'interface, décliné en deux durées : la
 * micro-interaction et la transition courante. Les apparitions sont des
 * translations franches, le fondu seul étant réservé aux voiles.
 */
export const EASE_SMOOTH: [number, number, number, number] = [0.32, 0.72, 0, 1];

export const TRANSITION = {
  /** Survols et changements d'état immédiats. */
  micro: { duration: 0.2, ease: EASE_SMOOTH },
  /** Transition courante : boutons, panneaux, bascules, apparitions. */
  base: { duration: 0.45, ease: EASE_SMOOTH },
} as const;

/** Décalage entre deux éléments d'une même séquence révélée. */
export const STAGGER = 0.075;

/** Retourne la transition d'apparition du n-ième élément d'une séquence. */
export function revealAt(index: number, base = 0) {
  return { ...TRANSITION.base, delay: base + index * STAGGER };
}
