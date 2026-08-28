"use client";

import { useEffect, type RefObject } from "react";

/**
 * Branche la molette sur le facteur de zoom d'un schéma.
 *
 * L'écouteur est posé à la main plutôt que via `onWheel` : React attache ses
 * gestionnaires de molette en mode passif, où `preventDefault()` est ignoré,
 * et la page défilerait derrière le schéma.
 */
export function useWheelZoom(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  onZoom: (factor: number) => void,
) {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      // Un cran de molette vaut environ 100 : on en fait un facteur proche de 1.
      onZoom(Math.exp(-event.deltaY * 0.0015));
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [enabled, onZoom, ref]);
}
