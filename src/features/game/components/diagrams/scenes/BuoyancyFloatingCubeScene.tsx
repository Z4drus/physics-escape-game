"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackSide, BoxGeometry, DoubleSide, EdgesGeometry } from "three";
import type { Group, Mesh, MeshStandardMaterial, PlaneGeometry } from "three";

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
const CYCLE_SECONDS = 6;
/** Instant figé lorsque l'utilisateur a demandé à limiter les animations. */
const STATIC_TIME = 5.5;

/** Côté du cube à l'écran : un mobile fait toujours 0,6 unité de côté. */
const CUBE_UNITS = 0.6;
/** Surface libre de l'eau. Toute la scène repose sur y = 0. */
const WATER_Y = 1;
/** Hauteur de lâcher du cube au-dessus de sa position d'équilibre. */
const DROP_HEIGHT = 0.25;
/** Amplitude du premier rebond, vers le bas (85 % du cube immergé). */
const BOUNCE_AMPLITUDE = 0.2;
/** Amplitude de l'ondulation de la surface. */
const RIPPLE_AMPLITUDE = 0.012;

const TANK_SIZE: Vec3 = [2.2, 1.31, 1.25];
const TANK_CENTER: Vec3 = [0, 0.665, 0];
const WATER_SIZE: Vec3 = [2.12, 0.95, 1.17];
const WATER_CENTER: Vec3 = [0, 0.525, 0];

const ARROW_ORIGIN: Vec3 = [0, 0, 0];
const UPWARD: Vec3 = [0, 1, 0];
const DOWNWARD: Vec3 = [0, -1, 0];
const FLOOR_ROTATION_X = -Math.PI / 2;

const WATERLINE_POSITION: Vec3 = [0, WATER_Y, 0];
/** La ligne de flottaison se trace en largeur : son épaisseur reste entière. */
const WATERLINE_SCALE: Vec3 = [0, 1, 0];
const RIPPLE_POSITION: Vec3 = [0, WATER_Y + 0.006, 0];
const DENSITY_LABEL_POSITION: Vec3 = [-0.74, 0.3, 0.42];
const TRAP_LABEL_POSITION: Vec3 = [0.46, 1.62, 0];

/* -------------------------------------------------------------------- */
/* Utilitaires                                                           */
/* -------------------------------------------------------------------- */

/** Progression de `time` sur l'intervalle [from, to], bornée à [0, 1]. */
function ramp(time: number, from: number, to: number): number {
  return Math.min(Math.max((time - from) / (to - from), 0), 1);
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3;
}

function easeInCubic(value: number): number {
  return value ** 3;
}

function easeInOutCubic(value: number): number {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

/** Écriture française d'un nombre : la virgule sépare les décimales. */
function formatNumber(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

/**
 * Vrai quand le système demande de réduire les animations. La scène se fige
 * alors sur son état d'équilibre, toutes les flèches et étiquettes visibles.
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
 * Déforme la surface libre par deux trains d'ondes croisés.
 *
 * La géométrie est passée en paramètre plutôt que capturée : la boucle écrit
 * directement dans le tampon de sommets, et l'isoler ici garde le composant
 * exempt de mutation d'une valeur issue du rendu. `position.array` d'une
 * `PlaneGeometry` est toujours un `Float32Array` ; seule la composante hors
 * plan est modifiée.
 */
function rippleSurface(geometry: PlaneGeometry, elapsed: number) {
  const attribute = geometry.attributes.position;
  const vertices = attribute.array as Float32Array;

  for (let index = 0; index < vertices.length; index += 3) {
    vertices[index + 2] =
      RIPPLE_AMPLITUDE *
      (Math.sin(vertices[index] * 4.2 + elapsed * 1.7) +
        Math.sin(vertices[index + 1] * 3.4 - elapsed * 1.3));
  }

  attribute.needsUpdate = true;
}

/**
 * Schéma « cube de bois flottant » : la poussée d'Archimède ne dépend que du
 * volume réellement immergé.
 *
 * Le cube est construit en deux boîtes empilées, séparées par la ligne de
 * flottaison : la part immergée est visible sans le moindre texte. Le poids
 * et la poussée, jumeaux à l'équilibre, partent de deux points distincts —
 * centre de gravité et centre de poussée. La phase « piège » enfonce le cube
 * jusqu'à immersion totale et déploie la flèche fantôme, nettement plus
 * longue : c'est la seule façon d'atteindre cette valeur-là. Aucune intensité
 * n'est écrite, seules les données de l'énoncé sont affichées.
 */
export function BuoyancyFloatingCubeScene({ params }: DiagramSceneProps) {
  const edge = Number(params.arete_m ?? 0.2);
  const mass = Number(params.masse_kg ?? 4.8);
  const density = Number(params.masse_volumique_eau_kg_m3 ?? 1000);
  const gravity = Number(params.g_m_s2 ?? 9.81);
  const totalVolume = Number(params.volume_total_m3 ?? edge ** 3);
  const submergedVolume = Number(params.volume_immerge_m3 ?? totalVolume * 0.6);
  const submergedDepth = Number(params.hauteur_immergee_m ?? edge * 0.6);
  const weight = Number(params.poids_N ?? mass * gravity);
  const buoyancy = Number(
    params.poussee_N ?? density * gravity * submergedVolume,
  );
  /** Poussée qu'on obtiendrait en immergeant tout le cube : le piège. */
  const fullBuoyancy = density * gravity * totalVolume;

  // Échelle commune : la flèche la plus longue du schéma — ici la poussée
  // fantôme du cube entièrement immergé — mesure 1,10 unité de scène.
  const unitPerNewton =
    MAX_ARROW_LENGTH / Math.max(weight, buoyancy, fullBuoyancy);
  const weightLength = weight * unitPerNewton;
  const buoyancyLength = buoyancy * unitPerNewton;
  const ghostLength = fullBuoyancy * unitPerNewton;

  // Proportions du cube : la hauteur immergée est celle de l'énoncé.
  const submergedUnits = (submergedDepth / edge) * CUBE_UNITS;
  const emergedUnits = CUBE_UNITS - submergedUnits;
  const submergedRatio = submergedVolume / totalVolume;

  const reduced = usePrefersReducedMotion();

  const cube = useRef<Group>(null);
  const weightArrow = useRef<Group>(null);
  const buoyancyArrow = useRef<Group>(null);
  const ghostArrow = useRef<Group>(null);
  const waterline = useRef<Mesh>(null);
  const ripple = useRef<Mesh>(null);
  const rippleMaterial = useRef<MeshStandardMaterial>(null);
  const submergedMaterial = useRef<MeshStandardMaterial>(null);
  const emergedMaterial = useRef<MeshStandardMaterial>(null);

  // Les étiquettes sont du HTML : elles n'apparaissent qu'aux bascules du
  // cycle, jamais image par image.
  const [phase, setPhase] = useState(0);
  const currentPhase = useRef(0);

  // La géométrie de la surface est créée par R3F : ses sommets sont déplacés
  // à chaque image, ce qui interdit de la partager via un `useMemo`.
  const surface = useRef<PlaneGeometry>(null);

  const cubeEdges = useMemo(() => {
    const box = new BoxGeometry(CUBE_UNITS, CUBE_UNITS, CUBE_UNITS);
    const edges = new EdgesGeometry(box);
    box.dispose();
    return edges;
  }, []);

  const tankEdges = useMemo(() => {
    const box = new BoxGeometry(...TANK_SIZE);
    const edges = new EdgesGeometry(box);
    box.dispose();
    return edges;
  }, []);

  useEffect(() => {
    return () => {
      cubeEdges.dispose();
      tankEdges.dispose();
    };
  }, [cubeEdges, tankEdges]);

  const layout = useMemo(() => {
    const cubeCentreY = WATER_Y - submergedUnits + CUBE_UNITS / 2;
    const buoyancyCentreY = WATER_Y - submergedUnits / 2;
    return {
      cubeCentreY,
      buoyancyCentreY,
      submergedCentre: [0, buoyancyCentreY, 0] as Vec3,
      emergedCentre: [0, WATER_Y + emergedUnits / 2, 0] as Vec3,
      cubeCentre: [0, cubeCentreY, 0] as Vec3,
      cubeBottom: cubeCentreY - CUBE_UNITS / 2,
      cubeTop: cubeCentreY + CUBE_UNITS / 2,
      labels: {
        mass: [0, WATER_Y + emergedUnits / 2 + 0.05, 0.34] as Vec3,
        edge: [-0.68, cubeCentreY, 0.31] as Vec3,
        volume: [0.52, buoyancyCentreY, 0] as Vec3,
        buoyancy: [0.24, buoyancyCentreY + buoyancyLength / 2, 0] as Vec3,
        weight: [-0.26, cubeCentreY - weightLength / 2, 0] as Vec3,
      },
    };
  }, [submergedUnits, emergedUnits, buoyancyLength, weightLength]);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const time = reduced ? STATIC_TIME : elapsed % CYCLE_SECONDS;

    // Surface de l'eau : deux trains d'ondes croisés, indépendants du cycle.
    if (surface.current) rippleSurface(surface.current, elapsed);

    // Enfoncement du cube : chute libre, rebonds amortis, équilibre, puis
    // immersion complète pendant la phase « piège ».
    let offset = 0;
    if (time < 0.35) {
      offset = DROP_HEIGHT * (1 - (time / 0.35) ** 2);
    } else if (time < 1.1) {
      const bounce = time - 0.35;
      offset =
        -BOUNCE_AMPLITUDE *
        Math.exp(-3.6 * bounce) *
        Math.sin((2 * Math.PI * bounce) / 0.34);
    }
    offset -=
      emergedUnits *
      (easeInOutCubic(ramp(time, 3.2, 3.7)) -
        easeOutCubic(ramp(time, 4.6, 5.1)));
    if (cube.current) {
      cube.current.position.y = offset;
    }

    // Anneau de vaguelettes parti du point d'impact.
    const wave = ramp(time, 0.35, 1);
    if (ripple.current) {
      ripple.current.scale.setScalar(0.5 + wave * 1.7);
    }
    if (rippleMaterial.current) {
      rippleMaterial.current.opacity = 0.5 * (1 - wave);
    }

    // Le volume immergé s'illumine : c'est lui, et lui seul, qui compte.
    const fade = 1 - easeInCubic(ramp(time, 5.7, CYCLE_SECONDS));
    const glow = easeOutCubic(ramp(time, 1.1, 2)) * fade;
    if (submergedMaterial.current) {
      submergedMaterial.current.emissiveIntensity = 0.34 * glow;
    }
    // Pendant le piège, la part émergée s'illumine à son tour : tout le cube
    // est alors sous l'eau, et le volume immergé change de valeur.
    if (emergedMaterial.current) {
      emergedMaterial.current.emissiveIntensity =
        0.34 *
        clamp01(
          easeOutCubic(ramp(time, 3.2, 3.7)) - easeOutCubic(ramp(time, 4.6, 5)),
        );
    }
    if (waterline.current) {
      const trace = easeOutCubic(ramp(time, 1.1, 1.8)) * fade;
      waterline.current.scale.set(trace, 1, trace);
    }

    // 2,6 → 3,2 s : le poids et la poussée croissent ensemble, à égalité.
    const pair = easeOutCubic(ramp(time, 2.6, 3.2));
    if (weightArrow.current) {
      weightArrow.current.scale.setScalar(pair * fade);
    }
    if (buoyancyArrow.current) {
      buoyancyArrow.current.scale.setScalar(
        clamp01(
          pair -
            easeInCubic(ramp(time, 3.2, 3.5)) +
            easeOutCubic(ramp(time, 4.9, 5.3)),
        ) * fade,
      );
    }
    if (ghostArrow.current) {
      ghostArrow.current.scale.setScalar(
        clamp01(
          easeOutCubic(ramp(time, 3.5, 4.1)) -
            easeInCubic(ramp(time, 4.6, 5.1)),
        ),
      );
    }

    const nextPhase =
      time < 2
        ? 0
        : time < 2.9
          ? 1
          : time < 3.7
            ? 2
            : time < 4.7
              ? 3
              : time < 5.7
                ? 4
                : 5;
    if (nextPhase !== currentPhase.current) {
      currentPhase.current = nextPhase;
      setPhase(nextPhase);
    }
  });

  const showVolume = phase === 1 || phase === 2 || phase === 4;
  const showForces = phase === 2 || phase === 4;
  const showWeight = phase >= 2 && phase <= 4;
  const showTrap = phase === 3;

  return (
    <group>
      {/* Paillasse : elle donne l'horizontale sous la cuve. */}
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

      {/* Cuve de verre : seules les faces internes sont rendues, la paroi
          avant ne masque donc jamais la partie immergée. */}
      <mesh position={TANK_CENTER}>
        <boxGeometry args={TANK_SIZE} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.object}
          roughness={0.1}
          metalness={0.05}
          transparent
          opacity={0.1}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>
      <lineSegments geometry={tankEdges} position={TANK_CENTER}>
        <lineBasicMaterial
          color={DIAGRAM_COLORS.object}
          transparent
          opacity={0.55}
        />
      </lineSegments>

      {/* Eau et surface libre ondulante. */}
      <mesh position={WATER_CENTER}>
        <boxGeometry args={WATER_SIZE} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.fluid}
          emissive={DIAGRAM_COLORS.fluid}
          emissiveIntensity={0.15}
          roughness={0.2}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
      <mesh position={WATERLINE_POSITION} rotation-x={FLOOR_ROTATION_X}>
        <planeGeometry
          ref={surface}
          args={[WATER_SIZE[0], WATER_SIZE[2], 24, 24]}
        />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.fluid}
          emissive={DIAGRAM_COLORS.fluid}
          emissiveIntensity={0.3}
          roughness={0.15}
          transparent
          opacity={0.4}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh
        ref={ripple}
        position={RIPPLE_POSITION}
        rotation-x={FLOOR_ROTATION_X}
      >
        <torusGeometry args={[0.3, 0.01, 6, 32]} />
        <meshStandardMaterial
          ref={rippleMaterial}
          color={DIAGRAM_COLORS.object}
          emissive={DIAGRAM_COLORS.object}
          emissiveIntensity={0.7}
          transparent
          opacity={0}
          toneMapped={false}
        />
      </mesh>

      {/* Ligne de flottaison : elle coupe le cube en deux volumes lisibles. */}
      <mesh
        ref={waterline}
        position={WATERLINE_POSITION}
        scale={WATERLINE_SCALE}
      >
        <boxGeometry args={[CUBE_UNITS + 0.03, 0.006, CUBE_UNITS + 0.03]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.object}
          emissive={DIAGRAM_COLORS.object}
          emissiveIntensity={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Cube : deux boîtes empilées, et les forces qui le suivent. */}
      <group ref={cube}>
        <mesh position={layout.submergedCentre}>
          <boxGeometry args={[CUBE_UNITS, submergedUnits, CUBE_UNITS]} />
          <meshStandardMaterial
            ref={submergedMaterial}
            color={DIAGRAM_COLORS.object}
            emissive={DIAGRAM_COLORS.buoyancy}
            emissiveIntensity={0}
            roughness={0.75}
            transparent
            opacity={0.7}
            depthWrite={false}
          />
        </mesh>
        <mesh position={layout.emergedCentre}>
          <boxGeometry args={[CUBE_UNITS, emergedUnits, CUBE_UNITS]} />
          <meshStandardMaterial
            ref={emergedMaterial}
            color={DIAGRAM_COLORS.object}
            emissive={DIAGRAM_COLORS.buoyancy}
            emissiveIntensity={0}
            roughness={0.75}
            transparent
            opacity={0.7}
            depthWrite={false}
          />
        </mesh>
        <lineSegments geometry={cubeEdges} position={layout.cubeCentre}>
          <lineBasicMaterial
            color={DIAGRAM_COLORS.object}
            transparent
            opacity={0.45}
          />
        </lineSegments>

        {/* Cote de l'arête, à gauche du cube. */}
        <mesh position={[-0.44, layout.cubeCentreY, 0.31]}>
          <boxGeometry args={[0.006, CUBE_UNITS, 0.006]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.guide}
            emissive={DIAGRAM_COLORS.guide}
            emissiveIntensity={0.5}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[-0.44, layout.cubeBottom, 0.31]}>
          <boxGeometry args={[0.09, 0.006, 0.006]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.guide}
            emissive={DIAGRAM_COLORS.guide}
            emissiveIntensity={0.5}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[-0.44, layout.cubeTop, 0.31]}>
          <boxGeometry args={[0.09, 0.006, 0.006]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.guide}
            emissive={DIAGRAM_COLORS.guide}
            emissiveIntensity={0.5}
            toneMapped={false}
          />
        </mesh>

        {/* Centre de gravité : point d'application du poids. */}
        <mesh position={layout.cubeCentre}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.object}
            emissive={DIAGRAM_COLORS.object}
            emissiveIntensity={0.6}
            toneMapped={false}
          />
        </mesh>
        {/* Centre de poussée : milieu de la partie immergée, plus bas. */}
        <mesh position={layout.submergedCentre}>
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.buoyancy}
            emissive={DIAGRAM_COLORS.buoyancy}
            emissiveIntensity={0.7}
            toneMapped={false}
          />
        </mesh>

        <group ref={weightArrow} position={layout.cubeCentre} scale={0}>
          <VectorArrow
            origin={ARROW_ORIGIN}
            direction={DOWNWARD}
            length={weightLength}
            color={DIAGRAM_COLORS.weight}
            thickness={0.022}
          />
        </group>
        <group ref={buoyancyArrow} position={layout.submergedCentre} scale={0}>
          <VectorArrow
            origin={ARROW_ORIGIN}
            direction={UPWARD}
            length={buoyancyLength}
            color={DIAGRAM_COLORS.buoyancy}
            thickness={0.022}
          />
        </group>
        {/* Poussée fantôme : celle du cube entièrement immergé. */}
        <group ref={ghostArrow} position={layout.cubeCentre} scale={0}>
          <VectorArrow
            origin={ARROW_ORIGIN}
            direction={UPWARD}
            length={ghostLength}
            color={DIAGRAM_COLORS.buoyancy}
            thickness={0.013}
            opacity={0.3}
          />
        </group>

        <DiagramLabel position={layout.labels.mass}>
          m = {formatNumber(mass, 1)} kg
        </DiagramLabel>
        <DiagramLabel position={layout.labels.edge}>
          arête = {formatNumber(edge * 100, 0)} cm
        </DiagramLabel>
      </group>

      <DiagramLabel position={DENSITY_LABEL_POSITION} tone="info">
        ρ_eau = {formatNumber(density, 0)} kg/m³
      </DiagramLabel>

      {showVolume ? (
        <DiagramLabel position={layout.labels.volume} tone="accent">
          V_immergé ({formatNumber(submergedRatio * 100, 0)} %)
        </DiagramLabel>
      ) : null}

      {showForces ? (
        <DiagramLabel position={layout.labels.buoyancy} tone="accent">
          F_A
        </DiagramLabel>
      ) : null}

      {showWeight ? (
        <DiagramLabel position={layout.labels.weight} tone="warning">
          P
        </DiagramLabel>
      ) : null}

      {showTrap ? (
        <DiagramLabel position={TRAP_LABEL_POSITION} tone="danger">
          cube entièrement immergé
        </DiagramLabel>
      ) : null}
    </group>
  );
}
