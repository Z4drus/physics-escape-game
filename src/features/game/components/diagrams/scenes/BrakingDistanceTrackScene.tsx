"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import type { Group, MeshStandardMaterial } from "three";

import { DIAGRAM_COLORS } from "@/features/game/components/diagrams/palette";
import { DiagramLabel } from "@/features/game/components/diagrams/primitives/DiagramLabel";
import { VectorArrow } from "@/features/game/components/diagrams/primitives/VectorArrow";
import type { DiagramSceneProps } from "@/features/game/components/diagrams/registry";
import type { Vec3 } from "@/types/game";

/**
 * Lacet appliqué à toute la scène : il compense l'azimut de la caméra du cadre
 * ([3.6, 2.6, 4.8] visant [0, 0.55, 0]) pour présenter la piste de profil.
 * Tout le message tient dans la comparaison des espacements ; le balancement
 * de ±0,16 rad du cadre ne les raccourcit que d'environ 1 %.
 */
const LATERAL_YAW = Math.atan2(3.6, 4.8);

/** Échelle du schéma : 1 m d'asphalte occupe 0,058 unité de scène. */
const UNITS_PER_METRE = 0.058;
/** Demi-largeur de la chaussée et altitude du marquage au sol. */
const ROAD_HALF_WIDTH = 0.31;
const ROAD_Y = 0.005;
/** Longueur de la voiture : volontairement un peu forcée pour rester lisible. */
const CAR_LENGTH = 0.3;
/** Durée de la phase à vitesse constante rejouée avant le freinage. */
const CRUISE_SECONDS = 1;
/** Maintien de l'image finale, voiture à l'arrêt, avant la remise à zéro. */
const HOLD_SECONDS = 0.9;
/** Longueur de référence de la flèche de vitesse, étirée par `scale.y`. */
const ARROW_REFERENCE = 0.72;
/** Piqué expressif de la carrosserie pendant le freinage, en radians. */
const PITCH_RADIANS = -0.035;

/** Assiette du graphique v(t) adossé derrière la piste. */
const BAR_BASE_Y = 0.01;
const BAR_START_X = 0.3;
const BAR_STEP = 0.155;
const BAR_HEIGHT = 0.62;
const BAR_Z = -0.62;

/** Décalages [avant/arrière, gauche/droite] des quatre roues. */
const WHEEL_OFFSETS: readonly [number, number][] = [
  [-0.095, -0.072],
  [-0.095, 0.072],
  [0.095, -0.072],
  [0.095, 0.072],
];

/** Directions constantes, réutilisées telles quelles par les flèches. */
const FORWARD: Vec3 = [1, 0, 0];
const BACKWARD: Vec3 = [-1, 0, 0];
const UP: Vec3 = [0, 1, 0];

/** Une marque de chronophotographie déposée à un instant donné. */
interface TrackMarker {
  /** Instant de dépôt, en secondes depuis le début de la séquence. */
  time: number;
  /** Abscisse de scène de la marque. */
  x: number;
  /** Vitesse instantanée à cet instant, en m/s. */
  speed: number;
  /** Faux pendant la phase à vitesse constante. */
  braking: boolean;
}

/**
 * Schéma « distance de freinage » : une même piste porte d'abord un mouvement
 * rectiligne uniforme, puis un mouvement uniformément décéléré.
 *
 * La voiture dépose une marque toutes les `markerInterval` secondes. Avant la
 * ligne blanche, les marques sont équidistantes ; après, elles se resserrent
 * d'un écart constant à chaque intervalle — signature du MRUA décéléré, lisible
 * dans la même image que la phase uniforme. La distance de freinage cherchée
 * n'est jamais chiffrée : la double flèche porte un simple `Δx = ?` et aucune
 * borne kilométrique ne permet de la lire directement.
 */
export function BrakingDistanceTrackScene({ params }: DiagramSceneProps) {
  const speedKmH = Number(params.v0KmH ?? 72);
  const initialSpeed = Number(params.v0 ?? 20);
  const acceleration = Number(params.a ?? -5);
  const brakingDuration = Number(
    params.duree ?? initialSpeed / Math.abs(acceleration),
  );
  const brakingMetres = Number(
    params.distance ??
      (initialSpeed * initialSpeed) / (2 * Math.abs(acceleration)),
  );
  const markerInterval = Number(params.markerInterval ?? 0.5);

  const layout = useMemo(() => {
    const cruiseMetres = initialSpeed * CRUISE_SECONDS;
    const totalMetres = cruiseMetres + brakingMetres;
    const halfTrack = (totalMetres * UNITS_PER_METRE) / 2;
    const toSceneX = (metres: number) => metres * UNITS_PER_METRE - halfTrack;

    /** Position réelle, en mètres, à un instant de la séquence. */
    const positionAt = (time: number) => {
      if (time <= CRUISE_SECONDS) return initialSpeed * time;
      const braking = time - CRUISE_SECONDS;
      return (
        cruiseMetres +
        initialSpeed * braking +
        0.5 * acceleration * braking * braking
      );
    };

    /** Vitesse instantanée, bornée à zéro une fois la voiture arrêtée. */
    const speedAt = (time: number) => {
      if (time <= CRUISE_SECONDS) return initialSpeed;
      return Math.max(initialSpeed + acceleration * (time - CRUISE_SECONDS), 0);
    };

    const sequenceDuration = CRUISE_SECONDS + brakingDuration;
    const markerCount =
      Math.floor(sequenceDuration / markerInterval + 1e-6) + 1;
    const markers: TrackMarker[] = Array.from(
      { length: markerCount },
      (_, index) => {
        const time = index * markerInterval;
        return {
          time,
          x: toSceneX(positionAt(time)),
          speed: speedAt(time),
          braking: time > CRUISE_SECONDS + 1e-6,
        };
      },
    );

    // Une barre par instant de la phase de freinage : la rampe descend
    // rigoureusement en ligne droite jusqu'à zéro.
    const barCount = Math.floor(brakingDuration / markerInterval + 1e-6) + 1;
    const bars = Array.from({ length: barCount }, (_, index) => {
      const time = CRUISE_SECONDS + index * markerInterval;
      return { time, speed: speedAt(time) };
    });

    // Bandes discontinues de l'axe médian, réparties sur toute la piste.
    const dashCount = Math.floor((totalMetres * UNITS_PER_METRE) / 0.2);
    const dashes = Array.from(
      { length: dashCount },
      (_, index) => -halfTrack + 0.1 + index * 0.2,
    );

    const brakeLineX = toSceneX(cruiseMetres);
    const stopX = toSceneX(totalMetres);

    return {
      cruiseMetres,
      trackUnits: totalMetres * UNITS_PER_METRE,
      toSceneX,
      positionAt,
      speedAt,
      sequenceDuration,
      markers,
      bars,
      dashes,
      brakeLineX,
      stopX,
      skidLength: stopX - brakeLineX,
      arrowUnitsPerMps: ARROW_REFERENCE / initialSpeed,
      barUnitsPerMps: BAR_HEIGHT / initialSpeed,
      barLineLength: Math.hypot((barCount - 1) * BAR_STEP, BAR_HEIGHT),
      barLineAngle: Math.atan2(-BAR_HEIGHT, (barCount - 1) * BAR_STEP),
    };
  }, [
    acceleration,
    brakingDuration,
    brakingMetres,
    initialSpeed,
    markerInterval,
  ]);

  const car = useRef<Group>(null);
  const chassis = useRef<Group>(null);
  const arrow = useRef<Group>(null);
  const skid = useRef<Group>(null);
  const barLine = useRef<Group>(null);
  const lineMaterial = useRef<MeshStandardMaterial>(null);
  const markerRefs = useRef<(Group | null)[]>([]);
  const barRefs = useRef<(Group | null)[]>([]);
  /** Temps écoulé dans le cycle d'animation, en secondes. */
  const cycle = useRef(0);
  /** Chronomètre du freinage : il repart de zéro sur la ligne blanche. */
  const readout = useRef(0);
  /** Vitesse instantanée affichée au bout de la flèche. */
  const speedReadout = useRef(initialSpeed);

  const cycleDuration = layout.sequenceDuration + HOLD_SECONDS;

  useFrame((_, delta) => {
    const time = (cycle.current + delta) % cycleDuration;
    cycle.current = time;

    const runTime = Math.min(time, layout.sequenceDuration);
    const metres = layout.positionAt(runTime);
    const speed = layout.speedAt(runTime);
    const braking = runTime > CRUISE_SECONDS;

    readout.current = braking ? runTime - CRUISE_SECONDS : 0;
    speedReadout.current = speed;

    if (car.current) car.current.position.x = layout.toSceneX(metres);
    // Le piqué suit la décélération : maximal dès l'appui, nul à l'arrêt.
    if (chassis.current) {
      chassis.current.rotation.z = braking
        ? PITCH_RADIANS * (speed / initialSpeed)
        : 0;
    }
    if (arrow.current) {
      arrow.current.scale.y = Math.max(
        (speed * layout.arrowUnitsPerMps) / ARROW_REFERENCE,
        0.001,
      );
    }
    // Les traces de pneus s'allongent depuis la ligne blanche.
    if (skid.current) {
      const progress = (metres - layout.cruiseMetres) / brakingMetres;
      skid.current.scale.x = Math.min(Math.max(progress, 0.001), 1);
    }
    // Éclat unique de la ligne au moment du passage.
    if (lineMaterial.current) {
      const sinceLine = Math.abs(runTime - CRUISE_SECONDS);
      lineMaterial.current.emissiveIntensity =
        sinceLine < 0.35 ? 0.35 + (1 - sinceLine / 0.35) * 2.2 : 0.35;
    }

    for (let index = 0; index < layout.markers.length; index += 1) {
      const node = markerRefs.current[index];
      if (node) node.visible = runTime + 1e-6 >= layout.markers[index].time;
    }
    for (let index = 0; index < layout.bars.length; index += 1) {
      const bar = barRefs.current[index];
      if (bar) {
        const growth = (runTime - layout.bars[index].time) / 0.12;
        bar.scale.y = Math.min(Math.max(growth, 0.001), 1);
      }
    }
    if (barLine.current) {
      const progress = braking
        ? (runTime - CRUISE_SECONDS) / brakingDuration
        : 0;
      barLine.current.scale.x = Math.max(progress, 0.001);
    }
  });

  return (
    <group rotation-y={LATERAL_YAW}>
      {/* Accotement, puis chaussée */}
      <mesh position={[0, -0.006, -0.1]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3.9, 2.1]} />
        <meshStandardMaterial color={DIAGRAM_COLORS.structure} roughness={1} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[layout.trackUnits + 0.14, ROAD_HALF_WIDTH * 2]} />
        <meshStandardMaterial color={DIAGRAM_COLORS.guide} roughness={0.98} />
      </mesh>

      {/* Marquage : rives continues et axe médian discontinu */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[0, ROAD_Y, side * (ROAD_HALF_WIDTH - 0.02)]}
        >
          <boxGeometry args={[layout.trackUnits + 0.14, 0.004, 0.014]} />
          <meshStandardMaterial color={DIAGRAM_COLORS.object} roughness={0.7} />
        </mesh>
      ))}
      {layout.dashes.map((x) => (
        <mesh key={x} position={[x, ROAD_Y, 0]}>
          <boxGeometry args={[0.08, 0.004, 0.012]} />
          <meshStandardMaterial color={DIAGRAM_COLORS.object} roughness={0.8} />
        </mesh>
      ))}

      {/* Ligne blanche du début du freinage */}
      <mesh position={[layout.brakeLineX, ROAD_Y + 0.002, 0]}>
        <boxGeometry args={[0.022, 0.006, ROAD_HALF_WIDTH * 2]} />
        <meshStandardMaterial
          ref={lineMaterial}
          color={DIAGRAM_COLORS.object}
          emissive={DIAGRAM_COLORS.object}
          emissiveIntensity={0.35}
          toneMapped={false}
        />
      </mesh>

      {/* Traces de pneus, allongées depuis la ligne */}
      <group
        ref={skid}
        position={[layout.brakeLineX, ROAD_Y + 0.001, 0]}
        scale={[0.001, 1, 1]}
      >
        {[-1, 1].map((side) => (
          <mesh key={side} position={[layout.skidLength / 2, 0, side * 0.072]}>
            <boxGeometry args={[layout.skidLength, 0.004, 0.026]} />
            <meshStandardMaterial
              color={DIAGRAM_COLORS.structure}
              roughness={1}
            />
          </mesh>
        ))}
      </group>

      {/* Chronophotographie : barre en travers de la chaussée + plot d'accotement */}
      {layout.markers.map((marker, index) => (
        <group
          key={marker.time}
          ref={(node) => {
            markerRefs.current[index] = node;
          }}
          position={[marker.x, 0, 0]}
          visible={false}
        >
          <mesh position={[0, ROAD_Y + 0.004, 0]}>
            <boxGeometry args={[0.016, 0.006, ROAD_HALF_WIDTH * 2]} />
            <meshStandardMaterial
              color={
                marker.braking
                  ? DIAGRAM_COLORS.friction
                  : DIAGRAM_COLORS.support
              }
              emissive={
                marker.braking
                  ? DIAGRAM_COLORS.friction
                  : DIAGRAM_COLORS.support
              }
              emissiveIntensity={0.55}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0.035, ROAD_HALF_WIDTH + 0.05]}>
            <boxGeometry args={[0.018, 0.07, 0.018]} />
            <meshStandardMaterial
              color={
                marker.braking
                  ? DIAGRAM_COLORS.friction
                  : DIAGRAM_COLORS.support
              }
              emissive={
                marker.braking
                  ? DIAGRAM_COLORS.friction
                  : DIAGRAM_COLORS.support
              }
              emissiveIntensity={0.4}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* Voiture : carrosserie, habitacle, roues, flèche et étiquettes */}
      <group ref={car} position={[layout.toSceneX(0), 0, 0]}>
        <group ref={chassis}>
          <mesh position={[0, 0.062, 0]}>
            <boxGeometry args={[CAR_LENGTH, 0.075, 0.135]} />
            <meshStandardMaterial color={DIAGRAM_COLORS.hot} roughness={0.35} />
          </mesh>
          <mesh position={[-0.022, 0.125, 0]}>
            <boxGeometry args={[0.14, 0.055, 0.12]} />
            <meshStandardMaterial
              color={DIAGRAM_COLORS.structure}
              roughness={0.25}
              metalness={0.4}
            />
          </mesh>
        </group>
        {WHEEL_OFFSETS.map(([front, side]) => (
          <mesh
            key={`${front}:${side}`}
            position={[front, 0.028, side]}
            rotation-x={Math.PI / 2}
          >
            <cylinderGeometry args={[0.028, 0.028, 0.022, 14]} />
            <meshStandardMaterial
              color={DIAGRAM_COLORS.structure}
              roughness={0.85}
            />
          </mesh>
        ))}
        {/* Flèche de vitesse : dirigée vers +x, allongée par `scale.y` */}
        <group
          ref={arrow}
          position={[CAR_LENGTH / 2, 0.18, 0]}
          rotation-z={-Math.PI / 2}
        >
          <VectorArrow
            origin={[0, 0, 0]}
            direction={UP}
            length={ARROW_REFERENCE}
            color={DIAGRAM_COLORS.velocity}
            thickness={0.024}
          />
        </group>
        <LiveLabel
          position={[0, 0.88, 0.05]}
          valueRef={readout}
          initialValue={0}
          decimals={1}
          prefix="t = "
          suffix=" s"
        />
        <LiveLabel
          position={[0.38, 0.4, 0.05]}
          valueRef={speedReadout}
          initialValue={initialSpeed}
          decimals={1}
          prefix="v = "
          suffix=" m/s"
          tone="accent"
        />
      </group>

      {/* Double flèche de la distance de freinage : cotée `?`, jamais chiffrée */}
      <VectorArrow
        origin={[(layout.brakeLineX + layout.stopX) / 2, 0.02, 0.52]}
        direction={FORWARD}
        length={layout.skidLength / 2}
        color={DIAGRAM_COLORS.guide}
        thickness={0.014}
      />
      <VectorArrow
        origin={[(layout.brakeLineX + layout.stopX) / 2, 0.02, 0.52]}
        direction={BACKWARD}
        length={layout.skidLength / 2}
        color={DIAGRAM_COLORS.guide}
        thickness={0.014}
      />

      {/* Graphique v(t) du freinage : une rampe rectiligne jusqu'à zéro */}
      <mesh
        position={[
          BAR_START_X + ((layout.bars.length - 1) * BAR_STEP) / 2,
          BAR_BASE_Y,
          BAR_Z,
        ]}
      >
        <boxGeometry
          args={[(layout.bars.length - 1) * BAR_STEP + 0.2, 0.012, 0.012]}
        />
        <meshStandardMaterial color={DIAGRAM_COLORS.object} roughness={0.6} />
      </mesh>
      {layout.bars.map((bar, index) => {
        const height = Math.max(bar.speed * layout.barUnitsPerMps, 0.006);
        return (
          <group
            key={bar.time}
            ref={(node) => {
              barRefs.current[index] = node;
            }}
            position={[BAR_START_X + index * BAR_STEP, BAR_BASE_Y, BAR_Z]}
            scale={[1, 0.001, 1]}
          >
            <mesh position={[0, height / 2, 0]}>
              <boxGeometry args={[0.09, height, 0.09]} />
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
        position={[BAR_START_X, BAR_BASE_Y + BAR_HEIGHT, BAR_Z + 0.07]}
        rotation-z={layout.barLineAngle}
        scale={[0.001, 1, 1]}
      >
        <mesh position={[layout.barLineLength / 2, 0, 0]}>
          <boxGeometry args={[layout.barLineLength, 0.016, 0.016]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.velocity}
            emissive={DIAGRAM_COLORS.velocity}
            emissiveIntensity={0.8}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Étiquettes : les données de l'énoncé, la distance restant inconnue */}
      <DiagramLabel position={[-1.42, 1.42, 0.3]} tone="info">
        {formatDecimal(speedKmH, 0)} km/h = {formatDecimal(initialSpeed, 0)} m/s
      </DiagramLabel>
      <DiagramLabel position={[0.95, 1.42, 0.3]} tone="warning">
        a = −{formatDecimal(Math.abs(acceleration), 1)} m/s²
      </DiagramLabel>
      <DiagramLabel position={[-1.45, 0.05, 0.6]}>
        1 marque toutes les {formatDecimal(markerInterval, 1)} s
      </DiagramLabel>
      <DiagramLabel
        position={[(layout.brakeLineX + layout.stopX) / 2, 0.05, 0.72]}
        tone="accent"
      >
        Δx = ?
      </DiagramLabel>
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
