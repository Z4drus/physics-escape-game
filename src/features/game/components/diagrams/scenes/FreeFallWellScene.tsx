"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import type { Group, Mesh, MeshStandardMaterial } from "three";

import { DIAGRAM_COLORS } from "@/features/game/components/diagrams/palette";
import { DiagramLabel } from "@/features/game/components/diagrams/primitives/DiagramLabel";
import { VectorArrow } from "@/features/game/components/diagrams/primitives/VectorArrow";
import type { DiagramSceneProps } from "@/features/game/components/diagrams/registry";
import type { Vec3 } from "@/types/game";

/**
 * Lacet appliqué à toute la scène : il compense l'azimut de la caméra du cadre
 * ([3.6, 2.6, 4.8] visant [0, 0.55, 0]) pour présenter la coupe du puits de
 * face. Le balancement de ±0,16 rad du cadre conserve alors les écarts
 * verticaux entre les marques, qui sont toute l'information du schéma.
 */
const LATERAL_YAW = Math.atan2(3.6, 4.8);

/** Altitude de la margelle et du plan d'eau : la chute occupe 1,54 unité. */
const WELL_TOP_Y = 1.7;
const WATER_Y = 0.16;
const FALL_UNITS = WELL_TOP_Y - WATER_Y;
/** Axe du puits, décalé à gauche pour laisser la place au graphique v(t). */
const WELL_X = -0.72;
/** Demi-largeur intérieure du fût, face avant ouverte vers la caméra. */
const SHAFT_HALF_WIDTH = 0.34;
/** Profondeur de la paroi arrière, sur laquelle sont tracées les marques. */
const BACK_WALL_Z = -0.29;
/** Rayon de la bille d'acier. */
const BALL_RADIUS = 0.075;

/** Ralenti : la chute réelle est jouée 2,5 fois plus lentement. */
const SLOW_MOTION = 2.5;
/** Durée de l'onde d'impact, puis du maintien de l'image finale. */
const IMPACT_SECONDS = 0.65;
const HOLD_SECONDS = 0.9;

/** Longueur de référence de la flèche de vitesse, étirée par `scale.y`. */
const ARROW_REFERENCE = 0.56;

/** Assiette du graphique v(t) : base, pas horizontal et profondeur. */
const BAR_BASE_Y = WATER_Y;
const BAR_START_X = 0.26;
const BAR_STEP = 0.2;
const BAR_HEIGHT = 0.9;
const BAR_Z = -0.25;

/** Directions constantes, réutilisées telles quelles par les flèches. */
const DOWN: Vec3 = [0, -1, 0];
const UP: Vec3 = [0, 1, 0];

/** Une position de la bille figée à un instant multiple de l'intervalle. */
interface FallMarker {
  /** Instant réel du dépôt, en secondes. */
  time: number;
  /** Altitude de scène de la marque. */
  y: number;
  /** Vitesse instantanée à cet instant, en m/s. */
  speed: number;
}

/**
 * Schéma « chute libre dans un puits » : chronophotographie à intervalle de
 * temps constant et graphique v(t) en barres.
 *
 * La bille part sans vitesse initiale et laisse une marque toutes les
 * `markerInterval` secondes : les écarts successifs suivent la série
 * 1 : 3 : 5 : 7 : 9 : 11, signature du mouvement uniformément accéléré. Les
 * assises de pierre, elles, restent régulières en distance et servent de
 * référence. La profondeur cherchée n'est jamais chiffrée : la double flèche
 * du bord gauche porte un simple `h = ?`.
 */
export function FreeFallWellScene({ params }: DiagramSceneProps) {
  const gravity = Number(params.g ?? 9.81);
  const fallDuration = Number(params.t ?? 1.5);
  const depthMetres = Number(params.h ?? 0.5 * gravity * fallDuration ** 2);
  const finalSpeed = Number(params.vFinale ?? gravity * fallDuration);
  const markerInterval = Number(params.markerInterval ?? 0.25);

  const layout = useMemo(() => {
    const unitsPerMetre = FALL_UNITS / depthMetres;
    const markerCount = Math.floor(fallDuration / markerInterval + 1e-6) + 1;
    const markers: FallMarker[] = Array.from(
      { length: markerCount },
      (_, index) => {
        const time = index * markerInterval;
        return {
          time,
          y: WELL_TOP_Y - 0.5 * gravity * time * time * unitsPerMetre,
          speed: gravity * time,
        };
      },
    );

    // Assises de pierre tous les 2 m : un rythme régulier en distance, à
    // opposer au rythme régulier en temps des marques.
    const courseCount = Math.floor(depthMetres / 2) + 1;
    const courses = Array.from(
      { length: courseCount },
      (_, index) => WELL_TOP_Y - index * 2 * unitsPerMetre,
    );

    const unitsPerMps = BAR_HEIGHT / finalSpeed;
    const barLineLength = Math.hypot(
      (markerCount - 1) * BAR_STEP,
      BAR_HEIGHT * (markers[markerCount - 1].speed / finalSpeed),
    );
    const barLineAngle = Math.atan2(
      BAR_HEIGHT * (markers[markerCount - 1].speed / finalSpeed),
      (markerCount - 1) * BAR_STEP,
    );

    return {
      unitsPerMetre,
      markers,
      courses,
      unitsPerMps,
      barLineLength,
      barLineAngle,
      /** Facteur qui convertit une vitesse en longueur de flèche. */
      arrowUnitsPerMps: ARROW_REFERENCE / finalSpeed,
    };
  }, [depthMetres, fallDuration, finalSpeed, gravity, markerInterval]);

  const ball = useRef<Group>(null);
  const arrow = useRef<Group>(null);
  const ripple = useRef<Mesh>(null);
  const rippleMaterial = useRef<MeshStandardMaterial>(null);
  const barRefs = useRef<(Group | null)[]>([]);
  const markerRefs = useRef<(Group | null)[]>([]);
  const barLine = useRef<Group>(null);
  /** Temps écoulé dans le cycle d'animation, en secondes de scène. */
  const cycle = useRef(0);
  /** Chronomètre affiché : le temps réel de la chute, pas le temps de scène. */
  const readout = useRef(0);
  /** Vitesse instantanée affichée par l'étiquette de la flèche. */
  const speedReadout = useRef(0);

  const fallSceneDuration = fallDuration * SLOW_MOTION;
  const cycleDuration = fallSceneDuration + IMPACT_SECONDS + HOLD_SECONDS;

  useFrame((_, delta) => {
    const time = (cycle.current + delta) % cycleDuration;
    cycle.current = time;

    const realTime = Math.min(time / SLOW_MOTION, fallDuration);
    const speed = gravity * realTime;
    readout.current = realTime;
    speedReadout.current = speed;

    if (ball.current) {
      ball.current.position.y =
        WELL_TOP_Y - 0.5 * gravity * realTime * realTime * layout.unitsPerMetre;
    }
    // La flèche est étirée depuis sa longueur de référence : la boucle ne
    // reconstruit aucune géométrie et n'alloue donc rien.
    if (arrow.current) {
      arrow.current.scale.y = Math.max(
        (speed * layout.arrowUnitsPerMps) / ARROW_REFERENCE,
        0.001,
      );
    }

    for (let index = 0; index < layout.markers.length; index += 1) {
      const node = markerRefs.current[index];
      if (node) node.visible = realTime + 1e-6 >= layout.markers[index].time;

      // Chaque barre pousse au moment exact où sa marque est déposée.
      const bar = barRefs.current[index];
      if (bar) {
        const growth = (realTime - layout.markers[index].time) / 0.06;
        bar.scale.y = Math.min(Math.max(growth, 0.001), 1);
      }
    }
    if (barLine.current) {
      barLine.current.scale.x = Math.max(realTime / fallDuration, 0.001);
    }

    // Onde circulaire à la surface de l'eau, juste après l'impact.
    const sinceImpact = time - fallSceneDuration;
    const splashing = sinceImpact >= 0 && sinceImpact < IMPACT_SECONDS;
    if (ripple.current) {
      ripple.current.visible = splashing;
      if (splashing) {
        const progress = sinceImpact / IMPACT_SECONDS;
        const spread = 0.5 + progress * 2.4;
        ripple.current.scale.set(spread, 1, spread);
      }
    }
    if (rippleMaterial.current && splashing) {
      rippleMaterial.current.opacity =
        0.75 * (1 - sinceImpact / IMPACT_SECONDS);
    }
  });

  return (
    <group rotation-y={LATERAL_YAW}>
      {/* Fût du puits en coupe : paroi arrière et deux joues latérales */}
      <mesh position={[WELL_X, (WELL_TOP_Y + 0.06) / 2, BACK_WALL_Z - 0.05]}>
        <boxGeometry args={[SHAFT_HALF_WIDTH * 2, WELL_TOP_Y - 0.06, 0.1]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.95}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[
            WELL_X + side * (SHAFT_HALF_WIDTH + 0.05),
            (WELL_TOP_Y + 0.06) / 2,
            0,
          ]}
        >
          <boxGeometry args={[0.1, WELL_TOP_Y - 0.06, 0.7]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.structure}
            roughness={0.95}
          />
        </mesh>
      ))}
      {/* Fond du puits et sol de part et d'autre de la margelle */}
      <mesh position={[WELL_X, 0.03, 0]}>
        <boxGeometry args={[SHAFT_HALF_WIDTH * 2 + 0.2, 0.06, 0.7]} />
        <meshStandardMaterial color={DIAGRAM_COLORS.structure} roughness={1} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[WELL_X + side * 0.72, WELL_TOP_Y - 0.03, 0]}
        >
          <boxGeometry args={[0.6, 0.06, 0.7]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.structure}
            roughness={1}
          />
        </mesh>
      ))}

      {/* Assises de pierre : le repère régulier en distance */}
      {layout.courses.map((y) => (
        <mesh key={y} position={[WELL_X, y, BACK_WALL_Z + 0.005]}>
          <boxGeometry args={[SHAFT_HALF_WIDTH * 2 - 0.02, 0.012, 0.012]} />
          <meshStandardMaterial color={DIAGRAM_COLORS.guide} roughness={0.9} />
        </mesh>
      ))}

      {/* Margelle */}
      <mesh position={[WELL_X, WELL_TOP_Y + 0.03, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.44, 0.055, 10, 32]} />
        <meshStandardMaterial color={DIAGRAM_COLORS.guide} roughness={0.85} />
      </mesh>

      {/* Eau du fond et onde d'impact */}
      <mesh position={[WELL_X, WATER_Y - 0.01, 0]}>
        <cylinderGeometry args={[0.33, 0.33, 0.02, 24]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.fluid}
          roughness={0.15}
          metalness={0.35}
        />
      </mesh>
      <mesh
        ref={ripple}
        position={[WELL_X, WATER_Y + 0.012, 0]}
        rotation-x={Math.PI / 2}
        visible={false}
      >
        <torusGeometry args={[0.1, 0.016, 8, 28]} />
        <meshStandardMaterial
          ref={rippleMaterial}
          color={DIAGRAM_COLORS.support}
          emissive={DIAGRAM_COLORS.support}
          emissiveIntensity={0.7}
          transparent
          opacity={0.7}
          toneMapped={false}
        />
      </mesh>

      {/* Chronophotographie : trait sur la paroi et bille fantôme */}
      {layout.markers.map((marker, index) => (
        <group
          key={marker.time}
          ref={(node) => {
            markerRefs.current[index] = node;
          }}
          position={[WELL_X, marker.y, 0]}
          visible={false}
        >
          <mesh position={[0, 0, BACK_WALL_Z + 0.012]}>
            <boxGeometry args={[SHAFT_HALF_WIDTH * 2 - 0.06, 0.01, 0.02]} />
            <meshStandardMaterial
              color={DIAGRAM_COLORS.friction}
              emissive={DIAGRAM_COLORS.friction}
              emissiveIntensity={0.55}
              toneMapped={false}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[BALL_RADIUS * 0.78, 16, 16]} />
            <meshStandardMaterial
              color={DIAGRAM_COLORS.object}
              transparent
              opacity={0.22}
              roughness={0.5}
            />
          </mesh>
        </group>
      ))}

      {/* Bille d'acier, sa flèche de vitesse et son étiquette */}
      <group ref={ball} position={[WELL_X, WELL_TOP_Y, 0]}>
        <mesh>
          <sphereGeometry args={[BALL_RADIUS, 32, 24]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.metal}
            roughness={0.2}
            metalness={0.9}
          />
        </mesh>
        {/* Orientée vers le bas par la rotation, allongée par `scale.y`. */}
        <group
          ref={arrow}
          position={[0, -BALL_RADIUS, 0]}
          rotation-z={Math.PI}
          scale={[1, 0.001, 1]}
        >
          <VectorArrow
            origin={[0, 0, 0]}
            direction={UP}
            length={ARROW_REFERENCE}
            color={DIAGRAM_COLORS.velocity}
            thickness={0.026}
          />
        </group>
        <LiveLabel
          position={[0.46, -0.16, 0.15]}
          valueRef={speedReadout}
          initialValue={0}
          decimals={1}
          prefix="v = "
          suffix=" m/s"
          tone="accent"
        />
      </group>

      {/* Double flèche de la profondeur cherchée : cotée `?`, jamais chiffrée */}
      <VectorArrow
        origin={[WELL_X - 0.56, (WELL_TOP_Y + WATER_Y) / 2, 0.28]}
        direction={UP}
        length={FALL_UNITS / 2}
        color={DIAGRAM_COLORS.guide}
        thickness={0.014}
      />
      <VectorArrow
        origin={[WELL_X - 0.56, (WELL_TOP_Y + WATER_Y) / 2, 0.28]}
        direction={DOWN}
        length={FALL_UNITS / 2}
        color={DIAGRAM_COLORS.guide}
        thickness={0.014}
      />

      {/* Graphique v(t) : une barre par marque, sommets alignés sur une droite */}
      <mesh position={[BAR_START_X - 0.08, BAR_BASE_Y + BAR_HEIGHT / 2, BAR_Z]}>
        <boxGeometry args={[0.014, BAR_HEIGHT + 0.14, 0.014]} />
        <meshStandardMaterial color={DIAGRAM_COLORS.object} roughness={0.6} />
      </mesh>
      <mesh
        position={[
          BAR_START_X + ((layout.markers.length - 1) * BAR_STEP) / 2,
          BAR_BASE_Y,
          BAR_Z,
        ]}
      >
        <boxGeometry
          args={[(layout.markers.length - 1) * BAR_STEP + 0.24, 0.014, 0.014]}
        />
        <meshStandardMaterial color={DIAGRAM_COLORS.object} roughness={0.6} />
      </mesh>
      {layout.markers.map((marker, index) => {
        const height = Math.max(marker.speed * layout.unitsPerMps, 0.008);
        return (
          <group
            key={marker.time}
            ref={(node) => {
              barRefs.current[index] = node;
            }}
            position={[BAR_START_X + index * BAR_STEP, BAR_BASE_Y, BAR_Z]}
            scale={[1, 0.001, 1]}
          >
            <mesh position={[0, height / 2, 0]}>
              <boxGeometry args={[0.11, height, 0.11]} />
              <meshStandardMaterial
                color={DIAGRAM_COLORS.velocity}
                emissive={DIAGRAM_COLORS.velocity}
                emissiveIntensity={0.35}
                roughness={0.4}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
      <group
        ref={barLine}
        position={[BAR_START_X, BAR_BASE_Y, BAR_Z + 0.09]}
        rotation-z={layout.barLineAngle}
        scale={[0.001, 1, 1]}
      >
        <mesh position={[layout.barLineLength / 2, 0, 0]}>
          <boxGeometry args={[layout.barLineLength, 0.018, 0.018]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.velocity}
            emissive={DIAGRAM_COLORS.velocity}
            emissiveIntensity={0.8}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Étiquettes : les données de l'énoncé, la profondeur restant inconnue */}
      <LiveLabel
        position={[-1.55, 1.5, 0.25]}
        valueRef={readout}
        initialValue={0}
        decimals={2}
        prefix="t = "
        suffix=" s"
      />
      <DiagramLabel position={[-1.55, 0.93, 0.28]} tone="accent">
        h = ?
      </DiagramLabel>
      <DiagramLabel position={[-1.55, 0.46, 0.35]} tone="warning">
        g = {formatDecimal(gravity, 2)} m/s²
      </DiagramLabel>
      <DiagramLabel position={[-1.55, 0.04, 0.42]}>
        1 marque toutes les {formatDecimal(markerInterval, 2)} s
      </DiagramLabel>
      <DiagramLabel position={[1.05, 1.34, BAR_Z]}>v = g · t</DiagramLabel>
    </group>
  );
}

/** Écrit un nombre à la française, avec la virgule comme séparateur. */
function formatDecimal(value: number, decimals: number): string {
  return value.toFixed(decimals).replace(".", ",");
}

/**
 * Étiquette dont la valeur suit une grandeur mise à jour à chaque frame.
 *
 * Le composant est isolé pour que seul son propre rendu soit relancé, et il
 * ne se redessine qu'au changement de la valeur arrondie : la boucle
 * d'animation n'alloue donc rien, pas même une chaîne de caractères.
 */
function LiveLabel({
  position,
  valueRef,
  initialValue,
  decimals,
  prefix,
  suffix,
  tone = "neutral",
}: {
  position: Vec3;
  valueRef: { current: number };
  /** Valeur affichée au premier rendu, avant la première frame d.animation. */
  initialValue: number;
  decimals: number;
  prefix: string;
  suffix: string;
  tone?: "neutral" | "accent" | "warning" | "danger" | "info";
}) {
  const step = 10 ** decimals;
  const [rounded, setRounded] = useState(() => Math.round(initialValue * step));

  useFrame(() => {
    const next = Math.round(valueRef.current * step);
    if (next !== rounded) setRounded(next);
  });

  return (
    <DiagramLabel position={position} tone={tone}>
      {prefix}
      {formatDecimal(rounded / step, decimals)}
      {suffix}
    </DiagramLabel>
  );
}
