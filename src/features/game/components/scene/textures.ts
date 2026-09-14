"use client";

import { useTexture } from "@react-three/drei";
import { useMemo } from "react";
import {
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";

/**
 * Textures PBR du musée (Poly Haven, CC0, 1K). Chaque jeu comprend une
 * couleur, une normale et la carte ARM de Poly Haven, dont three.js lit la
 * rugosité dans le canal vert.
 */
export const TEXTURE_SETS = {
  parquet: {
    map: "/textures/parquet/diffuse.webp",
    normalMap: "/textures/parquet/normal.webp",
    roughnessMap: "/textures/parquet/rough.webp",
  },
  plaster: {
    map: "/textures/plaster/diffuse.webp",
    normalMap: "/textures/plaster/normal.webp",
    roughnessMap: "/textures/plaster/rough.webp",
  },
  wood: {
    map: "/textures/wood/diffuse.webp",
    normalMap: "/textures/wood/normal.webp",
    roughnessMap: "/textures/wood/rough.webp",
  },
  marble: {
    map: "/textures/marble/diffuse.webp",
    normalMap: "/textures/marble/normal.webp",
    roughnessMap: "/textures/marble/rough.webp",
  },
} as const;

export type TextureSetName = keyof typeof TEXTURE_SETS;

export interface TextureSet {
  map: Texture;
  normalMap: Texture;
  roughnessMap: Texture;
}

/** Charge un jeu de textures brutes ; le réglage se fait à la déclinaison. */
export function useTextureSet(name: TextureSetName): TextureSet {
  const paths = TEXTURE_SETS[name];
  const [map, normalMap, roughnessMap] = useTexture([
    paths.map,
    paths.normalMap,
    paths.roughnessMap,
  ]);
  return useMemo(
    () => ({ map, normalMap, roughnessMap }),
    [map, normalMap, roughnessMap],
  );
}

/**
 * Décline un jeu de textures avec une répétition adaptée à la surface : un
 * sol de 16 m ne doit pas étirer une planche prévue pour 2 m. Les clones
 * partagent l'image déjà envoyée au GPU, et reçoivent ici tous leurs
 * réglages (répétition, espace colorimétrique, anisotropie) : on ne dépend
 * ainsi d'aucun rappel de chargement qui arriverait après le clonage.
 */
export function useRepeatedSet(
  set: TextureSet,
  repeatX: number,
  repeatY: number,
  rotation = 0,
): TextureSet {
  return useMemo(() => {
    const tune = (texture: Texture, isColor: boolean) => {
      const clone = texture.clone();
      clone.colorSpace = isColor ? SRGBColorSpace : NoColorSpace;
      clone.wrapS = RepeatWrapping;
      clone.wrapT = RepeatWrapping;
      clone.anisotropy = 8;
      clone.repeat.set(repeatX, repeatY);
      clone.rotation = rotation;
      clone.needsUpdate = true;
      return clone;
    };
    return {
      map: tune(set.map, true),
      normalMap: tune(set.normalMap, false),
      roughnessMap: tune(set.roughnessMap, false),
    };
  }, [set, repeatX, repeatY, rotation]);
}
