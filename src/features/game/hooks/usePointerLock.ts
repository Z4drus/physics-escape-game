"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import type { PointerLockControlsHandle } from "@/features/game/components/GameCanvas";

/**
 * Délai imposé par les navigateurs entre une sortie de Pointer Lock **décidée
 * par l'utilisateur** (touche Échap) et une nouvelle demande. En deçà,
 * `requestPointerLock()` lève une `SecurityError`.
 */
const RELOCK_COOLDOWN_MS = 1400;

/**
 * Pilote le verrouillage du pointeur.
 *
 * On n'appelle jamais `controls.lock()` : three-stdlib y ignore la promesse
 * renvoyée par `requestPointerLock()`, ce qui produit un `unhandledRejection`
 * dès que le navigateur refuse la demande. On pilote donc l'API nous-mêmes.
 *
 * Le délai de garde ne s'applique qu'aux sorties déclenchées par le joueur :
 * quand c'est le jeu qui relâche le pointeur pour ouvrir une modale, le
 * verrouillage peut être repris immédiatement au clic suivant.
 */
export function usePointerLock(
  controlsRef: RefObject<PointerLockControlsHandle | null>,
) {
  const [ready, setReady] = useState(true);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releasedByGame = useRef(false);

  const startCooldown = useCallback(() => {
    setReady(false);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setReady(true), RELOCK_COOLDOWN_MS);
  }, []);

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  /** Relâche le pointeur à l'initiative du jeu (ouverture d'une modale). */
  const releaseLock = useCallback(() => {
    releasedByGame.current = true;
    controlsRef.current?.unlock();
  }, [controlsRef]);

  /**
   * À brancher sur l'événement `unlock` des contrôles.
   * Retourne `true` si la sortie venait du jeu et non du joueur.
   */
  const handleUnlockEvent = useCallback(() => {
    const fromGame = releasedByGame.current;
    releasedByGame.current = false;
    if (!fromGame) startCooldown();
    return fromGame;
  }, [startCooldown]);

  /**
   * Demande le verrouillage. À appeler directement dans un gestionnaire
   * d'événement utilisateur, sans `await` préalable, pour conserver
   * l'activation que le navigateur exige.
   */
  const requestLock = useCallback(async (): Promise<boolean> => {
    const element = controlsRef.current?.domElement;
    if (!element || !ready) return false;

    try {
      const request: unknown = element.requestPointerLock();
      if (request instanceof Promise) await request;
      return true;
    } catch {
      // Demande trop rapprochée ou onglet sans focus : on réarme le délai.
      startCooldown();
      return false;
    }
  }, [controlsRef, ready, startCooldown]);

  return { requestLock, releaseLock, handleUnlockEvent, ready };
}
