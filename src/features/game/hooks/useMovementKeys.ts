"use client";

import { useEffect, useRef, type RefObject } from "react";

/** État instantané des touches de déplacement. */
export interface MovementKeys {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
}

const KEY_MAP: Record<string, keyof MovementKeys> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "backward",
  ArrowDown: "backward",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  ShiftLeft: "run",
  ShiftRight: "run",
};

/**
 * Suit les touches ZQSD/WASD dans une ref mutable : la boucle de rendu lit
 * l'état sans provoquer le moindre re-render React.
 *
 * Le clavier AZERTY est géré nativement puisque `event.code` décrit la
 * position physique de la touche (`KeyW` correspond au « Z » d'un AZERTY).
 */
export function useMovementKeys(): RefObject<MovementKeys> {
  const keys = useRef<MovementKeys>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    run: false,
  });

  useEffect(() => {
    const setKey = (code: string, pressed: boolean) => {
      const action = KEY_MAP[code];
      if (action) keys.current[action] = pressed;
    };

    const handleKeyDown = (event: KeyboardEvent) => setKey(event.code, true);
    const handleKeyUp = (event: KeyboardEvent) => setKey(event.code, false);
    const handleBlur = () => {
      keys.current = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        run: false,
      };
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return keys;
}
