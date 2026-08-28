"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  BoxGeometry,
  CatmullRomCurve3,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";

import { DIAGRAM_COLORS } from "@/features/game/components/diagrams/palette";
import { DiagramLabel } from "@/features/game/components/diagrams/primitives/DiagramLabel";
import { VectorArrow } from "@/features/game/components/diagrams/primitives/VectorArrow";
import type { DiagramSceneProps } from "@/features/game/components/diagrams/registry";
import type { Vec3 } from "@/types/game";

/** Durée d'un cycle complet d'animation, en secondes. */
const CYCLE = 4.5;
/** Fin de la course d'enfoncement du petit piston. */
const STROKE_END = 1.3;
/** Début du retour à l'état initial. */
const RELEASE_START = 2.6;
/** Fenêtre de pulsation des flèches de pression dans l'huile. */
const PULSE_START = 1.3;
const PULSE_END = 2.1;

/** Abscisses des deux axes de piston. */
const SMALL_X = -0.95;
const LARGE_X = 0.55;
/** Dessus de l'établi, sur lequel reposent les deux socles. */
const BENCH_TOP = 0.12;
/** Fond intérieur des deux cylindres : le niveau bas de l'huile. */
const OIL_FLOOR = 0.3;
/** Hauteurs des deux corps de cylindre. */
const SMALL_BODY_HEIGHT = 0.8;
const LARGE_BODY_HEIGHT = 0.52;
/** Rayon intérieur du grand cylindre ; celui du petit s'en déduit par le rapport. */
const LARGE_RADIUS = 0.5;
/** Positions de repos des deux pistons. */
const SMALL_PISTON_Y = 0.82;
const LARGE_PISTON_Y = 0.7;
/** Course du petit piston ; celle du grand en est le quotient par le rapport des surfaces. */
const SMALL_STROKE = 0.35;
/** Altitude de la partie horizontale de la conduite d'huile. */
const TUBE_Y = 0.19;
const TUBE_RADIUS = 0.055;
/** Nombre de particules d'huile en circulation dans la conduite. */
const PARTICLE_COUNT = 14;
/** Centre du pavage de disques posé au premier plan. */
const PAVING_CENTER_X = -0.35;
const PAVING_CENTER_Z = 0.92;
/** Longueurs des deux flèches de force, au maximum de l'animation. */
const INPUT_ARROW_LENGTH = 0.34;
const OUTPUT_ARROW_LENGTH = 0.42;

const ORIGIN: Vec3 = [0, 0, 0];
const UP: Vec3 = [0, 1, 0];
const DOWN: Vec3 = [0, -1, 0];
const FORWARD: Vec3 = [0, 0, 1];

/** Objets de travail réutilisés image après image, jamais réalloués. */
const WORK_POSITION = new Vector3();
const WORK_MATRIX = new Matrix4();

/**
 * Schéma de la presse hydraulique : la pression est la même dans toute l'huile,
 * mais le grand piston oppose une surface bien plus grande. Le pavage de
 * disques posé au premier plan rend ce rapport de surfaces comptable à l'œil,
 * là où le rapport des diamètres ne se lit que comme une longueur. Aucune
 * valeur de force ni de rapport n'est écrite : seules les données de l'énoncé
 * apparaissent.
 */
export function HydraulicPressScene({ params }: DiagramSceneProps) {
  const smallDiameter = Number(params.smallPistonDiameterM ?? 0.04);
  const largeDiameter = Number(params.largePistonDiameterM ?? 0.2);
  const inputForceLabel = String(params.inputForceLabel ?? "F₁");
  const smallPistonLabel = String(params.smallPistonLabel ?? "d₁");
  const largePistonLabel = String(params.largePistonLabel ?? "d₂");

  // Le rapport des diamètres est encodé dans la géométrie : le grand piston
  // mesure exactement « rapport » fois le petit, et le pavage en découle.
  const diameterRatio = clamp(
    largeDiameter / Math.max(smallDiameter, 1e-6),
    2,
    6,
  );
  const smallRadius = LARGE_RADIUS / diameterRatio;
  const tilesPerRow = Math.round(diameterRatio);
  const largeStroke = SMALL_STROKE / (diameterRatio * diameterRatio);

  // Conduite en U reliant les fonds des deux cylindres, sous les socles.
  const oilCurve = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(SMALL_X, OIL_FLOOR, 0),
        new Vector3(SMALL_X, TUBE_Y + 0.04, 0),
        new Vector3(SMALL_X + 0.14, TUBE_Y, 0),
        new Vector3(LARGE_X - 0.14, TUBE_Y, 0),
        new Vector3(LARGE_X, TUBE_Y + 0.04, 0),
        new Vector3(LARGE_X, OIL_FLOOR, 0),
      ]),
    [],
  );

  const loadEdges = useMemo(() => new BoxGeometry(0.6, 0.2, 0.48), []);

  // Pavage : « rapport » disques de rang, soit rapport² disques au total,
  // inscrits dans le carré qui borne le grand disque.
  const pavingTiles = useMemo<readonly Vec3[]>(() => {
    const pitch = (2 * LARGE_RADIUS) / tilesPerRow;
    const tiles: Vec3[] = [];
    for (let row = 0; row < tilesPerRow; row += 1) {
      for (let column = 0; column < tilesPerRow; column += 1) {
        tiles.push([
          PAVING_CENTER_X + (column - (tilesPerRow - 1) / 2) * pitch,
          0.132,
          PAVING_CENTER_Z + (row - (tilesPerRow - 1) / 2) * pitch,
        ]);
      }
    }
    return tiles;
  }, [tilesPerRow]);

  const smallPiston = useRef<Mesh>(null);
  const smallOil = useRef<Mesh>(null);
  const inputArrow = useRef<Group>(null);
  const largeAssembly = useRef<Group>(null);
  const largeOil = useRef<Mesh>(null);
  const outputArrow = useRef<Group>(null);
  const particles = useRef<InstancedMesh>(null);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime % CYCLE;
    const stroke = strokeProgress(time);

    const pistonY = SMALL_PISTON_Y - SMALL_STROKE * stroke;
    if (smallPiston.current) {
      smallPiston.current.position.y = pistonY;
    }
    if (smallOil.current) {
      // L'huile chassée par le piston occupe toujours le volume sous lui.
      const height = Math.max(pistonY - 0.03 - OIL_FLOOR, 0.001);
      smallOil.current.scale.y = height;
      smallOil.current.position.y = OIL_FLOOR + height / 2;
    }
    if (inputArrow.current) {
      inputArrow.current.position.y = pistonY + 0.03 + INPUT_ARROW_LENGTH;
    }

    if (largeAssembly.current) {
      // Course minuscule mais réelle : le volume déplacé est le même.
      largeAssembly.current.position.y = largeStroke * stroke;
    }
    if (largeOil.current) {
      const height = Math.max(
        LARGE_PISTON_Y + largeStroke * stroke - 0.04 - OIL_FLOOR,
        0.001,
      );
      largeOil.current.scale.y = height;
      largeOil.current.position.y = OIL_FLOOR + height / 2;
    }
    if (outputArrow.current) {
      outputArrow.current.scale.y = 0.3 + 0.7 * stroke;
    }

    if (particles.current) {
      // Les particules avancent avec la course du piston, et refluent au retour.
      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        const u = (index / PARTICLE_COUNT + 0.55 * stroke) % 1;
        oilCurve.getPointAt(u, WORK_POSITION);
        WORK_MATRIX.makeTranslation(
          WORK_POSITION.x,
          WORK_POSITION.y,
          WORK_POSITION.z,
        );
        particles.current.setMatrixAt(index, WORK_MATRIX);
      }
      particles.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Établi de l'atelier : assise commune aux deux cylindres et au pavage. */}
      <mesh position={[-0.15, BENCH_TOP / 2, 0.25]}>
        <boxGeometry args={[2.5, BENCH_TOP, 2.5]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* Conduite d'huile et particules qui la parcourent. */}
      <mesh>
        <tubeGeometry args={[oilCurve, 72, TUBE_RADIUS, 14, false]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.weight}
          emissive={DIAGRAM_COLORS.weight}
          emissiveIntensity={0.3}
          roughness={0.35}
          transparent
          opacity={0.65}
        />
      </mesh>
      <instancedMesh
        ref={particles}
        args={[undefined, undefined, PARTICLE_COUNT]}
        frustumCulled={false}
      >
        <sphereGeometry args={[0.028, 10, 10]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.friction}
          emissive={DIAGRAM_COLORS.friction}
          emissiveIntensity={0.7}
          toneMapped={false}
        />
      </instancedMesh>

      {/* Flèches de pression : toutes de même longueur, partout dans l'huile. */}
      {[-0.75, -0.53, -0.31, -0.09].map((x) => (
        <group key={x}>
          <OilPressureArrow position={[x, TUBE_Y + TUBE_RADIUS, 0]} axis="y" />
          <OilPressureArrow position={[x, TUBE_Y, TUBE_RADIUS]} axis="z" />
        </group>
      ))}

      {/* Socles opaques : ils portent les cylindres et masquent les coudes. */}
      <mesh position={[SMALL_X, (BENCH_TOP + OIL_FLOOR) / 2, 0]}>
        <cylinderGeometry
          args={[
            smallRadius + 0.03,
            smallRadius + 0.03,
            OIL_FLOOR - BENCH_TOP,
            24,
          ]}
        />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[LARGE_X, (BENCH_TOP + OIL_FLOOR) / 2, 0]}>
        <cylinderGeometry
          args={[
            LARGE_RADIUS + 0.02,
            LARGE_RADIUS + 0.02,
            OIL_FLOOR - BENCH_TOP,
            40,
          ]}
        />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>

      {/* Petit cylindre : corps translucide, huile, piston et force appliquée. */}
      <mesh position={[SMALL_X, OIL_FLOOR + SMALL_BODY_HEIGHT / 2, 0]}>
        <cylinderGeometry
          args={[
            smallRadius + 0.02,
            smallRadius + 0.02,
            SMALL_BODY_HEIGHT,
            28,
            1,
            true,
          ]}
        />
        <CylinderWallMaterial />
      </mesh>
      <mesh ref={smallOil} position={[SMALL_X, OIL_FLOOR, 0]}>
        <cylinderGeometry args={[smallRadius, smallRadius, 1, 24]} />
        <OilMaterial />
      </mesh>
      <mesh ref={smallPiston} position={[SMALL_X, SMALL_PISTON_Y, 0]}>
        <cylinderGeometry args={[smallRadius, smallRadius, 0.06, 24]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.applied}
          emissive={DIAGRAM_COLORS.applied}
          emissiveIntensity={0.35}
          roughness={0.3}
          metalness={0.2}
          toneMapped={false}
        />
      </mesh>
      <group
        ref={inputArrow}
        position={[SMALL_X, SMALL_PISTON_Y + 0.03 + INPUT_ARROW_LENGTH, 0]}
      >
        <VectorArrow
          origin={ORIGIN}
          direction={DOWN}
          length={INPUT_ARROW_LENGTH}
          color={DIAGRAM_COLORS.applied}
          thickness={0.022}
        />
      </group>

      {/* Grand cylindre : même pression, surface bien plus grande. */}
      <mesh position={[LARGE_X, OIL_FLOOR + LARGE_BODY_HEIGHT / 2, 0]}>
        <cylinderGeometry
          args={[
            LARGE_RADIUS + 0.02,
            LARGE_RADIUS + 0.02,
            LARGE_BODY_HEIGHT,
            44,
            1,
            true,
          ]}
        />
        <CylinderWallMaterial />
      </mesh>
      <mesh ref={largeOil} position={[LARGE_X, OIL_FLOOR, 0]}>
        <cylinderGeometry args={[LARGE_RADIUS, LARGE_RADIUS, 1, 40]} />
        <OilMaterial />
      </mesh>
      {/* Repère fixe : il rend mesurable la course minuscule du grand piston. */}
      <mesh position={[LARGE_X + LARGE_RADIUS + 0.09, LARGE_PISTON_Y, 0]}>
        <boxGeometry args={[0.12, 0.008, 0.012]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.guide}
          emissive={DIAGRAM_COLORS.guide}
          emissiveIntensity={0.4}
          toneMapped={false}
        />
      </mesh>
      <group ref={largeAssembly}>
        <mesh position={[LARGE_X, LARGE_PISTON_Y, 0]}>
          <cylinderGeometry args={[LARGE_RADIUS, LARGE_RADIUS, 0.08, 44]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.buoyancy}
            emissive={DIAGRAM_COLORS.buoyancy}
            emissiveIntensity={0.35}
            roughness={0.3}
            metalness={0.2}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[LARGE_X, LARGE_PISTON_Y + 0.14, 0]}>
          <boxGeometry args={[0.6, 0.2, 0.48]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.metal}
            roughness={0.5}
            metalness={0.35}
          />
        </mesh>
        <lineSegments position={[LARGE_X, LARGE_PISTON_Y + 0.14, 0]}>
          <edgesGeometry args={[loadEdges]} />
          <lineBasicMaterial
            color={DIAGRAM_COLORS.object}
            transparent
            opacity={0.7}
            toneMapped={false}
          />
        </lineSegments>
        <group ref={outputArrow} position={[LARGE_X, LARGE_PISTON_Y + 0.3, 0]}>
          <VectorArrow
            origin={ORIGIN}
            direction={UP}
            length={OUTPUT_ARROW_LENGTH}
            color={DIAGRAM_COLORS.buoyancy}
            thickness={0.055}
          />
        </group>
      </group>

      {/* Pavage : le grand disque a la largeur de « rapport » petits disques,
          donc l'aire de « rapport² » d'entre eux. Ils s'allument un à un. */}
      <mesh
        position={[PAVING_CENTER_X, 0.126, PAVING_CENTER_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[LARGE_RADIUS, 56]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.buoyancy}
          emissive={DIAGRAM_COLORS.buoyancy}
          emissiveIntensity={0.3}
          transparent
          opacity={0.22}
          side={DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {pavingTiles.map((position, index) => (
        <PavingTile
          key={`${position[0]}:${position[2]}`}
          position={position}
          radius={smallRadius}
          index={index}
          total={pavingTiles.length}
        />
      ))}

      <DiagramLabel position={[SMALL_X, 1.38, 0]} tone="accent">
        {inputForceLabel}
      </DiagramLabel>
      <DiagramLabel position={[SMALL_X, 0.62, 0.26]}>
        {smallPistonLabel}
      </DiagramLabel>
      <DiagramLabel position={[LARGE_X, 0.16, 0.66]}>
        {largePistonLabel}
      </DiagramLabel>
      <DiagramLabel position={[LARGE_X, 1.55, 0]} tone="info">
        F₂ = ?
      </DiagramLabel>
      <DiagramLabel position={[-0.3, 0.36, -0.42]} tone="warning">
        même pression p dans toute l&apos;huile
      </DiagramLabel>
      <DiagramLabel position={[-1.05, 0.2, PAVING_CENTER_Z]} tone="info">
        S₂ / S₁ = (d₂ / d₁)²
      </DiagramLabel>
    </group>
  );
}

/** Paroi de cylindre : translucide, pour laisser voir le piston et l'huile. */
function CylinderWallMaterial() {
  return (
    <meshStandardMaterial
      color={DIAGRAM_COLORS.metal}
      roughness={0.2}
      metalness={0.4}
      transparent
      opacity={0.24}
      side={DoubleSide}
      depthWrite={false}
    />
  );
}

/** Huile sous pression : le même fluide dans les deux cylindres. */
function OilMaterial() {
  return (
    <meshStandardMaterial
      color={DIAGRAM_COLORS.weight}
      emissive={DIAGRAM_COLORS.weight}
      emissiveIntensity={0.25}
      roughness={0.3}
      transparent
      opacity={0.8}
    />
  );
}

/**
 * Petite flèche de pression perpendiculaire à la paroi de la conduite. Toutes
 * ont la même longueur et pulsent ensemble : la pression, elle, ne varie pas
 * d'un bout à l'autre du circuit.
 */
function OilPressureArrow({
  position,
  axis,
}: {
  position: Vec3;
  axis: "y" | "z";
}) {
  const group = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const time = clock.elapsedTime % CYCLE;
    const pulse =
      time >= PULSE_START && time < PULSE_END
        ? 1 +
          0.15 *
            Math.sin(
              (Math.PI * (time - PULSE_START)) / (PULSE_END - PULSE_START),
            )
        : 1;
    if (axis === "y") {
      group.current.scale.y = pulse;
    } else {
      group.current.scale.z = pulse;
    }
  });

  return (
    <group ref={group} position={position}>
      <VectorArrow
        origin={ORIGIN}
        direction={axis === "y" ? UP : FORWARD}
        length={0.09}
        color={DIAGRAM_COLORS.friction}
        thickness={0.016}
      />
    </group>
  );
}

/**
 * Disque du pavage : il s'allume à son tour pendant la phase de comptage, ce
 * qui laisse au joueur le temps de dénombrer combien de petites surfaces
 * tiennent dans la grande.
 */
function PavingTile({
  position,
  radius,
  index,
  total,
}: {
  position: Vec3;
  radius: number;
  index: number;
  total: number;
}) {
  const material = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!material.current) return;
    const time = clock.elapsedTime % CYCLE;
    const reveal =
      time >= PULSE_START && time < RELEASE_START
        ? (time - PULSE_START) / (RELEASE_START - PULSE_START)
        : 0;
    const lit = clamp(reveal * total - index, 0, 1);
    material.current.opacity = 0.12 + 0.68 * lit;
    material.current.emissiveIntensity = 0.15 + 0.75 * lit;
  });

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius * 0.94, 24]} />
      <meshStandardMaterial
        ref={material}
        color={DIAGRAM_COLORS.applied}
        emissive={DIAGRAM_COLORS.applied}
        emissiveIntensity={0.15}
        transparent
        opacity={0.12}
        side={DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Avancement de la course du petit piston, de 0 (repos) à 1 (enfoncé). */
function strokeProgress(time: number): number {
  if (time < STROKE_END) {
    return easeInOutSine(time / STROKE_END);
  }
  if (time < RELEASE_START) {
    return 1;
  }
  return 1 - easeInOutSine((time - RELEASE_START) / (CYCLE - RELEASE_START));
}

/** Accélération puis décélération symétriques, pour une course sans à-coup. */
function easeInOutSine(t: number): number {
  return 0.5 - Math.cos(Math.PI * clamp(t, 0, 1)) / 2;
}

/** Borne une valeur dans un intervalle. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
