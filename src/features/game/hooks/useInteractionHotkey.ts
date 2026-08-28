"use client";

import { useEffect } from "react";

import { useGameStore } from "@/features/game/state/useGameStore";

/**
 * Ouvre la question de la station visée lorsque le joueur appuie sur « E ».
 */
export function useInteractionHotkey() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "KeyE" || event.repeat) return;

      const { status, focusedStationId, openStation } = useGameStore.getState();
      if (status !== "playing" || !focusedStationId) return;

      event.preventDefault();
      openStation(focusedStationId);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
