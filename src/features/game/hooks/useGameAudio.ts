"use client";

import { useEffect, useSyncExternalStore } from "react";

import { useGameStore } from "@/features/game/state/useGameStore";
import {
  duckAmbient,
  getMutedServerSnapshot,
  isMuted,
  playSound,
  setMuted,
  startAmbient,
  stopAmbient,
  subscribeMuted,
} from "@/lib/audio";

/**
 * Relie le son à la partie : chaque transition notable du store déclenche un
 * effet, le fond sonore suit l'état, et la touche M coupe tout.
 */
export function useGameAudio() {
  useEffect(() => {
    const unsubscribe = useGameStore.subscribe((state, previous) => {
      if (state.status !== previous.status) {
        if (state.status === "playing" && previous.status === "intro")
          startAmbient();
        if (state.status === "idle") stopAmbient();
        if (state.status === "modal") playSound("open", 0.35);
        if (previous.status === "modal" && state.status === "locking")
          playSound("close", 0.3);
        if (state.status === "finale") playSound("hologram", 0.6);
        duckAmbient(state.status !== "playing");
      }
      if (state.seals.length > previous.seals.length) playSound("seal", 0.6);
      if (state.errors > previous.errors) playSound("error", 0.4);
      if (state.inventory.length > previous.inventory.length)
        playSound("pickup", 0.5);
      if (state.cabinetUnlocked && !previous.cabinetUnlocked)
        playSound("unlock", 0.6);
      if (state.safeOpen && !previous.safeOpen) playSound("unlock", 0.6);
      if (state.energyCaseUnlocked && !previous.energyCaseUnlocked)
        playSound("unlock", 0.5);
      if (state.powerRestored && !previous.powerRestored)
        playSound("power", 0.6);
      if (state.carnetOpen !== previous.carnetOpen) playSound("click", 0.25);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "KeyM" || event.repeat) return;
      const { status, notify } = useGameStore.getState();
      if (status === "idle" || status === "intro") return;
      const next = !isMuted();
      setMuted(next);
      notify(next ? "Son coupé." : "Son rétabli.");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

/** Réglage du silence, lisible par l'interface. */
export function useMuted(): boolean {
  return useSyncExternalStore(subscribeMuted, isMuted, getMutedServerSnapshot);
}
