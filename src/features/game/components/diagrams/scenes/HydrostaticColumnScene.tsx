"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BoxGeometry, Group, Mesh } from "three";

import { DIAGRAM_COLORS } from "@/features/game/components/diagrams/palette";
import { DiagramLabel } from "@/features/game/components/diagrams/primitives/DiagramLabel";
import { VectorArrow } from "@/features/game/components/diagrams/primitives/VectorArrow";
import type { DiagramSceneProps } from "@/features/game/components/diagrams/registry";
import type { Vec3 } from "@/types/game";

/** Durée d'un cycle complet d'animation, en secondes. */
const CYCLE = 5;
/** Fin de la montée de l'eau. */
const RISE_END = 2.2;
/** Début de la vidange. */
const FALL_START = 3.2;

/** Épaisseur des parois de la cuve. */
const WALL = 0.03;
/** Dimensions intérieures de la cuve principale. */
const TANK_WIDTH = 0.76;
const TANK_DEPTH = 0.6;
const TANK_HEIGHT = 1.35;
/** Abscisse de l'axe de la cuve principale. */
const MAIN_X = -0.78;
/** Altitude du fond intérieur, sur lequel repose la colonne d'eau. */
const FLOOR_Y = WALL;
/** Hauteurs d'eau extrêmes de l'animation. */
const WATER_MIN = 0.16;
const WATER_MAX = 1.2;
/** Longueur de la flèche de pression au fond, à hauteur d'eau maximale. */
const MAX_ARROW = 0.4;
/** Hauteur du départ des flèches au-dessus du fond, juste au-dessus du capteur. */
const ARROW_LIFT = 0.09;
/** Bassin fantôme : même hauteur d'eau, largeur très supérieure. */
const GHOST_X = 0.85;
const GHOST_WIDTH = 1.25;
/** Abscisse de la règle de profondeur, contre la paroi gauche. */
const RULER_X = -1.3;

const ORIGIN: Vec3 = [0, 0, 0];
const RIGHT: Vec3 = [1, 0, 0];
/** Profondeurs, en fraction de la hauteur d'eau, où la pression est figurée. */
const ARROW_FRACTIONS = [0.25, 0.5, 0.75, 1] as const;

/**
 * Schéma de la colonne d'eau : la pression au fond ne dépend que de la
 * profondeur. Les quatre flèches restent à tout instant proportionnelles à
 * leur profondeur sous la surface libre, et le bassin fantôme — bien plus
 * large, rempli à la même hauteur — reçoit exactement la même flèche au fond.
 * Aucune valeur de pression n'est affichée.
 */
export function HydrostaticColumnScene({ params }: DiagramSceneProps) {
  const tankWidthM = Number(params.tankWidthM ?? 1.2);
  const tankDepthM = Number(params.tankDepthM ?? 0.8);
  const depthLabel = String(params.depthLabel ?? "h");
  const liquidLabel = String(params.liquidLabel ?? "liquide");

  const tankEdges = useMemo(
    () =>
      new BoxGeometry(
        TANK_WIDTH + 2 * WALL,
        TANK_HEIGHT,
        TANK_DEPTH + 2 * WALL,
      ),
    [],
  );
  const ghostEdges = useMemo(
    () =>
      new BoxGeometry(
        GHOST_WIDTH + 2 * WALL,
        TANK_HEIGHT,
        TANK_DEPTH + 2 * WALL,
      ),
    [],
  );

  const sensor = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!sensor.current) return;
    const time = clock.elapsedTime % CYCLE;
    // Le capteur ne pulse que pendant le palier, quand la mesure est faite.
    const inPlateau = time >= RISE_END && time < FALL_START;
    const pulse = inPlateau
      ? 1 +
        0.12 * Math.sin((Math.PI * (time - RISE_END)) / (FALL_START - RISE_END))
      : 1;
    sensor.current.scale.set(pulse, 1, pulse);
  });

  return (
    <group>
      {/* Sol de la salle, simple assise visuelle des deux bassins. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 2.4]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.92}
          metalness={0.04}
        />
      </mesh>

      {/* Cuve principale : caisson de verre ouvert en haut et sur l'avant. */}
      <TankWalls />
      <lineSegments position={[MAIN_X, TANK_HEIGHT / 2, 0]}>
        <edgesGeometry args={[tankEdges]} />
        <lineBasicMaterial
          color={DIAGRAM_COLORS.object}
          transparent
          opacity={0.5}
          toneMapped={false}
        />
      </lineSegments>

      <WaterColumn x={MAIN_X} width={TANK_WIDTH - 0.02} opacity={0.55} />
      <FreeSurface x={MAIN_X} width={TANK_WIDTH - 0.02} opacity={0.35} />

      {/* Capteur posé au fond : c'est lui qui « lit » la pression cherchée. */}
      <mesh ref={sensor} position={[MAIN_X, FLOOR_Y + 0.025, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.05, 24]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.weight}
          emissive={DIAGRAM_COLORS.weight}
          emissiveIntensity={0.5}
          roughness={0.4}
          toneMapped={false}
        />
      </mesh>

      {/* Triangle de pression : la longueur croît linéairement avec la profondeur. */}
      {ARROW_FRACTIONS.map((fraction) => (
        <DepthPressureArrow
          key={fraction}
          x={MAIN_X - TANK_WIDTH / 2 + 0.02}
          fraction={fraction}
        />
      ))}
      <PressureSlope x={MAIN_X - TANK_WIDTH / 2 + 0.02} />

      {/* Règle de profondeur et son repère de remplissage. */}
      <mesh position={[RULER_X, TANK_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.012, TANK_HEIGHT, 0.012]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.guide}
          emissive={DIAGRAM_COLORS.guide}
          emissiveIntensity={0.3}
          toneMapped={false}
        />
      </mesh>
      {[0.2, 0.4, 0.6, 0.8, 1].map((step) => (
        <mesh key={step} position={[RULER_X + 0.04, step * TANK_HEIGHT, 0]}>
          <boxGeometry args={[0.07, 0.008, 0.012]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.guide}
            emissive={DIAGRAM_COLORS.guide}
            emissiveIntensity={0.3}
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh position={[RULER_X + 0.09, FLOOR_Y + WATER_MAX, 0]}>
        <boxGeometry args={[0.18, 0.01, 0.012]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.support}
          emissive={DIAGRAM_COLORS.support}
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>

      {/* Bassin fantôme : beaucoup plus large, même hauteur d'eau. */}
      <lineSegments position={[GHOST_X, TANK_HEIGHT / 2, 0]}>
        <edgesGeometry args={[ghostEdges]} />
        <lineBasicMaterial
          color={DIAGRAM_COLORS.guide}
          transparent
          opacity={0.4}
          toneMapped={false}
        />
      </lineSegments>
      <WaterColumn x={GHOST_X} width={GHOST_WIDTH} opacity={0.28} />
      <FreeSurface x={GHOST_X} width={GHOST_WIDTH} opacity={0.2} />
      <DepthPressureArrow
        x={GHOST_X - GHOST_WIDTH / 2 + 0.03}
        fraction={1}
        opacity={0.5}
      />

      <DiagramLabel
        position={[RULER_X - 0.2, FLOOR_Y + WATER_MAX / 2, 0]}
        tone="info"
      >
        {depthLabel}
      </DiagramLabel>
      <DiagramLabel
        position={[MAIN_X, WATER_MAX * 0.72, -TANK_DEPTH / 2 - 0.1]}
        tone="info"
      >
        {liquidLabel}
      </DiagramLabel>
      <DiagramLabel
        position={[MAIN_X, FLOOR_Y + 0.14, TANK_DEPTH / 2 + 0.18]}
        tone="warning"
      >
        capteur : p = ?
      </DiagramLabel>
      <DiagramLabel position={[MAIN_X, -0.14, TANK_DEPTH / 2 + 0.1]}>
        {`${formatMeters(tankWidthM)} × ${formatMeters(tankDepthM)}`}
      </DiagramLabel>
      <DiagramLabel position={[GHOST_X, TANK_HEIGHT + 0.16, 0]}>
        même hauteur → même pression
      </DiagramLabel>
    </group>
  );
}

/** Parois de la cuve : fond, arrière et deux côtés, l'avant restant ouvert. */
function TankWalls() {
  const outerWidth = TANK_WIDTH + 2 * WALL;
  const outerDepth = TANK_DEPTH + 2 * WALL;
  const sideX = (TANK_WIDTH + WALL) / 2;

  return (
    <group position={[MAIN_X, 0, 0]}>
      <mesh position={[0, WALL / 2, 0]}>
        <boxGeometry args={[outerWidth, WALL, outerDepth]} />
        <GlassMaterial />
      </mesh>
      <mesh position={[-sideX, TANK_HEIGHT / 2, 0]}>
        <boxGeometry args={[WALL, TANK_HEIGHT, outerDepth]} />
        <GlassMaterial />
      </mesh>
      <mesh position={[sideX, TANK_HEIGHT / 2, 0]}>
        <boxGeometry args={[WALL, TANK_HEIGHT, outerDepth]} />
        <GlassMaterial />
      </mesh>
      <mesh position={[0, TANK_HEIGHT / 2, -(TANK_DEPTH + WALL) / 2]}>
        <boxGeometry args={[outerWidth, TANK_HEIGHT, WALL]} />
        <GlassMaterial />
      </mesh>
    </group>
  );
}

/** Verre translucide des parois : il laisse lire la colonne d'eau au travers. */
function GlassMaterial() {
  return (
    <meshStandardMaterial
      color={DIAGRAM_COLORS.metal}
      roughness={0.15}
      metalness={0.1}
      transparent
      opacity={0.18}
      depthWrite={false}
    />
  );
}

/**
 * Colonne de liquide dont la hauteur suit l'animation. La géométrie reste une
 * boîte unitaire : seule l'échelle est modifiée, ce qui évite toute
 * reconstruction de géométrie à chaque image.
 */
function WaterColumn({
  x,
  width,
  opacity,
}: {
  x: number;
  width: number;
  opacity: number;
}) {
  const mesh = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const height = waterHeight(clock.elapsedTime % CYCLE);
    mesh.current.scale.y = height;
    mesh.current.position.y = FLOOR_Y + height / 2;
  });

  return (
    <mesh ref={mesh} position={[x, FLOOR_Y, 0]}>
      <boxGeometry args={[width, 1, TANK_DEPTH - 0.02]} />
      <meshStandardMaterial
        color={DIAGRAM_COLORS.fluid}
        emissive={DIAGRAM_COLORS.fluid}
        emissiveIntensity={0.25}
        roughness={0.2}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Surface libre du liquide : un plan clair animé d'un léger clapot. */
function FreeSurface({
  x,
  width,
  opacity,
}: {
  x: number;
  width: number;
  opacity: number;
}) {
  const mesh = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const time = clock.elapsedTime % CYCLE;
    const ripple = 0.008 * Math.sin(clock.elapsedTime * 3.2);
    mesh.current.position.y = FLOOR_Y + waterHeight(time) + 0.004 + ripple;
  });

  return (
    <mesh ref={mesh} position={[x, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, TANK_DEPTH - 0.02]} />
      <meshStandardMaterial
        color={DIAGRAM_COLORS.support}
        emissive={DIAGRAM_COLORS.support}
        emissiveIntensity={0.4}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * Flèche de pression à une profondeur donnée, exprimée en fraction de la
 * hauteur d'eau. Sa longueur reste à tout instant proportionnelle à cette
 * profondeur : c'est l'unique information portée par le schéma.
 */
function DepthPressureArrow({
  x,
  fraction,
  opacity = 1,
}: {
  x: number;
  fraction: number;
  opacity?: number;
}) {
  const group = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const height = waterHeight(clock.elapsedTime % CYCLE);
    group.current.position.y = FLOOR_Y + height * (1 - fraction) + ARROW_LIFT;
    // L'échelle en X allonge la flèche sans toucher à sa section.
    group.current.scale.x = Math.max((height / WATER_MAX) * fraction, 0.001);
  });

  return (
    <group ref={group} position={[x, FLOOR_Y, 0]}>
      <VectorArrow
        origin={ORIGIN}
        direction={RIGHT}
        length={MAX_ARROW}
        color={DIAGRAM_COLORS.support}
        thickness={0.026}
        opacity={opacity}
      />
    </group>
  );
}

/**
 * Droite qui joint les pointes des flèches : elle matérialise p ∝ h. Son
 * inclinaison est constante — les longueurs et la profondeur croissant
 * ensemble — seule sa longueur suit la hauteur d'eau.
 */
function PressureSlope({ x }: { x: number }) {
  const mesh = useRef<Mesh>(null);
  const tilt = Math.atan2(MAX_ARROW, WATER_MAX);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const height = waterHeight(clock.elapsedTime % CYCLE);
    const reach = MAX_ARROW * (height / WATER_MAX);
    mesh.current.position.x = x + reach / 2;
    mesh.current.position.y = FLOOR_Y + height / 2 + ARROW_LIFT;
    mesh.current.scale.y = Math.hypot(reach, height);
  });

  return (
    <mesh ref={mesh} position={[x, FLOOR_Y, 0]} rotation={[0, 0, tilt]}>
      <boxGeometry args={[0.01, 1, 0.01]} />
      <meshStandardMaterial
        color={DIAGRAM_COLORS.support}
        emissive={DIAGRAM_COLORS.support}
        emissiveIntensity={0.6}
        transparent
        opacity={0.7}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Hauteur d'eau à un instant du cycle : montée, palier de mesure, vidange. */
function waterHeight(time: number): number {
  const span = WATER_MAX - WATER_MIN;
  if (time < RISE_END) {
    return WATER_MIN + span * easeInOutSine(time / RISE_END);
  }
  if (time < FALL_START) {
    return WATER_MAX;
  }
  return (
    WATER_MAX - span * easeInOutSine((time - FALL_START) / (CYCLE - FALL_START))
  );
}

/** Accélération puis décélération symétriques, pour un remplissage sans à-coup. */
function easeInOutSine(t: number): number {
  return 0.5 - Math.cos(Math.PI * Math.min(Math.max(t, 0), 1)) / 2;
}

/** Met en forme une longueur en mètres à la française : « 1,20 m ». */
function formatMeters(value: number): string {
  return `${value.toFixed(2).replace(".", ",")} m`;
}
