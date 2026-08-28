"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BufferAttribute,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from "three";

import { DIAGRAM_COLORS } from "@/features/game/components/diagrams/palette";
import { DiagramLabel } from "@/features/game/components/diagrams/primitives/DiagramLabel";
import { VectorArrow } from "@/features/game/components/diagrams/primitives/VectorArrow";
import type { DiagramSceneProps } from "@/features/game/components/diagrams/registry";
import type { Vec3 } from "@/types/game";

/* -------------------------------------------------------------------------- */
/*  Constantes de module                                                       */
/*                                                                             */
/*  Géométries, matériaux et objets de travail vivent ici : ils sont créés une */
/*  seule fois et `useFrame` n'a plus qu'à écrire dedans — aucune allocation   */
/*  n'a donc lieu pendant l'animation.                                         */
/* -------------------------------------------------------------------------- */

/** Bornes de la rampe thermique commune aux trois schémas du thème chaleur. */
const RAMP_MIN_C = 0;
const RAMP_MAX_C = 100;

const COLD_COLOR = new Color(DIAGRAM_COLORS.cold);
const HOT_COLOR = new Color(DIAGRAM_COLORS.hot);
/** Couleur de travail réutilisée à chaque image. */
const WORK_COLOR = new Color();
/** Objet de travail servant à composer les matrices des maillages instanciés. */
const WORK_OBJECT = new Object3D();

/** Durée d'un cycle complet, en secondes. */
const CYCLE_S = 6;
/** Fin de la pose initiale (deux couches nettes), qui absorbe le fondu d'entrée. */
const MIX_START_S = 0.6;
/** Fin de l'homogénéisation. */
const MIX_END_S = 4.4;
/** Fin du maintien à l'équilibre, début du fondu de retour. */
const HOLD_END_S = 5.2;

/** Enveloppe du liquide, du fond du calorimètre à la surface libre. */
const WATER_RADIUS = 0.53;
const WATER_BOTTOM_Y = 0.1;
const WATER_TOP_Y = 1;
const WATER_HEIGHT = WATER_TOP_Y - WATER_BOTTOM_Y;
const WATER_CENTER_Y = (WATER_BOTTOM_Y + WATER_TOP_Y) / 2;
const WATER_OPACITY = 0.92;

/**
 * Azimut de la caméra du `DiagramViewer`, en radians. Le quart avant du
 * calorimètre est retiré autour de cet azimut pour découvrir l'intérieur.
 */
const CAMERA_AZIMUTH = Math.atan2(3.6, 4.8);
const CUT_START = CAMERA_AZIMUTH + Math.PI / 4;
const CUT_LENGTH = Math.PI * 1.5;

/** Ancrage du thermomètre : le bulbe plonge dans la couche froide. */
const BULB_POSITION: Vec3 = [0.22, 0.35, 0];
/** Longueur de la colonne à 0 °C, puis allongement pour 100 °C. */
const COLUMN_BASE_LENGTH = 0.9;
const COLUMN_SPAN_LENGTH = 0.55;

const HOT_PARTICLE_COUNT = 20;
const COLD_PARTICLE_COUNT = 20;
const PARTICLE_COUNT = HOT_PARTICLE_COUNT + COLD_PARTICLE_COUNT;

/** Les deux flux de chaleur, orientés du chaud vers le froid, jamais l'inverse. */
const FLUX: readonly { origin: Vec3; direction: Vec3 }[] = [
  { origin: [-0.3, 0.88, 0.3], direction: [0.4, -1, -0.3] },
  { origin: [0.3, 0.88, 0.3], direction: [-0.4, -1, -0.3] },
];

/** Graduations neutres de l'échelle : elles n'affichent aucune valeur. */
const SCALE_TICKS = [-0.16, -0.08, 0, 0.08, 0.16] as const;

/** Construit le cylindre de liquide et lui ajoute son attribut de couleur. */
function createWaterGeometry(): CylinderGeometry {
  const geometry = new CylinderGeometry(
    WATER_RADIUS,
    WATER_RADIUS,
    WATER_HEIGHT,
    40,
    24,
  );
  const vertexCount = geometry.attributes.position.count;
  geometry.setAttribute(
    "color",
    new BufferAttribute(new Float32Array(vertexCount * 3), 3),
  );
  return geometry;
}

/**
 * Un seul volume d'eau, dont les couleurs de sommet portent les deux couches :
 * fusionner les deux cylindres en un seul est ce qui permet à la frontière de
 * se flouter progressivement au lieu de sauter d'un état à l'autre.
 */
const WATER_GEOMETRY = createWaterGeometry();

const WATER_MATERIAL = new MeshStandardMaterial({
  vertexColors: true,
  transparent: true,
  opacity: WATER_OPACITY,
  roughness: 0.14,
  metalness: 0.05,
  emissive: new Color(DIAGRAM_COLORS.cold),
  emissiveIntensity: 0.16,
});

/** Paroi interne du calorimètre : métal poli très peu opaque. */
const SHELL_MATERIAL = new MeshStandardMaterial({
  color: new Color(DIAGRAM_COLORS.metal),
  transparent: true,
  opacity: 0.22,
  roughness: 0.1,
  metalness: 0.4,
  side: DoubleSide,
  depthWrite: false,
});

/** Isolant extérieur : mat et opaque, il matérialise l'enceinte fermée. */
const INSULATION_MATERIAL = new MeshStandardMaterial({
  color: new Color(DIAGRAM_COLORS.object),
  roughness: 0.95,
  metalness: 0,
  side: DoubleSide,
});

const HOT_PARTICLE_MATERIAL = new MeshStandardMaterial({
  color: new Color(DIAGRAM_COLORS.hot),
  emissive: new Color(DIAGRAM_COLORS.hot),
  emissiveIntensity: 1,
  transparent: true,
  opacity: 0.9,
  toneMapped: false,
});

const COLD_PARTICLE_MATERIAL = new MeshStandardMaterial({
  color: new Color(DIAGRAM_COLORS.cold),
  emissive: new Color(DIAGRAM_COLORS.cold),
  emissiveIntensity: 1,
  transparent: true,
  opacity: 0.9,
  toneMapped: false,
});

/** Répartition fixe des particules dans le cylindre. */
const PARTICLE_SEEDS = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
  const angle = index * 2.399963;
  const radius = 0.08 + ((index * 13) % 17) * 0.024;
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    offset: ((index * 7) % 20) / 20,
    speed: 0.55 + ((index * 5) % 6) * 0.11,
  };
});

/* -------------------------------------------------------------------------- */
/*  Petites fonctions pures                                                    */
/* -------------------------------------------------------------------------- */

/** Ramène une valeur dans l'intervalle [0 ; 1]. */
function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Interpolation linéaire entre deux nombres. */
function mix(from: number, to: number, ratio: number): number {
  return from + (to - from) * ratio;
}

/** Courbe en S : démarrage et arrivée adoucis. */
function smoothStep(ratio: number): number {
  const clamped = clamp01(ratio);
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Écrit dans `target` la couleur d'un volume d'eau à la température donnée.
 * La rampe va de 0 °C (`cold`) à 100 °C (`hot`) : bornée au domaine de l'eau
 * liquide, elle place 40 °C nettement du côté froid plutôt qu'au milieu visuel.
 */
function writeTemperatureColor(target: Color, celsius: number): void {
  const ratio = clamp01((celsius - RAMP_MIN_C) / (RAMP_MAX_C - RAMP_MIN_C));
  target.lerpColors(COLD_COLOR, HOT_COLOR, ratio);
}

/** Formate un nombre décimal à la française (virgule décimale). */
function formatDecimal(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

/** Formate un entier avec des espaces fines insécables comme séparateurs. */
function formatInteger(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/* -------------------------------------------------------------------------- */
/*  Scène                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Schéma `thermal-mixing-calorimeter` : deux masses d'eau superposées dans un
 * calorimètre isolé, l'eau chaude au-dessus puisqu'elle est moins dense. Le
 * rapport des masses se lit directement dans le rapport des hauteurs, et
 * l'animation montre la couche chaude se déplacer deux fois plus vite que la
 * froide avant que les deux ne se rejoignent.
 *
 * Aucune graduation chiffrée ni valeur d'équilibre n'est affichée : le schéma
 * décrit la situation de l'énoncé, il ne donne jamais la température finale.
 */
export function ThermalMixingCalorimeterScene({ params }: DiagramSceneProps) {
  const coldMass = Number(params.masseFroideKg ?? 2);
  const coldStartC = Number(params.temperatureFroideC ?? 20);
  const hotMass = Number(params.masseChaudeKg ?? 1);
  const hotStartC = Number(params.temperatureChaudeC ?? 80);
  const heatCapacity = Number(params.capaciteThermiqueJParKgK ?? 4180);

  /**
   * Température d'équilibre, moyenne pondérée par les masses. Elle ne sert qu'à
   * teinter le liquide et à arrêter la colonne : elle n'est jamais écrite.
   */
  const equilibriumC = useMemo(() => {
    const totalMass = coldMass + hotMass;
    if (totalMass <= 0) return coldStartC;
    return (coldMass * coldStartC + hotMass * hotStartC) / totalMass;
  }, [coldMass, coldStartC, hotMass, hotStartC]);

  /**
   * Frontière entre les deux couches, en hauteur normalisée : elle est fixée par
   * le rapport des masses, l'eau ayant partout la même masse volumique.
   */
  const boundaryRatio = useMemo(() => {
    const totalMass = coldMass + hotMass;
    return totalMass <= 0 ? 0.5 : coldMass / totalMass;
  }, [coldMass, hotMass]);

  const columnMesh = useRef<Mesh>(null);
  const hotParticles = useRef<InstancedMesh>(null);
  const coldParticles = useRef<InstancedMesh>(null);
  const fluxGroup = useRef<Group>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime % CYCLE_S;

    // Progression de l'homogénéisation : 0 = deux couches nettes, 1 = équilibre.
    let mixing: number;
    if (time < MIX_START_S) {
      mixing = 0;
    } else if (time < MIX_END_S) {
      mixing = smoothStep((time - MIX_START_S) / (MIX_END_S - MIX_START_S));
    } else if (time < HOLD_END_S) {
      mixing = 1;
    } else {
      // Fondu de retour : les couches se reforment pendant que l'opacité baisse,
      // ce qui supprime toute coupure sèche au bouclage.
      mixing = 1 - smoothStep((time - HOLD_END_S) / (CYCLE_S - HOLD_END_S));
    }

    let fade = 1;
    if (time > HOLD_END_S) {
      fade = mix(1, 0.35, (time - HOLD_END_S) / (CYCLE_S - HOLD_END_S));
    } else if (time < MIX_START_S) {
      fade = mix(0.35, 1, time / MIX_START_S);
    }

    // La couche chaude se déplace deux fois plus que la froide : c'est la
    // pondération par les masses, rendue par la vitesse de variation.
    const coldNowC = mix(coldStartC, equilibriumC, mixing);
    const hotNowC = mix(hotStartC, equilibriumC, mixing);
    // La frontière passe d'une marche franche à un dégradé sur toute la hauteur.
    const blendWidth = mix(0.04, 1.6, mixing);

    const colorAttribute = WATER_GEOMETRY.getAttribute(
      "color",
    ) as BufferAttribute;
    const positionAttribute = WATER_GEOMETRY.getAttribute(
      "position",
    ) as BufferAttribute;
    for (let index = 0; index < colorAttribute.count; index += 1) {
      const height = positionAttribute.getY(index) / WATER_HEIGHT + 0.5;
      const edge = clamp01(
        (height - (boundaryRatio - blendWidth / 2)) / blendWidth,
      );
      const share = edge * edge * (3 - 2 * edge);
      writeTemperatureColor(WORK_COLOR, mix(coldNowC, hotNowC, share));
      colorAttribute.setXYZ(index, WORK_COLOR.r, WORK_COLOR.g, WORK_COLOR.b);
    }
    colorAttribute.needsUpdate = true;
    WATER_MATERIAL.opacity = WATER_OPACITY * fade;
    writeTemperatureColor(WATER_MATERIAL.emissive, mix(coldNowC, hotNowC, 0.5));
    WATER_MATERIAL.emissiveIntensity = 0.16 * fade;

    // --- Colonne du thermomètre : le bulbe est dans la couche froide. ---
    const columnLength =
      COLUMN_BASE_LENGTH + clamp01(coldNowC / RAMP_MAX_C) * COLUMN_SPAN_LENGTH;
    if (columnMesh.current) {
      columnMesh.current.scale.y = columnLength;
      columnMesh.current.position.y = BULB_POSITION[1] + columnLength / 2;
    }

    // --- Particules : le trafic thermique s'éteint quand l'équilibre est atteint. ---
    const traffic = (1 - mixing) * fade;
    const flow = state.clock.elapsedTime;
    if (hotParticles.current) {
      for (let index = 0; index < HOT_PARTICLE_COUNT; index += 1) {
        const seed = PARTICLE_SEEDS[index];
        const phase = (flow * seed.speed + seed.offset) % 1;
        // Les orange naissent dans le chaud et descendent vers le froid.
        WORK_OBJECT.position.set(
          seed.x,
          mix(WATER_TOP_Y - 0.05, WATER_BOTTOM_Y + 0.05, phase),
          seed.z,
        );
        WORK_OBJECT.scale.setScalar(
          Math.max(0.018 * traffic * Math.sin(phase * Math.PI), 0.0001),
        );
        WORK_OBJECT.updateMatrix();
        hotParticles.current.setMatrixAt(index, WORK_OBJECT.matrix);
      }
      hotParticles.current.instanceMatrix.needsUpdate = true;
    }
    if (coldParticles.current) {
      for (let index = 0; index < COLD_PARTICLE_COUNT; index += 1) {
        const seed = PARTICLE_SEEDS[HOT_PARTICLE_COUNT + index];
        const phase = (flow * seed.speed + seed.offset) % 1;
        // Les bleues montent depuis le bas et s'éteignent dans le haut.
        WORK_OBJECT.position.set(
          seed.x,
          mix(WATER_BOTTOM_Y + 0.05, WATER_TOP_Y - 0.05, phase),
          seed.z,
        );
        WORK_OBJECT.scale.setScalar(
          Math.max(0.018 * traffic * Math.sin(phase * Math.PI), 0.0001),
        );
        WORK_OBJECT.updateMatrix();
        coldParticles.current.setMatrixAt(index, WORK_OBJECT.matrix);
      }
      coldParticles.current.instanceMatrix.needsUpdate = true;
    }

    // --- Flux : ils s'effacent en même temps que les particules. ---
    if (fluxGroup.current) {
      const presence = Math.max(traffic, 0.0001);
      fluxGroup.current.scale.setScalar(presence);
      fluxGroup.current.visible = presence > 0.03;
    }
  });

  return (
    <group>
      {/* Socle du calorimètre. */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.66, 0.7, 0.06, 48]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.8}
        />
      </mesh>

      {/* Isolant extérieur et paroi interne, ouverts d'un quart face caméra. */}
      <mesh position={[0, 0.6, 0]} material={INSULATION_MATERIAL}>
        <cylinderGeometry
          args={[0.62, 0.62, 1.2, 48, 1, true, CUT_START, CUT_LENGTH]}
        />
      </mesh>
      <mesh position={[0, 0.6, 0]} material={SHELL_MATERIAL}>
        <cylinderGeometry
          args={[0.55, 0.55, 1.2, 48, 1, true, CUT_START, CUT_LENGTH]}
        />
      </mesh>
      <mesh position={[0, 0.07, 0]} material={INSULATION_MATERIAL}>
        <cylinderGeometry args={[0.62, 0.62, 0.06, 48]} />
      </mesh>

      {/* Couvercle : l'enceinte est refermée, aucune énergie ne s'en échappe. */}
      <mesh position={[0, 1.23, 0]}>
        <cylinderGeometry args={[0.64, 0.64, 0.06, 48]} />
        <meshStandardMaterial color={DIAGRAM_COLORS.object} roughness={0.9} />
      </mesh>

      {/* Liquide : un seul volume, dont le dégradé porte les deux températures. */}
      <mesh
        position={[0, WATER_CENTER_Y, 0]}
        geometry={WATER_GEOMETRY}
        material={WATER_MATERIAL}
      />

      {/* Particules : elles disparaissent quand plus rien ne circule. */}
      <instancedMesh
        ref={hotParticles}
        args={[undefined, undefined, HOT_PARTICLE_COUNT]}
        material={HOT_PARTICLE_MATERIAL}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 8]} />
      </instancedMesh>
      <instancedMesh
        ref={coldParticles}
        args={[undefined, undefined, COLD_PARTICLE_COUNT]}
        material={COLD_PARTICLE_MATERIAL}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 8]} />
      </instancedMesh>

      {/* Flux de chaleur : un seul sens, du chaud vers le froid. */}
      <group ref={fluxGroup}>
        {FLUX.map((arrow) => (
          <VectorArrow
            key={`${arrow.origin[0]}-${arrow.origin[2]}`}
            origin={arrow.origin}
            direction={arrow.direction}
            length={0.42}
            color={DIAGRAM_COLORS.hot}
            thickness={0.022}
            opacity={0.9}
          />
        ))}
      </group>

      {/* Échelle neutre, sans chiffre : elle sert seulement de fond de lecture. */}
      <group position={[0.14, 1.42, -0.14]} rotation={[0, CAMERA_AZIMUTH, 0]}>
        <mesh>
          <planeGeometry args={[0.2, 0.42]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.structure}
            roughness={0.9}
            side={DoubleSide}
            transparent
            opacity={0.85}
          />
        </mesh>
        {SCALE_TICKS.map((offset) => (
          <mesh key={offset} position={[-0.05, offset, 0.004]}>
            <boxGeometry args={[0.08, 0.006, 0.002]} />
            <meshStandardMaterial
              color={DIAGRAM_COLORS.guide}
              roughness={0.9}
            />
          </mesh>
        ))}
      </group>

      {/* Thermomètre : tige, bulbe dans la couche froide, colonne à l'échelle. */}
      <mesh
        position={[BULB_POSITION[0], 1, BULB_POSITION[2]]}
        material={SHELL_MATERIAL}
      >
        <cylinderGeometry args={[0.035, 0.035, 1.3, 16, 1, true]} />
      </mesh>
      <mesh position={BULB_POSITION}>
        <sphereGeometry args={[0.055, 16, 16]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.hot}
          emissive={DIAGRAM_COLORS.hot}
          emissiveIntensity={0.5}
          toneMapped={false}
        />
      </mesh>
      <mesh
        ref={columnMesh}
        position={[BULB_POSITION[0], 0.9, BULB_POSITION[2]]}
      >
        <cylinderGeometry args={[0.018, 0.018, 1, 12]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.hot}
          emissive={DIAGRAM_COLORS.hot}
          emissiveIntensity={0.55}
          toneMapped={false}
        />
      </mesh>

      {/* Étiquettes : uniquement les données de l'énoncé. */}
      <DiagramLabel position={[1.28, 1, 0.25]} tone="danger">
        {formatDecimal(hotMass, 1)} kg à {Math.round(hotStartC)} °C
      </DiagramLabel>
      <DiagramLabel position={[-1.28, 0.45, 0.25]} tone="info">
        {formatDecimal(coldMass, 1)} kg à {Math.round(coldStartC)} °C
      </DiagramLabel>
      <DiagramLabel position={[-1.28, 1.28, 0]}>calorimètre isolé</DiagramLabel>
      <DiagramLabel position={[1.28, 0.5, 0.25]}>
        c = {formatInteger(heatCapacity)} J/(kg·K)
      </DiagramLabel>
      <DiagramLabel position={[0.34, 1.76, 0]} tone="accent">
        T_f = ?
      </DiagramLabel>
    </group>
  );
}
