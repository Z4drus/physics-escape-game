import type { Camera, Scene } from "three";

import { useGameStore } from "@/features/game/state/useGameStore";

/**
 * Poignée de développement : expose le store, la caméra et la scène sur
 * `window` pour les tests pilotés par navigateur (captures, parcours
 * automatisés). Sans effet en production.
 */
export function exposeDebugHandle(camera: Camera, scene: Scene) {
  if (process.env.NODE_ENV === "production") return;
  Object.assign(window, {
    __physicsEscape: { store: useGameStore, camera, scene },
  });
}
