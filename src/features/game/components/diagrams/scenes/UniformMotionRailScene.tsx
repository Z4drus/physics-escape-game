"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import type { Group, Mesh } from "three";

import { DIAGRAM_COLORS } from "@/features/game/components/diagrams/palette";
import { DiagramLabel } from "@/features/game/components/diagrams/primitives/DiagramLabel";
import { VectorArrow } from "@/features/game/components/diagrams/primitives/VectorArrow";
import type { DiagramSceneProps } from "@/features/game/components/diagrams/registry";
import type { Vec3 } from "@/types/game";

/**
 * Lacet appliqué à toute la scène.
 *
 * La caméra du cadre est fixée en [3.6, 2.6, 4.8] et vise [0, 0.55, 0] :
 * tourner le décor de cet azimut place le rail perpendiculairement à l'axe de
 * visée, donc vu de profil. Le balancement de ±0,16 rad imposé par
 * `DiagramViewer` ne raccourcit alors les espacements que d'environ 1 %, ce
 * qui préserve la lecture de la chronophotographie tout en gardant le relief
 * d'une vue de trois quarts (la caméra reste 19° au-dessus de l'horizon).
 */
const LATERAL_YAW = Math.atan2(3.6, 4.8);

/** Échelle du schéma : 1 m de rail réel occupe 0,9 unité de scène. */
const UNITS_PER_METRE = 0.9;
/** Hauteur du plateau du rail, sur lequel glisse le mobile. */
const RAIL_TOP_Y = 0.145;
/** Hauteur du centre du mobile au-dessus du sol. */
const MOBILE_Y = RAIL_TOP_Y + 0.1;
/** Profondeur de la rangée de disques de chronophotographie, devant le rail. */
const MARKER_Z = 0.42;
/** Durée de maintien de l'image finale avant la remise à zéro. */
const HOLD_SECONDS = 1.2;
/** Longueur de la flèche de vitesse, en unités de scène par m/s. */
const ARROW_UNITS_PER_MPS = 1.25;

/** Largeur et hauteur utiles du graphique x(t) adossé au rail. */
const GRAPH_WIDTH = 1.5;
const GRAPH_HEIGHT = 0.88;
/** Origine des axes du graphique, dans le repère de la scène. */
const GRAPH_ORIGIN_X = -1.22;
const GRAPH_ORIGIN_Y = 0.75;
/** Profondeur du panneau, puis des tracés posés juste devant lui. */
const GRAPH_Z = -0.8;
const GRAPH_LINE_Z = GRAPH_Z + 0.04;

/** Direction constante de la flèche de vitesse : le mouvement est en +x. */
const ARROW_DIRECTION: Vec3 = [1, 0, 0];

/** Une marque de chronophotographie déposée à un instant donné. */
interface RailMarker {
  /** Instant de dépôt, en secondes de l'énoncé. */
  time: number;
  /** Abscisse de scène correspondante. */
  x: number;
  /** Vrai pour les deux instants cités par la question. */
  highlighted: boolean;
}

/**
 * Schéma « MRU sur rail à coussin d'air » : chronophotographie à intervalle de
 * temps constant, doublée du graphique x(t) que la question demande de lire.
 *
 * Le mobile glisse à vitesse rigoureusement constante et dépose une marque
 * toutes les `markerInterval` secondes : les marques sont donc équidistantes,
 * signature visuelle du mouvement rectiligne uniforme. La vitesse cherchée
 * n'est jamais écrite — la flèche porte un `v = ?` et seules les deux
 * positions de l'énoncé sont chiffrées.
 */
export function UniformMotionRailScene({ params }: DiagramSceneProps) {
  const x1 = Number(params.x1 ?? 0.8);
  const t1 = Number(params.t1 ?? 1);
  const x2 = Number(params.x2 ?? 3.2);
  const t2 = Number(params.t2 ?? 5);
  const speed = Number(params.v ?? 0.6);
  const railLength = Number(params.railLength ?? 3.6);
  const markerInterval = Number(params.markerInterval ?? 1);

  const layout = useMemo(() => {
    const railUnits = railLength * UNITS_PER_METRE;
    const halfTrack = railUnits / 2;
    const toSceneX = (metres: number) => metres * UNITS_PER_METRE - halfTrack;
    // Le mobile entre déjà lancé : on remonte à sa position à t = 0 s.
    const startMetres = x1 - speed * t1;

    const markerCount = Math.floor(t2 / markerInterval + 1e-6) + 1;
    const markers: RailMarker[] = Array.from(
      { length: markerCount },
      (_, index) => {
        const time = index * markerInterval;
        return {
          time,
          x: toSceneX(startMetres + speed * time),
          highlighted: Math.abs(time - t1) < 1e-6 || Math.abs(time - t2) < 1e-6,
        };
      },
    );

    // Graduations du rail : un trait fin tous les 20 cm, épais tous les mètres.
    const tickStep = 0.2;
    const tickCount = Math.round(railLength / tickStep) + 1;
    const ticks = Array.from({ length: tickCount }, (_, index) => {
      const metres = index * tickStep;
      return {
        x: toSceneX(metres),
        major: Math.abs(metres - Math.round(metres)) < 1e-6,
      };
    });

    // Repère du graphique : une seconde et un mètre valent la même surface
    // utile, ce qui donne à la droite x(t) une pente franchement lisible.
    const maxPositionMetres = x2 * 1.12;
    const unitsPerSecond = GRAPH_WIDTH / t2;
    const unitsPerMetre = GRAPH_HEIGHT / maxPositionMetres;
    const graphX = (time: number) => GRAPH_ORIGIN_X + time * unitsPerSecond;
    const graphY = (metres: number) => GRAPH_ORIGIN_Y + metres * unitsPerMetre;

    const curveStartX = graphX(0);
    const curveStartY = graphY(startMetres);
    const curveEndX = graphX(t2);
    const curveEndY = graphY(x2);

    const secondLines = Array.from({ length: Math.floor(t2) }, (_, index) =>
      graphX(index + 1),
    );
    const metreLines = Array.from(
      { length: Math.floor(maxPositionMetres / 0.5) },
      (_, index) => graphY((index + 1) * 0.5),
    );

    return {
      railUnits,
      markers,
      ticks,
      startMetres,
      graphX,
      graphY,
      curveStartX,
      curveStartY,
      curveLength: Math.hypot(curveEndX - curveStartX, curveEndY - curveStartY),
      curveAngle: Math.atan2(curveEndY - curveStartY, curveEndX - curveStartX),
      secondLines,
      metreLines,
      point1X: graphX(t1),
      point1Y: graphY(x1),
      point2X: curveEndX,
      point2Y: curveEndY,
    };
  }, [markerInterval, railLength, speed, t1, t2, x1, x2]);

  const mobile = useRef<Group>(null);
  const curve = useRef<Group>(null);
  const cursor = useRef<Mesh>(null);
  const markerRefs = useRef<(Group | null)[]>([]);
  /** Temps écoulé dans le cycle d'animation, en secondes. */
  const cycle = useRef(0);
  /** Temps de l'énoncé affiché par le chronomètre. */
  const readout = useRef(0);

  const cycleDuration = t2 + HOLD_SECONDS;
  const arrowLength = speed * ARROW_UNITS_PER_MPS;

  useFrame((_, delta) => {
    const time = (cycle.current + delta) % cycleDuration;
    cycle.current = time;

    // Le mobile parcourt le rail pendant t2 secondes, puis l'image est
    // maintenue : les marques restent visibles jusqu'au reset instantané.
    const runTime = Math.min(time, t2);
    readout.current = runTime;

    if (mobile.current) {
      mobile.current.position.x =
        layout.markers[0].x + speed * runTime * UNITS_PER_METRE;
    }

    // La droite x(t) se dessine au même rythme que le mobile avance.
    if (curve.current) {
      curve.current.scale.x = Math.max(runTime / t2, 0.001);
    }
    if (cursor.current) {
      cursor.current.position.x = layout.graphX(runTime);
      cursor.current.position.y = layout.graphY(
        layout.startMetres + speed * runTime,
      );
    }

    for (let index = 0; index < layout.markers.length; index += 1) {
      const node = markerRefs.current[index];
      if (node) node.visible = runTime + 1e-6 >= layout.markers[index].time;
    }
  });

  return (
    <group rotation-y={LATERAL_YAW}>
      {/* Paillasse */}
      <mesh position={[0, -0.01, 0.05]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3.9, 2]} />
        <meshStandardMaterial color={DIAGRAM_COLORS.structure} roughness={1} />
      </mesh>

      {/* Rail à coussin d'air : corps, rainure supérieure et deux pieds */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[layout.railUnits + 0.18, 0.09, 0.3]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.35}
          metalness={0.75}
        />
      </mesh>
      <mesh position={[0, RAIL_TOP_Y, 0]}>
        <boxGeometry args={[layout.railUnits + 0.18, 0.03, 0.1]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.6}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (layout.railUnits / 2 - 0.2), 0.028, 0]}
        >
          <boxGeometry args={[0.14, 0.055, 0.34]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.structure}
            roughness={0.7}
          />
        </mesh>
      ))}

      {/* Graduations gravées sur l'arête avant du rail */}
      {layout.ticks.map((tick) => (
        <mesh
          key={tick.x}
          position={[tick.x, RAIL_TOP_Y + 0.008, tick.major ? 0.12 : 0.13]}
        >
          <boxGeometry
            args={[tick.major ? 0.022 : 0.011, 0.014, tick.major ? 0.14 : 0.07]}
          />
          <meshStandardMaterial
            color={tick.major ? DIAGRAM_COLORS.object : DIAGRAM_COLORS.guide}
            roughness={0.5}
          />
        </mesh>
      ))}

      {/* Chronophotographie : une marque déposée à chaque intervalle de temps */}
      {layout.markers.map((marker, index) => (
        <group
          key={marker.time}
          ref={(node) => {
            markerRefs.current[index] = node;
          }}
          position={[marker.x, 0, 0]}
          visible={false}
        >
          <mesh position={[0, 0.008, MARKER_Z]}>
            <cylinderGeometry
              args={[
                marker.highlighted ? 0.085 : 0.055,
                marker.highlighted ? 0.085 : 0.055,
                0.014,
                20,
              ]}
            />
            <meshStandardMaterial
              color={
                marker.highlighted
                  ? DIAGRAM_COLORS.support
                  : DIAGRAM_COLORS.friction
              }
              emissive={
                marker.highlighted
                  ? DIAGRAM_COLORS.support
                  : DIAGRAM_COLORS.friction
              }
              emissiveIntensity={0.5}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0.006, (MARKER_Z + 0.13) / 2]}>
            <boxGeometry args={[0.01, 0.004, MARKER_Z - 0.13]} />
            <meshStandardMaterial
              color={DIAGRAM_COLORS.guide}
              roughness={0.8}
            />
          </mesh>
          {/* Fantôme du mobile, resté sur le rail à l'instant de la marque */}
          <mesh position={[0, MOBILE_Y, 0]}>
            <boxGeometry args={[0.34, 0.2, 0.26]} />
            <meshStandardMaterial
              color={DIAGRAM_COLORS.object}
              transparent
              opacity={0.22}
              roughness={0.6}
            />
          </mesh>
        </group>
      ))}

      {/* Mobile autoporteur, sa flèche de vitesse et ses deux étiquettes */}
      <group ref={mobile} position={[layout.markers[0].x, 0, 0]}>
        <mesh position={[0, MOBILE_Y, 0]}>
          <boxGeometry args={[0.34, 0.2, 0.26]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.object}
            roughness={0.45}
          />
        </mesh>
        <mesh position={[0, MOBILE_Y + 0.13, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.06, 16]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.metal}
            roughness={0.3}
            metalness={0.8}
          />
        </mesh>
        {/* La longueur est constante : c'est justement l'information du MRU. */}
        <VectorArrow
          origin={[0, MOBILE_Y + 0.19, 0]}
          direction={ARROW_DIRECTION}
          length={arrowLength}
          color={DIAGRAM_COLORS.velocity}
          thickness={0.028}
        />
        <LiveLabel
          position={[0, 0.8, 0]}
          valueRef={readout}
          initialValue={0}
          decimals={1}
          prefix="t = "
          suffix=" s"
        />
        <DiagramLabel
          position={[arrowLength + 0.2, MOBILE_Y + 0.3, 0.55]}
          tone="accent"
        >
          v = ?
        </DiagramLabel>
      </group>

      {/* Panneau du graphique x(t), adossé derrière le rail */}
      <mesh position={[-0.42, 1.18, GRAPH_Z]}>
        <boxGeometry args={[1.9, 1.06, 0.03]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.9}
        />
      </mesh>
      {layout.secondLines.map((x) => (
        <mesh key={`s${x}`} position={[x, GRAPH_ORIGIN_Y + 0.45, GRAPH_LINE_Z]}>
          <boxGeometry args={[0.006, 0.9, 0.006]} />
          <meshStandardMaterial color={DIAGRAM_COLORS.guide} roughness={0.9} />
        </mesh>
      ))}
      {layout.metreLines.map((y) => (
        <mesh key={`m${y}`} position={[GRAPH_ORIGIN_X + 0.78, y, GRAPH_LINE_Z]}>
          <boxGeometry args={[1.56, 0.006, 0.006]} />
          <meshStandardMaterial color={DIAGRAM_COLORS.guide} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[GRAPH_ORIGIN_X, GRAPH_ORIGIN_Y + 0.47, GRAPH_LINE_Z]}>
        <boxGeometry args={[0.014, 0.96, 0.014]} />
        <meshStandardMaterial color={DIAGRAM_COLORS.object} roughness={0.6} />
      </mesh>
      <mesh position={[GRAPH_ORIGIN_X + 0.83, GRAPH_ORIGIN_Y, GRAPH_LINE_Z]}>
        <boxGeometry args={[1.68, 0.014, 0.014]} />
        <meshStandardMaterial color={DIAGRAM_COLORS.object} roughness={0.6} />
      </mesh>

      {/* Triangle de pente entre les deux points de l'énoncé */}
      <mesh
        position={[
          (layout.point1X + layout.point2X) / 2,
          layout.point1Y,
          GRAPH_LINE_Z + 0.01,
        ]}
      >
        <boxGeometry args={[layout.point2X - layout.point1X, 0.01, 0.01]} />
        <meshStandardMaterial color={DIAGRAM_COLORS.support} roughness={0.7} />
      </mesh>
      <mesh
        position={[
          layout.point2X,
          (layout.point1Y + layout.point2Y) / 2,
          GRAPH_LINE_Z + 0.01,
        ]}
      >
        <boxGeometry args={[0.01, layout.point2Y - layout.point1Y, 0.01]} />
        <meshStandardMaterial color={DIAGRAM_COLORS.support} roughness={0.7} />
      </mesh>

      {/* Droite x(t), dessinée progressivement par mise à l'échelle en x */}
      <group
        ref={curve}
        position={[layout.curveStartX, layout.curveStartY, GRAPH_LINE_Z + 0.02]}
        rotation-z={layout.curveAngle}
        scale={[0.001, 1, 1]}
      >
        <mesh position={[layout.curveLength / 2, 0, 0]}>
          <boxGeometry args={[layout.curveLength, 0.022, 0.022]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.object}
            emissive={DIAGRAM_COLORS.object}
            emissiveIntensity={0.3}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Les deux points cités par la question, puis le curseur mobile */}
      <mesh position={[layout.point1X, layout.point1Y, GRAPH_LINE_Z + 0.05]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.support}
          emissive={DIAGRAM_COLORS.support}
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[layout.point2X, layout.point2Y, GRAPH_LINE_Z + 0.05]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.support}
          emissive={DIAGRAM_COLORS.support}
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>
      <mesh
        ref={cursor}
        position={[layout.curveStartX, layout.curveStartY, GRAPH_LINE_Z + 0.07]}
      >
        <sphereGeometry args={[0.038, 16, 16]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.velocity}
          emissive={DIAGRAM_COLORS.velocity}
          emissiveIntensity={0.8}
          toneMapped={false}
        />
      </mesh>

      {/* Étiquettes : uniquement les données de l'énoncé */}
      <DiagramLabel position={[layout.markers[0].x - 0.16, 1.35, 0.55]}>
        1 marque toutes les {formatDecimal(markerInterval, 1)} s
      </DiagramLabel>
      <DiagramLabel position={[-0.42, 1.8, GRAPH_Z]}>
        graphique x(t)
      </DiagramLabel>
      <DiagramLabel
        position={[markerX(layout.markers, t1), 0.02, 0.95]}
        tone="info"
      >
        x₁ = {formatDecimal(x1, 2)} m · t₁ = {formatDecimal(t1, 1)} s
      </DiagramLabel>
      <DiagramLabel
        position={[markerX(layout.markers, t2), 0.02, 0.95]}
        tone="info"
      >
        x₂ = {formatDecimal(x2, 2)} m · t₂ = {formatDecimal(t2, 1)} s
      </DiagramLabel>
    </group>
  );
}

/** Abscisse de scène de la marque déposée à l'instant demandé. */
function markerX(markers: readonly RailMarker[], time: number): number {
  const found = markers.find((marker) => Math.abs(marker.time - time) < 1e-6);
  return found ? found.x : 0;
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
