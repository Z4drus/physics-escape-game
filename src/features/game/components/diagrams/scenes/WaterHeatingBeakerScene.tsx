"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import {
  BufferAttribute,
  Color,
  CylinderGeometry,
  DoubleSide,
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
const CYCLE_S = 5;
/** Fin de la pose initiale, qui absorbe aussi le fondu d'entrée. */
const HEAT_START_S = 0.3;
/** Fin de la montée en température. */
const HEAT_END_S = 4.2;
/** Fin du maintien à la température finale, début du fondu de retour. */
const HOLD_END_S = 4.65;

/** Géométrie du bécher : c'est l'objet de référence, il fait 1 unité de haut. */
const WATER_RADIUS = 0.34;
const WATER_HEIGHT = 0.62;
const WATER_BASE_Y = 0.17;
const WATER_CENTER_Y = WATER_BASE_Y + WATER_HEIGHT / 2;
const WATER_OPACITY = 0.88;

/** Ancrage du thermomètre : bulbe dans l'eau, tige au-dessus du bécher. */
const BULB_POSITION: Vec3 = [0.2, 0.2, 0.1];
/** Longueur de la colonne à 0 °C, puis allongement pour 100 °C. */
const COLUMN_BASE_LENGTH = 0.06;
const COLUMN_SPAN_LENGTH = 1.06;

const BUBBLE_COUNT = 14;
const SPARK_PER_ARROW = 3;
const FLUX_LENGTH = 0.3;
/** Origines des trois flux de chaleur, juste au-dessus du fond du bécher. */
const FLUX_ORIGINS: readonly Vec3[] = [
  [-0.22, 0.19, 0],
  [0.22, 0.19, 0],
  [0, 0.19, 0.22],
];
const FLUX_DIRECTION: Vec3 = [0, 1, 0];

/** Rayons des trois spires de la résistance chauffante. */
const COIL_RADII = [0.2, 0.35, 0.5] as const;

/** Construit le cylindre d'eau et lui ajoute son attribut de couleur. */
function createWaterGeometry(): CylinderGeometry {
  const geometry = new CylinderGeometry(
    WATER_RADIUS,
    WATER_RADIUS,
    WATER_HEIGHT,
    32,
    12,
  );
  const vertexCount = geometry.attributes.position.count;
  geometry.setAttribute(
    "color",
    new BufferAttribute(new Float32Array(vertexCount * 3), 3),
  );
  return geometry;
}

/**
 * Géométrie de l'eau dotée d'un attribut de couleur par sommet : c'est lui qui
 * rend visible le gradient chaud-en-bas / froid-en-haut.
 */
const WATER_GEOMETRY = createWaterGeometry();

const WATER_MATERIAL = new MeshStandardMaterial({
  vertexColors: true,
  transparent: true,
  opacity: WATER_OPACITY,
  roughness: 0.12,
  metalness: 0.05,
  emissive: new Color(DIAGRAM_COLORS.cold),
  emissiveIntensity: 0.18,
});

/** Verre du bécher : très peu opaque pour laisser voir l'eau et les flux. */
const GLASS_MATERIAL = new MeshStandardMaterial({
  color: new Color(DIAGRAM_COLORS.metal),
  transparent: true,
  opacity: 0.18,
  roughness: 0.06,
  metalness: 0.2,
  side: DoubleSide,
  depthWrite: false,
});

const COIL_MATERIAL = new MeshStandardMaterial({
  color: new Color(DIAGRAM_COLORS.hot),
  emissive: new Color(DIAGRAM_COLORS.hot),
  emissiveIntensity: 0.6,
  roughness: 0.4,
  toneMapped: false,
});

const BUBBLE_MATERIAL = new MeshStandardMaterial({
  color: new Color(DIAGRAM_COLORS.support),
  emissive: new Color(DIAGRAM_COLORS.support),
  emissiveIntensity: 0.5,
  transparent: true,
  opacity: 0.7,
  toneMapped: false,
});

const SPARK_MATERIAL = new MeshStandardMaterial({
  color: new Color(DIAGRAM_COLORS.hot),
  emissive: new Color(DIAGRAM_COLORS.hot),
  emissiveIntensity: 1.1,
  toneMapped: false,
});

/** Répartition fixe des bulles dans le volume d'eau. */
const BUBBLE_SEEDS = Array.from({ length: BUBBLE_COUNT }, (_, index) => {
  const angle = index * 2.399963;
  const radius = 0.06 + ((index * 7) % 11) * 0.024;
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    size: 0.015 + ((index * 5) % 7) * 0.0025,
    wobble: 0.6 + ((index * 3) % 5) * 0.22,
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

/** Courbe en S : démarrage et arrivée adoucis, utile pour une chauffe. */
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
 * Schéma `water-heating-beaker` : un bécher d'eau posé sur une plaque
 * chauffante. L'eau parcourt en boucle la rampe thermique de l'énoncé, le
 * gradient vertical rappelle qu'elle chauffe par le bas, et la colonne du
 * thermomètre suit la température affichée par l'étiquette vivante.
 *
 * Le schéma n'expose que les grandeurs de l'énoncé (masse, capacité thermique,
 * températures) : l'énergie demandée par la question n'y figure jamais.
 */
export function WaterHeatingBeakerScene({ params }: DiagramSceneProps) {
  const mass = Number(params.masseEauKg ?? 0.5);
  const initialC = Number(params.temperatureInitialeC ?? 20);
  const finalC = Number(params.temperatureFinaleC ?? 80);
  const heatCapacity = Number(params.capaciteThermiqueJParKgK ?? 4180);

  const columnMesh = useRef<Mesh>(null);
  const bubbleMesh = useRef<InstancedMesh>(null);
  const sparkMesh = useRef<InstancedMesh>(null);
  const temperatureLabel = useRef<HTMLSpanElement>(null);
  const deltaLabel = useRef<HTMLSpanElement>(null);
  /** Phase accumulée des bulles : l'accumulation évite tout saut de cadence. */
  const bubbleFlow = useRef(0);
  /** Dernière valeur écrite dans l'étiquette, pour ne toucher le DOM qu'utile. */
  const lastPrintedC = useRef(Number.NaN);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime % CYCLE_S;

    // Progression de la chauffe : 0 = état initial, 1 = température finale.
    let heat: number;
    if (time < HEAT_START_S) {
      heat = 0;
    } else if (time < HEAT_END_S) {
      heat = smoothStep((time - HEAT_START_S) / (HEAT_END_S - HEAT_START_S));
    } else if (time < HOLD_END_S) {
      heat = 1;
    } else {
      // Fondu de retour : la température redescend en même temps que l'opacité,
      // ce qui supprime toute coupure sèche au bouclage.
      heat = 1 - smoothStep((time - HOLD_END_S) / (CYCLE_S - HOLD_END_S));
    }

    // Opacité des éléments animés pendant le fondu de bouclage.
    let fade = 1;
    if (time > HOLD_END_S) {
      fade = mix(1, 0.35, (time - HOLD_END_S) / (CYCLE_S - HOLD_END_S));
    } else if (time < HEAT_START_S) {
      fade = mix(0.35, 1, time / HEAT_START_S);
    }

    const celsius = mix(initialC, finalC, heat);
    // L'écart haut/bas se resserre : l'eau chauffe par le fond puis s'homogénéise.
    const verticalSpread = mix(12, 2, heat);

    // --- Eau : couleur par sommet, plus chaude en bas qu'en haut. ---
    const colorAttribute = WATER_GEOMETRY.getAttribute(
      "color",
    ) as BufferAttribute;
    const positionAttribute = WATER_GEOMETRY.getAttribute(
      "position",
    ) as BufferAttribute;
    for (let index = 0; index < colorAttribute.count; index += 1) {
      const depth = 0.5 - positionAttribute.getY(index) / WATER_HEIGHT;
      writeTemperatureColor(
        WORK_COLOR,
        celsius + verticalSpread * (depth - 0.5),
      );
      colorAttribute.setXYZ(index, WORK_COLOR.r, WORK_COLOR.g, WORK_COLOR.b);
    }
    colorAttribute.needsUpdate = true;
    WATER_MATERIAL.opacity = WATER_OPACITY * fade;
    writeTemperatureColor(WATER_MATERIAL.emissive, celsius);
    WATER_MATERIAL.emissiveIntensity = 0.18 * fade;

    // --- Résistance : pulsation lente de 1,2 s, puissance constante. ---
    COIL_MATERIAL.emissiveIntensity =
      0.6 + 0.45 * Math.sin((state.clock.elapsedTime * Math.PI * 2) / 1.2);

    // --- Colonne du thermomètre : ancrée au bulbe, elle grandit vers le haut. ---
    const columnLength =
      COLUMN_BASE_LENGTH + clamp01(celsius / RAMP_MAX_C) * COLUMN_SPAN_LENGTH;
    if (columnMesh.current) {
      columnMesh.current.scale.y = columnLength;
      columnMesh.current.position.y = BULB_POSITION[1] + columnLength / 2;
    }

    // --- Bulles : cadence et densité croissantes avec la température. ---
    const bubbleSpeed = mix(0.35, 1.7, heat);
    bubbleFlow.current = (bubbleFlow.current + delta * bubbleSpeed) % 1;
    const bubbleDensity = mix(0.25, 1, heat);
    if (bubbleMesh.current) {
      for (let index = 0; index < BUBBLE_COUNT; index += 1) {
        const seed = BUBBLE_SEEDS[index];
        const phase = (bubbleFlow.current + index / BUBBLE_COUNT) % 1;
        const wobble =
          Math.sin(phase * Math.PI * 4 + index) * 0.012 * seed.wobble;
        WORK_OBJECT.position.set(
          seed.x + wobble,
          WATER_BASE_Y + 0.02 + phase * (WATER_HEIGHT - 0.06),
          seed.z,
        );
        // Les bulles éclatent en surface, et seules les premières vivent à froid.
        const burst = phase < 0.86 ? 1 : 1 - (phase - 0.86) / 0.14;
        const alive = index / BUBBLE_COUNT < bubbleDensity ? 1 : 0;
        const scale = seed.size * burst * alive * fade * (0.6 + phase * 0.8);
        WORK_OBJECT.scale.setScalar(Math.max(scale, 0.0001));
        WORK_OBJECT.updateMatrix();
        bubbleMesh.current.setMatrixAt(index, WORK_OBJECT.matrix);
      }
      bubbleMesh.current.instanceMatrix.needsUpdate = true;
    }

    // --- Énergie entrante : cadence strictement constante le long des flux. ---
    if (sparkMesh.current) {
      const sparkPhase = (state.clock.elapsedTime / 0.9) % 1;
      for (let arrow = 0; arrow < FLUX_ORIGINS.length; arrow += 1) {
        const origin = FLUX_ORIGINS[arrow];
        for (let step = 0; step < SPARK_PER_ARROW; step += 1) {
          const phase = (sparkPhase + step / SPARK_PER_ARROW) % 1;
          WORK_OBJECT.position.set(
            origin[0],
            origin[1] + phase * FLUX_LENGTH,
            origin[2],
          );
          WORK_OBJECT.scale.setScalar(0.03 * (1 - phase * 0.5));
          WORK_OBJECT.updateMatrix();
          sparkMesh.current.setMatrixAt(
            arrow * SPARK_PER_ARROW + step,
            WORK_OBJECT.matrix,
          );
        }
      }
      sparkMesh.current.instanceMatrix.needsUpdate = true;
    }

    // --- Étiquettes vivantes : le DOM n'est touché qu'au changement de valeur. ---
    const rounded = Math.round(celsius);
    if (temperatureLabel.current && rounded !== lastPrintedC.current) {
      temperatureLabel.current.textContent = `θ = ${rounded} °C`;
      lastPrintedC.current = rounded;
    }
    if (deltaLabel.current) {
      // L'écart n'est rappelé qu'une fois l'eau chaude : c'est la leçon du schéma.
      deltaLabel.current.style.opacity = String(
        clamp01((time - HEAT_END_S) / 0.3) * (time < HOLD_END_S + 0.2 ? 1 : 0),
      );
    }
  });

  return (
    <group>
      {/* Paillasse : elle pose la scène sans jamais sortir du cadre. */}
      <mesh position={[0, -0.025, 0]}>
        <boxGeometry args={[2.4, 0.05, 1.6]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.85}
        />
      </mesh>

      {/* Plaque chauffante et sa résistance en spirale. */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[1.4, 0.16, 1.4]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>
      {COIL_RADII.map((radius) => (
        <mesh
          key={radius}
          position={[0, 0.17, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={COIL_MATERIAL}
        >
          <torusGeometry args={[radius, 0.014, 8, 40]} />
        </mesh>
      ))}

      {/* Bécher : paroi ouverte et fond, en verre très peu opaque. */}
      <mesh position={[0, 0.66, 0]} material={GLASS_MATERIAL}>
        <cylinderGeometry args={[0.36, 0.36, 1, 40, 1, true]} />
      </mesh>
      <mesh position={[0, 0.17, 0]} material={GLASS_MATERIAL}>
        <cylinderGeometry args={[0.36, 0.36, 0.02, 40]} />
      </mesh>

      {/* Eau : le volume dont la couleur encode la température. */}
      <mesh
        position={[0, WATER_CENTER_Y, 0]}
        geometry={WATER_GEOMETRY}
        material={WATER_MATERIAL}
      />

      {/* Bulles d'ébullition naissante. */}
      <instancedMesh
        ref={bubbleMesh}
        args={[undefined, undefined, BUBBLE_COUNT]}
        material={BUBBLE_MATERIAL}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 8]} />
      </instancedMesh>

      {/* Thermomètre : tige de verre, bulbe et colonne mise à l'échelle. */}
      <mesh
        position={[BULB_POSITION[0], 0.8, BULB_POSITION[2]]}
        material={GLASS_MATERIAL}
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
        position={[BULB_POSITION[0], 0.3, BULB_POSITION[2]]}
      >
        <cylinderGeometry args={[0.018, 0.018, 1, 12]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.hot}
          emissive={DIAGRAM_COLORS.hot}
          emissiveIntensity={0.55}
          toneMapped={false}
        />
      </mesh>

      {/* Flux de chaleur : la plaque fournit une puissance constante. */}
      {FLUX_ORIGINS.map((origin) => (
        <VectorArrow
          key={`${origin[0]}-${origin[2]}`}
          origin={origin}
          direction={FLUX_DIRECTION}
          length={FLUX_LENGTH}
          color={DIAGRAM_COLORS.hot}
          thickness={0.022}
          opacity={0.85}
        />
      ))}
      <instancedMesh
        ref={sparkMesh}
        args={[undefined, undefined, FLUX_ORIGINS.length * SPARK_PER_ARROW]}
        material={SPARK_MATERIAL}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 8]} />
      </instancedMesh>

      {/* Étiquettes : uniquement les données de l'énoncé. */}
      <DiagramLabel position={[-1.05, 0.78, 0]}>
        m = {formatDecimal(mass, 2)} kg d&apos;eau
      </DiagramLabel>
      <DiagramLabel position={[-1.05, 0.44, 0]}>
        c = {formatInteger(heatCapacity)} J/(kg·K)
      </DiagramLabel>
      <DiagramLabel position={[0.95, 0.22, 0.1]} tone="warning">
        <span ref={temperatureLabel}>θ = {Math.round(initialC)} °C</span>
      </DiagramLabel>
      <DiagramLabel position={[0, 0.06, 0.95]}>plaque chauffante</DiagramLabel>
      <DiagramLabel position={[0.62, 1.55, 0.1]} tone="accent">
        <span ref={deltaLabel} style={{ opacity: 0 }}>
          ΔT = {Math.round(finalC)} − {Math.round(initialC)} ={" "}
          {Math.round(finalC - initialC)} K
        </span>
      </DiagramLabel>
    </group>
  );
}
