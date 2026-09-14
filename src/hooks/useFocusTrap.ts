"use client";

import { useEffect, type RefObject } from "react";

/** Éléments susceptibles de recevoir le focus au clavier dans une modale. */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Pile des pièges actifs : seule la modale du dessus intercepte la tabulation,
 * ce qui laisse le schéma agrandi fonctionner par-dessus la boîte de dialogue
 * du poste sans que les deux se disputent le focus.
 */
const trapStack: RefObject<HTMLElement | null>[] = [];

function focusableElementsOf(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      element.getAttribute("aria-hidden") !== "true" &&
      (element.offsetWidth > 0 ||
        element.offsetHeight > 0 ||
        element.getClientRects().length > 0),
  );
}

/**
 * Enferme la tabulation dans une modale et rend le focus à l'élément d'origine
 * à la fermeture.
 *
 * L'écouteur est posé sur le document plutôt que sur le conteneur : quand le
 * focus retombe sur `<body>` (par exemple parce que le bouton qui le portait
 * vient d'être désactivé), la tabulation suivante doit quand même ramener le
 * joueur dans la modale.
 *
 * @param containerRef Conteneur de la modale.
 * @param active `true` tant que la modale est ouverte.
 * @param restoreFocus Rendre le focus à l'élément d'origine à la fermeture.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  restoreFocus = true,
) {
  useEffect(() => {
    if (!active) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    trapStack.push(containerRef);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      if (trapStack.at(-1) !== containerRef) return;

      const container = containerRef.current;
      if (!container) return;

      const focusable = focusableElementsOf(container);
      const focused = document.activeElement;

      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!(focused instanceof HTMLElement) || !container.contains(focused)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && (focused === first || focused === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && focused === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      const index = trapStack.lastIndexOf(containerRef);
      if (index !== -1) trapStack.splice(index, 1);

      if (restoreFocus && previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef, restoreFocus]);
}
