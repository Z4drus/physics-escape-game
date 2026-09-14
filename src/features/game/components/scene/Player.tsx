"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";

import { buildColliders } from "@/features/game/data/colliders";
import { exposeDebugHandle } from "@/features/game/debug";
import { INTERACTABLES } from "@/features/game/data/interactables";
import {
  HOLOGRAM_DAIS,
  PLAYER,
  PLAYER_SPAWN,
  roomAt,
  type DoorId,
} from "@/features/game/data/world";
import { useMovementKeys } from "@/features/game/hooks/useMovementKeys";
import {
  isInteractableAvailable,
  useGameStore,
} from "@/features/game/state/useGameStore";
import { resolveMovement } from "@/lib/collision";
import type { Interactable, RoomId } from "@/types/game";

const UP = new Vector3(0, 1, 0);

// Vecteurs réutilisés d'une frame à l'autre : aucune allocation dans la boucle.
const forward = new Vector3();
const right = new Vector3();
const desired = new Vector3();
const gaze = new Vector3();
const toTarget = new Vector3();

/**
 * Déplacement à la première personne : intégration de la vitesse, glissement
 * le long des obstacles, léger balancement de tête, détection de la pièce
 * courante, de l'objet visé et de l'estrade de l'hologramme.
 */
export function Player({ openDoors }: { openDoors: ReadonlySet<DoorId> }) {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const keys = useMovementKeys();
  const colliders = useMemo(() => buildColliders(openDoors), [openDoors]);
  const velocity = useRef(new Vector3());
  const bobPhase = useRef(0);
  const status = useGameStore((state) => state.status);

  // Retour à la position de départ à chaque nouvelle partie.
  useEffect(() => {
    if (status === "idle") {
      camera.position.set(PLAYER_SPAWN[0], PLAYER.eyeHeight, PLAYER_SPAWN[2]);
      camera.rotation.set(0, 0, 0);
    }
  }, [camera, status]);

  useEffect(() => {
    exposeDebugHandle(camera, scene);
  }, [camera, scene]);

  useFrame((_, rawDelta) => {
    // Un onglet en arrière-plan peut produire un delta énorme : on le borne
    // pour ne pas téléporter le joueur au travers d'un mur.
    const delta = Math.min(rawDelta, 0.05);
    const state = useGameStore.getState();

    if (state.status !== "playing") {
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

    const room = roomAt(resolved.x, resolved.z) ?? state.currentRoomId;
    state.setCurrentRoom(room);
    camera.getWorldDirection(gaze);
    state.setFocused(findFocused(camera.position, gaze, room, state));

    if (room === "hologram") {
      const dx = resolved.x - HOLOGRAM_DAIS.center[0];
      const dz = resolved.z - HOLOGRAM_DAIS.center[1];
      if (Math.hypot(dx, dz) < HOLOGRAM_DAIS.triggerRadius) {
        state.enterFinale();
      }
    }
  });

  return null;
}

/**
 * Retourne l'objet de la pièce courante le mieux aligné avec le regard du
 * joueur, ou `null`. On combine distance au sol et écart angulaire en trois
 * dimensions plutôt qu'un raycast : les modèles sont composés de nombreux
 * petits meshes et viser une pièce précise serait frustrant à la souris.
 * Prendre la hauteur en compte permet de distinguer un tableau accroché
 * au-dessus d'un meuble du meuble lui-même.
 */
function findFocused(
  position: Vector3,
  direction: Vector3,
  room: RoomId,
  state: Parameters<typeof isInteractableAvailable>[1],
): string | null {
  let bestId: string | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const item of INTERACTABLES) {
    if (!isInRoom(item, room)) continue;
    if (!isInteractableAvailable(item, state)) continue;

    const dx = item.position[0] - position.x;
    const dz = item.position[2] - position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > PLAYER.reach + item.radius) continue;

    toTarget.set(dx, item.position[1] - position.y, dz).normalize();
    const angle = Math.acos(Math.min(1, Math.max(-1, direction.dot(toTarget))));
    if (angle > PLAYER.aimTolerance) continue;

    const score = angle * 2 + distance * 0.2;
    if (score < bestScore) {
      bestScore = score;
      bestId = item.id;
    }
  }

  return bestId;
}

/** Les portes se visent depuis les deux pièces qu'elles relient. */
function isInRoom(item: Interactable, room: RoomId): boolean {
  if (item.roomId === room) return true;
  if (item.kind === "cabinet-door") return room === "cabinet";
  if (item.kind === "final-door") return room === "hologram";
  return false;
}
