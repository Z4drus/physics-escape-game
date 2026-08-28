"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { BoxGeometry, EdgesGeometry } from "three";
import type { Group, Mesh, MeshStandardMaterial } from "three";

import { DIAGRAM_COLORS } from "@/features/game/components/diagrams/palette";
import { DiagramLabel } from "@/features/game/components/diagrams/primitives/DiagramLabel";
import { VectorArrow } from "@/features/game/components/diagrams/primitives/VectorArrow";
import type { DiagramSceneProps } from "@/features/game/components/diagrams/registry";
import type { Vec3 } from "@/types/game";

/* -------------------------------------------------------------------- */
/* Échelle, rythme et géométrie                                          */
/* -------------------------------------------------------------------- */

/** Longueur, en unités de scène, attribuée à la force la plus intense. */
const MAX_ARROW_LENGTH = 1.1;
/** Durée d'un cycle complet d'animation, en secondes. */
const CYCLE_SECONDS = 4;
/** Instant figé lorsque l'utilisateur a demandé à limiter les animations. */
const STATIC_TIME = 3.2;

/** Dessus du plateau de l'établi ; le sol de la scène est à y = 0. */
const BENCH_TOP_Y = 0.86;
const BENCH_PLATE_SIZE: Vec3 = [2.4, 0.1, 1.2];
const CRATE_SIZE: Vec3 = [0.7, 0.5, 0.55];

/**
 * Centre de gravité de la caisse, donc point d'application du poids.
 * Sa hauteur est choisie pour que la flèche de 1,10 u s'arrête juste au sol :
 * le vecteur reste entièrement dans le cadre.
 */
const CRATE_CENTER: Vec3 = [0, BENCH_TOP_Y + CRATE_SIZE[1] / 2, 0];

const ARROW_ORIGIN: Vec3 = [0, 0, 0];
const DOWNWARD: Vec3 = [0, -1, 0];
const HANDLE_POSITION: Vec3 = [0, CRATE_SIZE[1] / 2, 0];
const FLOOR_ROTATION_X = -Math.PI / 2;

const LEG_POSITIONS: readonly Vec3[] = [
  [-1.1, 0.38, -0.5],
  [1.1, 0.38, -0.5],
  [-1.1, 0.38, 0.5],
  [1.1, 0.38, 0.5],
];

const MASS_LABEL_POSITION: Vec3 = [0, 0, 0.32];
const WEIGHT_LABEL_POSITION: Vec3 = [
  0.24,
  CRATE_CENTER[1] - MAX_ARROW_LENGTH / 2,
  0,
];
const GRAVITY_LABEL_POSITION: Vec3 = [1.05, 1.44, 0];
const NOTE_LABEL_POSITION: Vec3 = [0.05, 0.14, 0.9];

/* -------------------------------------------------------------------- */
/* Utilitaires                                                           */
/* -------------------------------------------------------------------- */

/** Progression de `time` sur l'intervalle [from, to], bornée à [0, 1]. */
function ramp(time: number, from: number, to: number): number {
  return Math.min(Math.max((time - from) / (to - from), 0), 1);
}

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3;
}

function easeInCubic(value: number): number {
  return value ** 3;
}

/** Écriture française d'un nombre : la virgule sépare les décimales. */
function formatNumber(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

/**
 * Vrai quand le système demande de réduire les animations. La scène se fige
 * alors sur son état final, toutes les flèches et étiquettes visibles.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

/* -------------------------------------------------------------------- */
/* Scène                                                                 */
/* -------------------------------------------------------------------- */

/**
 * Schéma « poids d'une caisse posée sur un établi » : le poids est la seule
 * force représentée, il part du centre de gravité et descend à la verticale.
 *
 * L'animation sépare volontairement les deux grandeurs que la question
 * confond : la masse vit *dans* l'objet (badge sur la caisse, qui s'illumine),
 * le poids vit *sur* la flèche. La valeur du poids n'est jamais affichée,
 * c'est précisément ce que l'élève doit calculer.
 */
export function WeightCrateBenchScene({ params }: DiagramSceneProps) {
  const mass = Number(params.masse_kg ?? 5);
  const gravity = Number(params.g_m_s2 ?? 9.81);
  const weight = Number(params.poids_N ?? mass * gravity);

  // Échelle des flèches : la force la plus intense du schéma mesure 1,10 u.
  // Le poids étant ici la seule force tracée, il fixe seul le facteur.
  const unitPerNewton = MAX_ARROW_LENGTH / weight;
  const weightLength = weight * unitPerNewton;

  const reduced = usePrefersReducedMotion();

  const crate = useRef<Group>(null);
  const weightArrow = useRef<Group>(null);
  const gravityCentre = useRef<Mesh>(null);
  const crateMaterial = useRef<MeshStandardMaterial>(null);

  // Les étiquettes sont du HTML : elles apparaissent par étapes, jamais image
  // par image. L'état ne change donc qu'aux quelques bascules du cycle.
  const [showWeightLabel, setShowWeightLabel] = useState(false);
  const weightLabelShown = useRef(false);

  const crateEdges = useMemo(() => {
    const box = new BoxGeometry(...CRATE_SIZE);
    const edges = new EdgesGeometry(box);
    box.dispose();
    return edges;
  }, []);

  useEffect(() => () => crateEdges.dispose(), [crateEdges]);

  useFrame(({ clock }) => {
    const time = reduced ? STATIC_TIME : clock.getElapsedTime() % CYCLE_SECONDS;

    // 0 → 0,3 s : la caisse se pose et son centre de gravité se révèle.
    const landing = easeOutCubic(ramp(time, 0, 0.3));
    if (crate.current) {
      crate.current.position.y = CRATE_CENTER[1] + 0.08 * (1 - landing);
    }
    if (gravityCentre.current) {
      gravityCentre.current.scale.setScalar(landing);
    }

    // 0,3 → 1,4 s : la flèche croît depuis G ; 3,6 → 4,0 s : elle se rétracte.
    const growth = easeOutCubic(ramp(time, 0.3, 1.4));
    const collapse = 1 - easeInCubic(ramp(time, 3.6, CYCLE_SECONDS));
    if (weightArrow.current) {
      weightArrow.current.scale.setScalar(growth * collapse);
    }

    // 1,9 → 3,0 s : la caisse s'illumine une fois. La masse est une propriété
    // du corps, pas un vecteur : elle « habite » le volume, pas la flèche.
    const pulse = Math.sin(Math.PI * ramp(time, 1.9, 3)) ** 2;
    if (crateMaterial.current) {
      crateMaterial.current.emissiveIntensity = 0.05 + 0.3 * pulse;
    }

    const nextLabel = time >= 1.4 && time < 3.6;
    if (nextLabel !== weightLabelShown.current) {
      weightLabelShown.current = nextLabel;
      setShowWeightLabel(nextLabel);
    }
  });

  return (
    <group>
      {/* Sol de référence et trame : ils ancrent la verticale du poids. */}
      <mesh rotation-x={FLOOR_ROTATION_X}>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.95}
          transparent
          opacity={0.55}
        />
      </mesh>
      <gridHelper
        args={[3, 12, DIAGRAM_COLORS.guide, DIAGRAM_COLORS.structure]}
        position={[0, 0.004, 0]}
        material-transparent
        material-opacity={0.3}
      />

      {/* Plateau de l'établi : translucide pour que la flèche du poids reste
          lisible sur toute sa longueur, y compris sous le plan d'appui. */}
      <mesh position={[0, BENCH_TOP_Y - BENCH_PLATE_SIZE[1] / 2, 0]}>
        <boxGeometry args={BENCH_PLATE_SIZE} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.65}
          metalness={0.25}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>

      {LEG_POSITIONS.map((position) => (
        <mesh key={`${position[0]}:${position[2]}`} position={position}>
          <cylinderGeometry args={[0.05, 0.05, 0.76, 12]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.metal}
            roughness={0.45}
            metalness={0.75}
          />
        </mesh>
      ))}

      {/* Caisse à outils : translucide, on doit voir le centre de gravité. */}
      <group ref={crate} position={CRATE_CENTER}>
        <mesh>
          <boxGeometry args={CRATE_SIZE} />
          <meshStandardMaterial
            ref={crateMaterial}
            color={DIAGRAM_COLORS.metal}
            emissive={DIAGRAM_COLORS.metal}
            emissiveIntensity={0.05}
            roughness={0.55}
            metalness={0.35}
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </mesh>

        <lineSegments geometry={crateEdges}>
          <lineBasicMaterial
            color={DIAGRAM_COLORS.object}
            transparent
            opacity={0.5}
          />
        </lineSegments>

        {/* Poignée : demi-tore posé sur la face supérieure. */}
        <mesh position={HANDLE_POSITION}>
          <torusGeometry args={[0.1, 0.018, 8, 20, Math.PI]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.metal}
            roughness={0.4}
            metalness={0.8}
          />
        </mesh>

        {/* Point d'application du poids : le centre de gravité. */}
        <mesh ref={gravityCentre}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.object}
            emissive={DIAGRAM_COLORS.object}
            emissiveIntensity={0.6}
            toneMapped={false}
          />
        </mesh>

        <DiagramLabel position={MASS_LABEL_POSITION}>
          m = {formatNumber(mass, 1)} kg
        </DiagramLabel>
      </group>

      {/* Poids : verticale descendante, appliquée au centre de gravité. */}
      <group ref={weightArrow} position={CRATE_CENTER} scale={0}>
        <VectorArrow
          origin={ARROW_ORIGIN}
          direction={DOWNWARD}
          length={weightLength}
          color={DIAGRAM_COLORS.weight}
          thickness={0.022}
        />
      </group>

      {showWeightLabel ? (
        <DiagramLabel position={WEIGHT_LABEL_POSITION} tone="warning">
          P
        </DiagramLabel>
      ) : null}

      <DiagramLabel position={GRAVITY_LABEL_POSITION}>
        g = {formatNumber(gravity, 2)} m/s²
      </DiagramLabel>

      <DiagramLabel position={NOTE_LABEL_POSITION}>
        seul le poids est représenté
      </DiagramLabel>
    </group>
  );
}
