"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";

import {
  EXIT_TRIGGER_Z,
  PLAYER,
  PLAYER_SPAWN,
  buildColliders,
} from "@/features/game/data/room";
import { STATIONS } from "@/features/game/data/stations";
import { useMovementKeys } from "@/features/game/hooks/useMovementKeys";
import { useGameStore } from "@/features/game/state/useGameStore";
import { resolveMovement } from "@/lib/collision";

const UP = new Vector3(0, 1, 0);

// Vecteurs réutilisés d'une frame à l'autre : aucune allocation dans la boucle.
const forward = new Vector3();
const right = new Vector3();
const desired = new Vector3();

/**
 * Déplacement à la première personne : intégration de la vitesse, glissement
 * le long des obstacles, léger balancement de tête et détection du dispositif
 * visé par le joueur.
 */
export function Player({ doorOpen }: { doorOpen: boolean }) {
  const camera = useThree((state) => state.camera);
  const keys = useMovementKeys();
  const colliders = useMemo(() => buildColliders(doorOpen), [doorOpen]);
  const velocity = useRef(new Vector3());
  const bobPhase = useRef(0);

  useEffect(() => {
    camera.position.set(PLAYER_SPAWN[0], PLAYER.eyeHeight, PLAYER_SPAWN[2]);
  }, [camera]);

  useFrame((_, rawDelta) => {
    // Un onglet en arrière-plan peut produire un delta énorme : on le borne
    // pour ne pas téléporter le joueur au travers d'un mur.
    const delta = Math.min(rawDelta, 0.05);
    const { status, solvedStationIds, setFocusedStation, escapeRoom } =
      useGameStore.getState();

    if (status !== "playing") {
      velocity.current.setScalar(0);
      return;
    }

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, UP).normalize();

    const pressed = keys.current;
    const forwardInput = (pressed.forward ? 1 : 0) - (pressed.backward ? 1 : 0);
    const strafeInput = (pressed.right ? 1 : 0) - (pressed.left ? 1 : 0);

    desired
      .set(0, 0, 0)
      .addScaledVector(forward, forwardInput)
      .addScaledVector(right, strafeInput);

    if (desired.lengthSq() > 0) {
      desired
        .normalize()
        .multiplyScalar(pressed.run ? PLAYER.runSpeed : PLAYER.walkSpeed);
    }

    velocity.current.lerp(desired, 1 - Math.exp(-PLAYER.acceleration * delta));

    const resolved = resolveMovement(
      { x: camera.position.x, z: camera.position.z },
      {
        x: camera.position.x + velocity.current.x * delta,
        z: camera.position.z + velocity.current.z * delta,
      },
      PLAYER.radius,
      colliders,
    );

    const speed = velocity.current.length();
    bobPhase.current += speed * delta * 3.2;
    const bob =
      Math.sin(bobPhase.current) *
      0.022 *
      Math.min(speed / PLAYER.walkSpeed, 1);

    camera.position.set(resolved.x, PLAYER.eyeHeight + bob, resolved.z);

    setFocusedStation(findFocusedStation(camera.position, solvedStationIds));

    if (doorOpen && camera.position.z < EXIT_TRIGGER_Z) {
      escapeRoom();
    }
  });

  return null;
}

/**
 * Retourne la station la mieux alignée avec le regard du joueur, ou `null`.
 * On combine distance et écart angulaire plutôt qu'un raycast : les modèles
 * sont composés de nombreux petits meshes et viser une pièce précise serait
 * frustrant à la souris.
 */
function findFocusedStation(
  position: Vector3,
  solvedStationIds: readonly string[],
): string | null {
  let bestId: string | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const station of STATIONS) {
    if (solvedStationIds.includes(station.id)) continue;

    const dx = station.position[0] - position.x;
    const dz = station.position[2] - position.z;
    const distance = Math.hypot(dx, dz);
    const footprintRadius =
      Math.max(station.footprint[0], station.footprint[1]) / 2;

    if (distance > PLAYER.reach + footprintRadius) continue;

    // Produit scalaire entre le regard (projeté au sol) et la direction cible.
    const alignment = (forward.x * dx + forward.z * dz) / (distance || 1);
    const angle = Math.acos(Math.min(1, Math.max(-1, alignment)));
    if (angle > PLAYER.aimTolerance) continue;

    const score = angle * 2 + distance * 0.2;
    if (score < bestScore) {
      bestScore = score;
      bestId = station.id;
    }
  }

  return bestId;
}
