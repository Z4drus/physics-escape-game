"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, Group, MeshStandardMaterial } from "three";

import { DIAGRAM_COLORS } from "@/features/game/components/diagrams/palette";
import { DiagramLabel } from "@/features/game/components/diagrams/primitives/DiagramLabel";
import { VectorArrow } from "@/features/game/components/diagrams/primitives/VectorArrow";
import type { DiagramSceneProps } from "@/features/game/components/diagrams/registry";
import type { Vec3 } from "@/types/game";

/** Durée d'un cycle complet d'animation, en secondes. */
const CYCLE = 4;
/** Instant où la flèche de poids a fini de descendre. */
const PRESS_END = 1.2;
/** Instant où la scène commence à revenir au repos. */
const RELEASE_START = 2.6;
/** Emprise maximale de la face d'appui dans la scène, en unités de scène. */
const MAX_SPAN = 1.15;
/** Longueur de la flèche de poids. */
const WEIGHT_ARROW_LENGTH = 0.45;
/** Écart entre la pointe de la flèche et le sommet de la caisse, au repos. */
const WEIGHT_ARROW_GAP = 0.3;
/** Enfoncement symbolique de la caisse sous la force pressante. */
const BOX_SINK = 0.014;
/** Trame de micro-flèches figurant la répartition de la pression. */
const MICRO_COLUMNS = 6;
const MICRO_ROWS = 5;
const MICRO_ARROW_LENGTH = 0.13;
const MICRO_ARROW_TOP = 0.17;
/** Retard maximal du départ d'une micro-flèche, en fraction d'appui. */
const MICRO_MAX_DELAY = 0.4;

const ORIGIN: Vec3 = [0, 0, 0];
const DOWN: Vec3 = [0, -1, 0];

/** Une micro-flèche de la trame : sa position et son retard de cascade. */
interface MicroArrowSpec {
  position: Vec3;
  delay: number;
}

/**
 * Schéma de la caisse posée au sol : une force unique appliquée sur le dessus
 * se redistribue en une multitude de petites poussées sur toute la face
 * d'appui. Le rapport « une grosse flèche pour beaucoup de petites » est la
 * traduction visuelle de p = F / S ; la valeur de la pression n'est jamais
 * affichée, seules les grandeurs de l'énoncé le sont.
 */
export function PressureBoxOnGroundScene({ params }: DiagramSceneProps) {
  const contactWidth = Number(params.contactWidthM ?? 0.5);
  const contactDepth = Number(params.contactDepthM ?? 0.4);
  const boxHeightM = Number(params.boxHeightM ?? 0.35);
  const forceLabel = String(params.forceLabel ?? "F");
  const areaLabel = String(params.areaLabel ?? "S = surface d'appui");

  // La face d'appui est mise à l'échelle de la scène en conservant strictement
  // le rapport largeur / profondeur de l'énoncé : c'est lui qui se lit.
  const largestSide = Math.max(contactWidth, contactDepth, 0.01);
  const boxWidth = (contactWidth / largestSide) * MAX_SPAN;
  const boxDepth = (contactDepth / largestSide) * MAX_SPAN;
  const boxHeight = clamp((boxHeightM / largestSide) * MAX_SPAN, 0.35, 0.85);
  const halfWidth = boxWidth / 2;
  const halfDepth = boxDepth / 2;

  const boxEdges = useMemo(
    () => new BoxGeometry(boxWidth, boxHeight, boxDepth),
    [boxWidth, boxHeight, boxDepth],
  );

  // Trame régulière de micro-flèches sous la face d'appui, retardée du centre
  // vers les bords pour que la répartition se lise comme une propagation.
  const microArrows = useMemo<readonly MicroArrowSpec[]>(() => {
    const specs: MicroArrowSpec[] = [];
    for (let column = 0; column < MICRO_COLUMNS; column += 1) {
      for (let row = 0; row < MICRO_ROWS; row += 1) {
        const u = (column + 0.5) / MICRO_COLUMNS - 0.5;
        const v = (row + 0.5) / MICRO_ROWS - 0.5;
        const ring = Math.max(Math.abs(u), Math.abs(v)) * 2;
        specs.push({
          position: [u * boxWidth * 0.88, MICRO_ARROW_TOP, v * boxDepth * 0.88],
          delay: ring * MICRO_MAX_DELAY,
        });
      }
    }
    return specs;
  }, [boxWidth, boxDepth]);

  const boxGroup = useRef<Group>(null);
  const arrowGroup = useRef<Group>(null);
  const contactMaterial = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime % CYCLE;
    const press = pressProgress(time);

    if (arrowGroup.current) {
      // La flèche descend jusqu'à venir toucher le sommet de la caisse.
      const tipY = boxHeight + WEIGHT_ARROW_GAP * (1 - press);
      arrowGroup.current.position.y = tipY + WEIGHT_ARROW_LENGTH;
    }

    if (boxGroup.current) {
      // Enfoncement symbolique, suivi d'un micro-rebond amorti.
      const sinceImpact = Math.max(time - PRESS_END, 0);
      const bounce =
        0.005 * Math.exp(-7 * sinceImpact) * Math.sin(sinceImpact * 20);
      boxGroup.current.position.y = -BOX_SINK * press + bounce;
    }

    if (contactMaterial.current) {
      contactMaterial.current.opacity = 0.15 + 0.3 * press;
    }
  });

  return (
    <group>
      {/* Sol de la salle des machines, quadrillé pour donner l'échelle. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 2.6]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.92}
          metalness={0.04}
        />
      </mesh>
      <gridHelper
        args={[2.8, 14, DIAGRAM_COLORS.guide, DIAGRAM_COLORS.guide]}
        position={[0, 0.004, 0]}
      />

      {/* Face d'appui : c'est la surface S dont le joueur doit prendre la mesure. */}
      <mesh
        position={[0, 0.008, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1}
      >
        <planeGeometry args={[boxWidth, boxDepth]} />
        <meshStandardMaterial
          ref={contactMaterial}
          color={DIAGRAM_COLORS.support}
          emissive={DIAGRAM_COLORS.support}
          emissiveIntensity={0.5}
          transparent
          opacity={0.15}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Micro-flèches : la force du dessus redistribuée sur toute la surface. */}
      {microArrows.map((arrow) => (
        <MicroPressureArrow
          key={`${arrow.position[0]}:${arrow.position[2]}`}
          position={arrow.position}
          delay={arrow.delay}
        />
      ))}

      {/* Caisse translucide : la face d'appui doit rester visible au travers. */}
      <group ref={boxGroup}>
        <mesh position={[0, boxHeight / 2, 0]} renderOrder={2}>
          <boxGeometry args={[boxWidth, boxHeight, boxDepth]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.object}
            roughness={0.32}
            metalness={0.3}
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>
        <lineSegments position={[0, boxHeight / 2, 0]} renderOrder={3}>
          <edgesGeometry args={[boxEdges]} />
          <lineBasicMaterial
            color={DIAGRAM_COLORS.object}
            transparent
            opacity={0.85}
            toneMapped={false}
          />
        </lineSegments>
      </group>

      {/* Cotes de la base : les deux longueurs qui composent la surface. */}
      <DimensionBar
        position={[0, 0.012, halfDepth + 0.07]}
        size={[boxWidth, 0.012, 0.012]}
        capSize={[0.012, 0.012, 0.07]}
        capOffset={[halfWidth, 0, 0]}
      />
      <DimensionBar
        position={[halfWidth + 0.07, 0.012, 0]}
        size={[0.012, 0.012, boxDepth]}
        capSize={[0.07, 0.012, 0.012]}
        capOffset={[0, 0, halfDepth]}
      />

      {/* Force pressante appliquée sur le dessus de la caisse. */}
      <group
        ref={arrowGroup}
        position={[0, boxHeight + WEIGHT_ARROW_GAP + WEIGHT_ARROW_LENGTH, 0]}
      >
        <VectorArrow
          origin={ORIGIN}
          direction={DOWN}
          length={WEIGHT_ARROW_LENGTH}
          color={DIAGRAM_COLORS.weight}
          thickness={0.05}
        />
      </group>

      <DiagramLabel
        position={[
          0,
          boxHeight + WEIGHT_ARROW_GAP + WEIGHT_ARROW_LENGTH + 0.14,
          0,
        ]}
        tone="warning"
      >
        {forceLabel}
      </DiagramLabel>
      <DiagramLabel position={[0, 0.03, halfDepth + 0.24]}>
        {formatMeters(contactWidth)}
      </DiagramLabel>
      <DiagramLabel position={[halfWidth + 0.3, 0.03, 0]}>
        {formatMeters(contactDepth)}
      </DiagramLabel>
      <DiagramLabel position={[0, 0.04, -halfDepth - 0.26]} tone="info">
        {areaLabel}
      </DiagramLabel>
      <DiagramLabel
        position={[-halfWidth - 0.42, 0.26, halfDepth * 0.4]}
        tone="accent"
      >
        p = ?
      </DiagramLabel>
    </group>
  );
}

/**
 * Micro-flèche de la trame de pression : elle s'allonge avec un retard
 * proportionnel à sa distance au centre, ce qui donne l'impression que la
 * force appliquée se propage sur toute la face d'appui.
 */
function MicroPressureArrow({ position, delay }: MicroArrowSpec) {
  const group = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const press = pressProgress(clock.elapsedTime % CYCLE);
    const local = clamp((press - delay) / (1 - delay), 0, 1);
    group.current.scale.y = 0.25 + 0.75 * local;
  });

  return (
    <group ref={group} position={position}>
      <VectorArrow
        origin={ORIGIN}
        direction={DOWN}
        length={MICRO_ARROW_LENGTH}
        color={DIAGRAM_COLORS.support}
        thickness={0.013}
      />
    </group>
  );
}

/**
 * Cote d'une arête de la face d'appui : une barre fine terminée par deux
 * embouts, dont l'éclat suit l'appui pour attirer l'œil au bon moment.
 */
function DimensionBar({
  position,
  size,
  capSize,
  capOffset,
}: {
  position: Vec3;
  size: Vec3;
  capSize: Vec3;
  capOffset: Vec3;
}) {
  const material = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!material.current) return;
    material.current.opacity =
      0.4 + 0.6 * pressProgress(clock.elapsedTime % CYCLE);
  });

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial
          ref={material}
          color={DIAGRAM_COLORS.object}
          emissive={DIAGRAM_COLORS.object}
          emissiveIntensity={0.4}
          transparent
          opacity={0.4}
          toneMapped={false}
        />
      </mesh>
      {[1, -1].map((side) => (
        <mesh
          key={side}
          position={[
            capOffset[0] * side,
            capOffset[1] * side,
            capOffset[2] * side,
          ]}
        >
          <boxGeometry args={capSize} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.object}
            emissive={DIAGRAM_COLORS.object}
            emissiveIntensity={0.4}
            transparent
            opacity={0.75}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Avancement de l'appui, de 0 (caisse au repos) à 1 (force pleinement appliquée). */
function pressProgress(time: number): number {
  if (time < PRESS_END) {
    return easeOutCubic(time / PRESS_END);
  }
  if (time < RELEASE_START) {
    return 1;
  }
  return 1 - easeInOutSine((time - RELEASE_START) / (CYCLE - RELEASE_START));
}

/** Décélération douce : l'appui arrive vite puis se pose. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Accélération puis décélération symétriques, pour un retour sans à-coup. */
function easeInOutSine(t: number): number {
  return 0.5 - Math.cos(Math.PI * clamp(t, 0, 1)) / 2;
}

/** Borne une valeur dans un intervalle. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Met en forme une longueur en mètres à la française : « 0,50 m ». */
function formatMeters(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} m`;
}
