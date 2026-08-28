"use client";

import { useEffect } from "react";

import { INTERACTIVE_OBJECTS } from "@/features/game/data/room";
import { useGameStore } from "@/features/game/state/useGameStore";

const OBJECTS_BY_ID = new Map(
  INTERACTIVE_OBJECTS.map((object) => [object.id, object]),
);

/**
 * Ouvre l'énigme du dispositif visé lorsque le joueur appuie sur « E ».
 */
export function useInteractionHotkey() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "KeyE" || event.repeat) return;

      const { status, focusedObjectId, openPuzzle } = useGameStore.getState();
      if (status !== "playing" || !focusedObjectId) return;

      const object = OBJECTS_BY_ID.get(focusedObjectId);
      if (!object) return;

      event.preventDefault();
      openPuzzle(object.puzzleId);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
