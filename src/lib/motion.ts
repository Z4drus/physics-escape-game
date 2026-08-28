/**
 * Vocabulaire de mouvement du design system.
 *
 * Un seul easing structure toute l'interface, décliné en trois durées :
 * micro-interaction, transition courante, révélation. Les révélations sont des
 * translations franches — le système source n'utilise presque jamais le fondu
 * seul.
 */
export const EASE_SMOOTH: [number, number, number, number] = [0.32, 0.72, 0, 1];

export const TRANSITION = {
  /** Survols et changements d'état immédiats. */
  micro: { duration: 0.2, ease: EASE_SMOOTH },
  /** Transition courante : boutons, panneaux, bascules. */
  base: { duration: 0.45, ease: EASE_SMOOTH },
  /** Apparition d'un bloc de contenu. */
  reveal: { duration: 0.8, ease: EASE_SMOOTH },
} as const;

/** Décalage entre deux éléments d'une même séquence révélée. */
export const STAGGER = 0.075;

/** Retourne la transition d'apparition du n-ième élément d'une séquence. */
export function revealAt(index: number, base = 0) {
  return { ...TRANSITION.base, delay: base + index * STAGGER };
}
