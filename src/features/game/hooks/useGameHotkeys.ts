"use client";

import { useEffect } from "react";

import { useGameStore } from "@/features/game/state/useGameStore";

/**
 * Raccourcis de la salle : « E » active l'objet visé, « Tab » ouvre ou ferme
 * le carnet. Tous deux n'agissent que pendant l'exploration.
 */
export function useGameHotkeys() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const { status, focusedId, interact, toggleCarnet } =
        useGameStore.getState();
      if (status !== "playing") return;

      if (event.code === "KeyE") {
        if (!focusedId) return;
        event.preventDefault();
        interact(focusedId);
      } else if (event.code === "Tab") {
        event.preventDefault();
        toggleCarnet();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
