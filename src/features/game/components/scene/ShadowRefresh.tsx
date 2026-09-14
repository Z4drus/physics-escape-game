"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Mesh, type Object3D } from "three";

interface CasterRecord {
  /** Matrice monde relevée à la dernière image. */
  matrix: Float64Array;
  /** Numéro de la dernière image où l'objet était visible. */
  frame: number;
}

/**
 * Carte d'ombre recalculée à la demande. La lumière directionnelle couvre
 * tout le musée : redessiner sa carte à chaque image coûte près de deux cents
 * appels de dessin, alors que presque rien de ce qui porte ombre ne bouge.
 * Chaque image, on relève la matrice monde des objets visibles qui projettent
 * une ombre, et la carte n'est redessinée que si l'un d'eux a bougé, est
 * apparu ou a disparu : porte qui pivote, pièce qui s'ouvre, tiroir tiré.
 *
 * Les matrices lues sont celles du rendu précédent : une ombre qui se met en
 * mouvement suit son objet avec une image de retard, imperceptible. Les pièces
 * animées en continu (chariot, bille, pistons) ne portent pas d'ombre, elles
 * forceraient une mise à jour permanente.
 */
export function ShadowRefresh() {
  const casters = useRef(new Map<Object3D, CasterRecord>());
  const frame = useRef(0);

  useFrame(({ gl, scene }) => {
    // Dès la première image, la carte ne se redessine plus que sur demande.
    if (gl.shadowMap.autoUpdate) gl.shadowMap.autoUpdate = false;

    const records = casters.current;
    frame.current += 1;
    const current = frame.current;
    let changed = false;
    let visible = 0;

    scene.traverseVisible((object) => {
      if (!(object instanceof Mesh) || !object.castShadow) return;
      visible += 1;
      let record = records.get(object);
      if (!record) {
        record = { matrix: new Float64Array(16), frame: current };
        records.set(object, record);
        changed = true;
      }
      record.frame = current;
      const elements = object.matrixWorld.elements;
      for (let index = 0; index < 16; index += 1) {
        if (record.matrix[index] !== elements[index]) {
          record.matrix[index] = elements[index];
          changed = true;
        }
      }
    });

    // Un objet sorti du rendu (pièce masquée, cadenas retiré) emporte son ombre.
    if (visible !== records.size) {
      for (const [object, record] of records) {
        if (record.frame !== current) records.delete(object);
      }
      changed = true;
    }

    if (changed) gl.shadowMap.needsUpdate = true;
  });

  return null;
}
