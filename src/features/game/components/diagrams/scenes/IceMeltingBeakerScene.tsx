"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import {
  Color,
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
/*  Matériaux et objets de travail vivent ici : ils sont créés une seule fois  */
/*  et `useFrame` n'a plus qu'à écrire dedans — aucune allocation n'a donc     */
/*  lieu pendant l'animation.                                                  */
/* -------------------------------------------------------------------------- */

/** Bornes de la rampe thermique commune aux trois schémas du thème chaleur. */
const RAMP_MIN_C = 0;
const RAMP_MAX_C = 100;

const COLD_COLOR = new Color(DIAGRAM_COLORS.cold);
const HOT_COLOR = new Color(DIAGRAM_COLORS.hot);
/** Objet de travail servant à composer les matrices des maillages instanciés. */
const WORK_OBJECT = new Object3D();

/** Durée d'un cycle complet, en secondes. */
const CYCLE_S = 6;
/** Fin de la pose initiale, qui absorbe aussi le fondu d'entrée. */
const POSE_END_S = 0.4;
/** Fin de la fusion : 3,60 s, soit exactement 4/5 du tracé. */
const MELT_END_S = 4;
/** Fin du réchauffement : 0,90 s, soit le 1/5 restant. */
const WARM_END_S = 4.9;
/** Fin du maintien, début du fondu de retour. */
const HOLD_END_S = 5.65;

/** Décalage de la casserole vers la droite, pour loger le panneau à gauche. */
const POT_X = 0.45;
const POT_RADIUS = 0.4;
const WATER_RADIUS = 0.38;
const WATER_BASE_Y = 0.17;
/** Niveau d'eau avant puis après la fonte des glaçons. */
const WATER_MIN_HEIGHT = 0.1;
const WATER_MAX_HEIGHT = 0.34;
const WATER_OPACITY = 0.9;

const ICE_COUNT = 4;
const ICE_EDGE = 0.2;
const ICE_OPACITY = 0.75;
const SPARKLE_COUNT = 16;

/** Ancrage du thermomètre : le bulbe plonge dans le mélange eau-glace. */
const BULB_POSITION: Vec3 = [POT_X + 0.26, 0.2, 0.12];
/**
 * Échelle propre à ce thermomètre : l'énoncé ne couvre que 0 → 20 °C, on dilate
 * donc la course de la colonne pour que l'immobilité du palier soit lisible.
 */
const COLUMN_BASE_LENGTH = 0.12;
const COLUMN_SPAN_LENGTH = 0.6;

const FLUX_LENGTH = 0.22;
const SPARK_PER_ARROW = 3;
/** Origines des trois flux, sur la plaque, juste sous le fond de la casserole. */
const FLUX_ORIGINS: readonly Vec3[] = [
  [POT_X - 0.2, 0.14, 0],
  [POT_X + 0.2, 0.14, 0],
  [POT_X, 0.14, 0.2],
];
const FLUX_DIRECTION: Vec3 = [0, 1, 0];

/** Panneau graphique : position et orientation face à la caméra du viewer. */
const PANEL_POSITION: Vec3 = [-0.85, 0.72, -0.1];
const PANEL_ROTATION_Y = 0.55;
/** Repères du tracé, en coordonnées locales du panneau. */
const PLOT_LEFT = -0.48;
const PLOT_ZERO_Y = -0.28;
const PLOT_FINAL_Y = 0.1;
/** Le palier occupe 4/5 de la largeur utile, la rampe le 1/5 restant. */
const PLATEAU_WIDTH = 0.8;
const RAMP_RUN = 0.2;
const RAMP_RISE = PLOT_FINAL_Y - PLOT_ZERO_Y;
const RAMP_LENGTH = Math.hypot(RAMP_RUN, RAMP_RISE);
const RAMP_ANGLE = Math.atan2(RAMP_RISE, RAMP_RUN);
const RAMP_START_X = PLOT_LEFT + PLATEAU_WIDTH;

/** Verre / métal de la casserole : assez transparent pour voir les glaçons. */
const POT_MATERIAL = new MeshStandardMaterial({
  color: new Color(DIAGRAM_COLORS.metal),
  transparent: true,
  opacity: 0.22,
  roughness: 0.08,
  metalness: 0.35,
  side: DoubleSide,
  depthWrite: false,
});

const ICE_MATERIAL = new MeshStandardMaterial({
  color: new Color(DIAGRAM_COLORS.support),
  emissive: new Color(DIAGRAM_COLORS.support),
  emissiveIntensity: 0.2,
  transparent: true,
  opacity: ICE_OPACITY,
  roughness: 0.15,
  metalness: 0.1,
});

const SPARKLE_MATERIAL = new MeshStandardMaterial({
  color: new Color(DIAGRAM_COLORS.support),
  emissive: new Color(DIAGRAM_COLORS.support),
  emissiveIntensity: 1.2,
  transparent: true,
  opacity: 0.8,
  toneMapped: false,
});

const SPARK_MATERIAL = new MeshStandardMaterial({
  color: new Color(DIAGRAM_COLORS.hot),
  emissive: new Color(DIAGRAM_COLORS.hot),
  emissiveIntensity: 1.1,
  toneMapped: false,
});

const CURVE_MATERIAL = new MeshStandardMaterial({
  color: new Color(DIAGRAM_COLORS.hot),
  emissive: new Color(DIAGRAM_COLORS.hot),
  emissiveIntensity: 0.9,
  toneMapped: false,
});

/** Disposition et orientation des glaçons : ils ne doivent pas sembler alignés. */
const ICE_SEEDS = Array.from({ length: ICE_COUNT }, (_, index) => {
  const angle = index * 2.399963;
  const radius = 0.1 + (index % 2) * 0.06;
  return {
    x: POT_X + Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    tilt: (index * 0.7) % 1.2,
    spin: (index * 1.3) % 1.6,
    bob: index * 1.7,
  };
});

/** Points d'apparition des micro-particules qui se détachent des glaçons. */
const SPARKLE_SEEDS = Array.from({ length: SPARKLE_COUNT }, (_, index) => {
  const angle = index * 2.399963;
  const radius = 0.06 + ((index * 5) % 9) * 0.018;
  return {
    x: POT_X + Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
    offset: ((index * 7) % 16) / 16,
    speed: 0.6 + ((index * 3) % 5) * 0.16,
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

/**
 * Écrit dans `target` la couleur d'un volume d'eau à la température donnée.
 * La rampe va de 0 °C (`cold`) à 100 °C (`hot`), identique dans les trois
 * schémas du thème pour que le joueur puisse comparer d'une question à l'autre.
 */
function writeTemperatureColor(target: Color, celsius: number): void {
  const ratio = clamp01((celsius - RAMP_MIN_C) / (RAMP_MAX_C - RAMP_MIN_C));
  target.lerpColors(COLD_COLOR, HOT_COLOR, ratio);
}

/** Formate un entier avec des espaces fines insécables comme séparateurs. */
function formatInteger(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/* -------------------------------------------------------------------------- */
/*  Scène                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Schéma `ice-melting-beaker` : des glaçons fondent dans une casserole chauffée
 * à puissance constante. Le palier de fusion occupe 4/5 du tracé — la glace
 * disparaît, le niveau d'eau monte, mais ni la couleur du liquide ni la colonne
 * du thermomètre ne bougent — puis le 1/5 restant fait enfin monter la
 * température. Le halo et les micro-particules montrent que de l'énergie est
 * bel et bien consommée pendant que le thermomètre reste immobile.
 *
 * Le panneau graphique donne la forme de la courbe θ(énergie fournie) sans
 * aucune valeur d'énergie chiffrée : le schéma expose les données de l'énoncé
 * (masse, L_f, c, températures), jamais le bilan demandé par la question.
 */
export function IceMeltingBeakerScene({ params }: DiagramSceneProps) {
  const iceMass = Number(params.masseGlaceKg ?? 0.2);
  const initialC = Number(params.temperatureInitialeC ?? 0);
  const finalC = Number(params.temperatureFinaleC ?? 20);
  const latentHeat = Number(params.chaleurLatenteFusionJParKg ?? 334000);
  const heatCapacity = Number(params.capaciteThermiqueJParKgK ?? 4180);

  const waterMesh = useRef<Mesh>(null);
  const waterMaterial = useRef<MeshStandardMaterial>(null);
  const iceMesh = useRef<InstancedMesh>(null);
  const sparkleMesh = useRef<InstancedMesh>(null);
  const sparkMesh = useRef<InstancedMesh>(null);
  const columnMesh = useRef<Mesh>(null);
  const plateauMesh = useRef<Mesh>(null);
  const rampMesh = useRef<Mesh>(null);
  const temperatureLabel = useRef<HTMLSpanElement>(null);
  const iceLabel = useRef<HTMLSpanElement>(null);
  /** Dernière valeur écrite dans l'étiquette, pour ne toucher le DOM qu'utile. */
  const lastPrintedC = useRef(Number.NaN);

  useFrame((state) => {
    const time = state.clock.elapsedTime % CYCLE_S;

    // Deux progressions distinctes : d'abord la fusion, ensuite le réchauffement.
    let melt: number;
    let warm: number;
    if (time < POSE_END_S) {
      melt = 0;
      warm = 0;
    } else if (time < MELT_END_S) {
      // Puissance constante : la fonte avance linéairement, sans accélération.
      melt = (time - POSE_END_S) / (MELT_END_S - POSE_END_S);
      warm = 0;
    } else if (time < WARM_END_S) {
      melt = 1;
      warm = (time - MELT_END_S) / (WARM_END_S - MELT_END_S);
    } else if (time < HOLD_END_S) {
      melt = 1;
      warm = 1;
    } else {
      // Fondu de retour : l'état revient au départ pendant que l'opacité baisse.
      const back = 1 - (time - HOLD_END_S) / (CYCLE_S - HOLD_END_S);
      melt = back;
      warm = back;
    }

    let fade = 1;
    if (time > HOLD_END_S) {
      fade = mix(1, 0.35, (time - HOLD_END_S) / (CYCLE_S - HOLD_END_S));
    } else if (time < POSE_END_S) {
      fade = mix(0.35, 1, time / POSE_END_S);
    }

    // La température reste bloquée sur l'initiale pendant toute la fusion.
    const celsius = mix(initialC, finalC, warm);
    const waterHeight = mix(WATER_MIN_HEIGHT, WATER_MAX_HEIGHT, melt);
    const waterSurfaceY = WATER_BASE_Y + waterHeight;

    // --- Eau : le niveau monte pendant la fusion, la teinte ne change qu'après. ---
    if (waterMesh.current) {
      waterMesh.current.scale.y = waterHeight;
      waterMesh.current.position.y = WATER_BASE_Y + waterHeight / 2;
    }
    if (waterMaterial.current) {
      writeTemperatureColor(waterMaterial.current.color, celsius);
      writeTemperatureColor(waterMaterial.current.emissive, celsius);
      waterMaterial.current.emissiveIntensity = 0.2 * fade;
      waterMaterial.current.opacity = WATER_OPACITY * fade;
    }

    // --- Glaçons : ils rétrécissent régulièrement et s'enfoncent. ---
    const edge = ICE_EDGE * (1 - melt);
    const melting = melt > 0 && melt < 1;
    ICE_MATERIAL.opacity = ICE_OPACITY * fade;
    // Halo pulsant : de l'énergie est consommée alors que le thermomètre dort.
    ICE_MATERIAL.emissiveIntensity = melting
      ? 0.2 + 0.35 * (0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 5))
      : 0.2;
    if (iceMesh.current) {
      for (let index = 0; index < ICE_COUNT; index += 1) {
        const seed = ICE_SEEDS[index];
        const bob = Math.sin(state.clock.elapsedTime * 1.4 + seed.bob) * 0.012;
        // Un gros glaçon dans peu d'eau repose sur le fond : il ne flotte
        // vraiment qu'une fois assez petit pour que le niveau le porte.
        const restingY = WATER_BASE_Y + edge * 0.7;
        const floatingY = waterSurfaceY - edge * 0.28;
        WORK_OBJECT.position.set(
          seed.x,
          Math.max(floatingY, restingY) + bob,
          seed.z,
        );
        WORK_OBJECT.rotation.set(seed.tilt, seed.spin, seed.tilt * 0.5);
        WORK_OBJECT.scale.setScalar(Math.max(edge, 0.0001));
        WORK_OBJECT.updateMatrix();
        iceMesh.current.setMatrixAt(index, WORK_OBJECT.matrix);
      }
      iceMesh.current.instanceMatrix.needsUpdate = true;
    }

    // --- Micro-particules : visibles uniquement pendant la fusion. ---
    const sparkleLife = melting ? fade : 0;
    if (sparkleMesh.current) {
      for (let index = 0; index < SPARKLE_COUNT; index += 1) {
        const seed = SPARKLE_SEEDS[index];
        const phase = (state.clock.elapsedTime * seed.speed + seed.offset) % 1;
        WORK_OBJECT.position.set(
          seed.x,
          waterSurfaceY - 0.04 + phase * 0.16,
          seed.z,
        );
        WORK_OBJECT.rotation.set(0, 0, 0);
        WORK_OBJECT.scale.setScalar(
          Math.max(0.012 * sparkleLife * Math.sin(phase * Math.PI), 0.0001),
        );
        WORK_OBJECT.updateMatrix();
        sparkleMesh.current.setMatrixAt(index, WORK_OBJECT.matrix);
      }
      sparkleMesh.current.instanceMatrix.needsUpdate = true;
    }

    // --- Colonne du thermomètre : immobile tant que la glace fond. ---
    const columnLength =
      COLUMN_BASE_LENGTH +
      clamp01((celsius - initialC) / Math.max(finalC - initialC, 1)) *
        COLUMN_SPAN_LENGTH;
    if (columnMesh.current) {
      columnMesh.current.scale.y = columnLength;
      columnMesh.current.position.y = BULB_POSITION[1] + columnLength / 2;
    }

    // --- Flux : cadence strictement constante, phase de fusion comprise. ---
    if (sparkMesh.current) {
      const sparkPhase = (state.clock.elapsedTime / 0.8) % 1;
      for (let arrow = 0; arrow < FLUX_ORIGINS.length; arrow += 1) {
        const origin = FLUX_ORIGINS[arrow];
        for (let step = 0; step < SPARK_PER_ARROW; step += 1) {
          const phase = (sparkPhase + step / SPARK_PER_ARROW) % 1;
          WORK_OBJECT.position.set(
            origin[0],
            origin[1] + phase * FLUX_LENGTH,
            origin[2],
          );
          WORK_OBJECT.rotation.set(0, 0, 0);
          WORK_OBJECT.scale.setScalar(0.026 * (1 - phase * 0.4));
          WORK_OBJECT.updateMatrix();
          sparkMesh.current.setMatrixAt(
            arrow * SPARK_PER_ARROW + step,
            WORK_OBJECT.matrix,
          );
        }
      }
      sparkMesh.current.instanceMatrix.needsUpdate = true;
    }

    // --- Courbe θ(énergie) : le palier puis la rampe, tracés en direct. ---
    if (plateauMesh.current) {
      const length = Math.max(PLATEAU_WIDTH * melt, 0.0001);
      plateauMesh.current.scale.x = length;
      plateauMesh.current.position.x = PLOT_LEFT + length / 2;
    }
    if (rampMesh.current) {
      const length = Math.max(RAMP_LENGTH * warm, 0.0001);
      rampMesh.current.scale.x = length;
      rampMesh.current.position.x =
        RAMP_START_X + (Math.cos(RAMP_ANGLE) * length) / 2;
      rampMesh.current.position.y =
        PLOT_ZERO_Y + (Math.sin(RAMP_ANGLE) * length) / 2;
      rampMesh.current.visible = warm > 0.001;
    }

    // --- Étiquettes vivantes : le DOM n'est touché qu'au changement de valeur. ---
    const rounded = Math.round(celsius);
    if (temperatureLabel.current && rounded !== lastPrintedC.current) {
      temperatureLabel.current.textContent = `θ = ${rounded} °C`;
      lastPrintedC.current = rounded;
    }
    if (iceLabel.current) {
      // L'étiquette de la glace s'efface quand le dernier glaçon disparaît.
      iceLabel.current.style.opacity = String(clamp01(1 - melt * 1.15));
    }
  });

  return (
    <group>
      {/* Plaque chauffante, à puissance constante sur toute la boucle. */}
      <mesh position={[POT_X, 0.07, 0]}>
        <boxGeometry args={[1.2, 0.14, 1.2]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>

      {/* Casserole : paroi ouverte et fond. */}
      <mesh position={[POT_X, 0.49, 0]} material={POT_MATERIAL}>
        <cylinderGeometry args={[POT_RADIUS, POT_RADIUS, 0.7, 40, 1, true]} />
      </mesh>
      <mesh position={[POT_X, 0.155, 0]} material={POT_MATERIAL}>
        <cylinderGeometry args={[POT_RADIUS, POT_RADIUS, 0.03, 40]} />
      </mesh>

      {/* Eau : hauteur mise à l'échelle, couleur pilotée par la température. */}
      <mesh ref={waterMesh} position={[POT_X, 0.22, 0]}>
        <cylinderGeometry args={[WATER_RADIUS, WATER_RADIUS, 1, 40]} />
        <meshStandardMaterial
          ref={waterMaterial}
          color={DIAGRAM_COLORS.cold}
          emissive={DIAGRAM_COLORS.cold}
          emissiveIntensity={0.2}
          transparent
          opacity={WATER_OPACITY}
          roughness={0.12}
          metalness={0.05}
        />
      </mesh>

      {/* Glaçons : quatre cubes désalignés, dont l'arête tombe à zéro. */}
      <instancedMesh
        ref={iceMesh}
        args={[undefined, undefined, ICE_COUNT]}
        material={ICE_MATERIAL}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>

      {/* Micro-particules : l'énergie consommée par la fusion, rendue visible. */}
      <instancedMesh
        ref={sparkleMesh}
        args={[undefined, undefined, SPARKLE_COUNT]}
        material={SPARKLE_MATERIAL}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 6, 6]} />
      </instancedMesh>

      {/* Thermomètre : tige, bulbe et colonne mise à l'échelle. */}
      <mesh
        position={[BULB_POSITION[0], 0.62, BULB_POSITION[2]]}
        material={POT_MATERIAL}
      >
        <cylinderGeometry args={[0.03, 0.03, 0.95, 16, 1, true]} />
      </mesh>
      <mesh position={BULB_POSITION}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.hot}
          emissive={DIAGRAM_COLORS.hot}
          emissiveIntensity={0.5}
          toneMapped={false}
        />
      </mesh>
      <mesh
        ref={columnMesh}
        position={[BULB_POSITION[0], 0.26, BULB_POSITION[2]]}
      >
        <cylinderGeometry args={[0.016, 0.016, 1, 12]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.hot}
          emissive={DIAGRAM_COLORS.hot}
          emissiveIntensity={0.55}
          toneMapped={false}
        />
      </mesh>

      {/* Flux de chaleur : trois apports identiques et ininterrompus. */}
      {FLUX_ORIGINS.map((origin) => (
        <VectorArrow
          key={`${origin[0]}-${origin[2]}`}
          origin={origin}
          direction={FLUX_DIRECTION}
          length={FLUX_LENGTH}
          color={DIAGRAM_COLORS.hot}
          thickness={0.02}
          opacity={0.9}
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

      {/* Panneau graphique : la forme de la courbe θ(énergie fournie). */}
      <group position={PANEL_POSITION} rotation={[0, PANEL_ROTATION_Y, 0]}>
        <mesh>
          <planeGeometry args={[1.1, 0.8]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.structure}
            roughness={0.95}
            side={DoubleSide}
            transparent
            opacity={0.9}
          />
        </mesh>

        {/* Bandes de lecture : la fusion occupe quatre fois plus que la rampe. */}
        <mesh position={[PLOT_LEFT + PLATEAU_WIDTH / 2, -0.02, 0.003]}>
          <planeGeometry args={[PLATEAU_WIDTH, 0.6]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.cold}
            transparent
            opacity={0.16}
            side={DoubleSide}
          />
        </mesh>
        <mesh position={[RAMP_START_X + RAMP_RUN / 2, -0.02, 0.003]}>
          <planeGeometry args={[RAMP_RUN, 0.6]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.hot}
            transparent
            opacity={0.16}
            side={DoubleSide}
          />
        </mesh>

        {/* Axes : énergie fournie en abscisse, température en ordonnée. */}
        <mesh position={[PLOT_LEFT, 0, 0.006]}>
          <boxGeometry args={[0.008, 0.64, 0.004]} />
          <meshStandardMaterial color={DIAGRAM_COLORS.guide} roughness={0.9} />
        </mesh>
        <mesh position={[PLOT_LEFT + 0.51, -0.32, 0.006]}>
          <boxGeometry args={[1.02, 0.008, 0.004]} />
          <meshStandardMaterial color={DIAGRAM_COLORS.guide} roughness={0.9} />
        </mesh>

        {/* Palier de fusion, puis rampe de réchauffement, tracés en direct. */}
        <mesh
          ref={plateauMesh}
          position={[PLOT_LEFT, PLOT_ZERO_Y, 0.012]}
          material={CURVE_MATERIAL}
        >
          <boxGeometry args={[1, 0.016, 0.008]} />
        </mesh>
        <mesh
          ref={rampMesh}
          position={[RAMP_START_X, PLOT_ZERO_Y, 0.012]}
          rotation={[0, 0, RAMP_ANGLE]}
          material={CURVE_MATERIAL}
        >
          <boxGeometry args={[1, 0.016, 0.008]} />
        </mesh>

        {/* Étiquettes du panneau : les constantes de l'énoncé, aucun bilan. */}
        <DiagramLabel position={[0, 0.56, 0]}>
          L_f = {formatInteger(latentHeat)} J/kg
        </DiagramLabel>
        <DiagramLabel position={[0, 0.3, 0]}>
          c = {formatInteger(heatCapacity)} J/(kg·K)
        </DiagramLabel>
        <DiagramLabel position={[-0.1, -0.5, 0]} tone="info">
          fusion
        </DiagramLabel>
        <DiagramLabel position={[0.5, -0.74, 0]} tone="danger">
          réchauffement
        </DiagramLabel>
      </group>

      {/* Étiquettes de la casserole : uniquement les données de l'énoncé. */}
      <DiagramLabel position={[POT_X, 1.08, 0.5]}>
        <span ref={iceLabel}>
          {formatInteger(iceMass * 1000)} g de glace à {Math.round(initialC)} °C
        </span>
      </DiagramLabel>
      <DiagramLabel position={[POT_X + 0.85, 0.3, 0.12]} tone="warning">
        <span ref={temperatureLabel}>θ = {Math.round(initialC)} °C</span>
      </DiagramLabel>
      <DiagramLabel position={[POT_X, 0.02, 0.85]}>
        puissance constante
      </DiagramLabel>
    </group>
  );
}
