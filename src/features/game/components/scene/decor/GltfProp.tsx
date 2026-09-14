"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { Box3, Mesh, Vector3, type Group, type Object3D } from "three";

/** Modèles 3D générés pour le musée, servis depuis `public/models`. */
export const MODELS = {
  bustArchimede: "/models/bust-archimede.glb",
  bustEinstein: "/models/bust-einstein.glb",
  armillary: "/models/armillary.glb",
  telescope: "/models/telescope.glb",
  galvanometer: "/models/galvanometer.glb",
  inductionCoil: "/models/induction-coil.glb",
} as const;

for (const url of Object.values(MODELS)) useGLTF.preload(url);

/**
 * Clone d'un modèle glTF posé sur sa base et mis à l'échelle sur une hauteur
 * cible : les modèles générés n'ont ni échelle ni origine fiables, on les
 * normalise à l'arrivée plutôt que de dépendre de leurs unités.
 */
export function useNormalizedModel(url: string, height: number): Object3D {
  const { scene } = useGLTF(url);

  return useMemo(() => {
    const clone: Group = scene.clone(true);
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    const scale = size.y > 0 ? height / size.y : 1;
    clone.scale.setScalar(scale);

    box.setFromObject(clone);
    const center = box.getCenter(new Vector3());
    clone.position.set(-center.x, -box.min.y, -center.z);

    clone.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene, height]);
}

/** Modèle glTF normalisé, posé à `position`. */
export function GltfProp({
  url,
  height,
  position = [0, 0, 0],
  rotationY = 0,
}: {
  url: string;
  /** Hauteur finale du modèle, en mètres. */
  height: number;
  position?: [number, number, number];
  rotationY?: number;
}) {
  const model = useNormalizedModel(url, height);

  return (
    <group position={position} rotation-y={rotationY}>
      <primitive object={model} />
    </group>
  );
}
