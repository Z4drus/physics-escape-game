"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, InstancedMesh, Mesh, MeshStandardMaterial } from "three";
import {
  CatmullRomCurve3,
  DoubleSide,
  MathUtils,
  Object3D,
  Quaternion,
  Vector3,
} from "three";

import { DIAGRAM_COLORS } from "@/features/game/components/diagrams/palette";
import { DiagramLabel } from "@/features/game/components/diagrams/primitives/DiagramLabel";
import { VectorArrow } from "@/features/game/components/diagrams/primitives/VectorArrow";
import type { DiagramSceneProps } from "@/features/game/components/diagrams/registry";
import type { Vec3 } from "@/types/game";

/** Hauteur du dessus du plan de travail. */
const BOARD_TOP = 0.1;

/** Intensité de référence des flux lumineux, en ampères. */
const REFERENCE_CURRENT = 0.6;
/** Vitesse d'un flux à l'intensité de référence, en unités de scène par seconde. */
const REFERENCE_SPEED = 0.32;
/** Densité d'un flux à l'intensité de référence, en points par unité de longueur. */
const REFERENCE_DENSITY = 6;

/** Durée du cycle d'animation, en secondes : montée en chauffe puis palier. */
const CYCLE = 5;
/** Part du cycle consacrée à la montée en température du radiateur. */
const HEAT_RAMP = 2.5;
/** Durée du fondu de fin de cycle, qui rend la boucle invisible. */
const HEAT_FADE = 0.4;
/** Puissance qui sature l'émissif des ailettes, en watts. */
const POWER_FULL_SCALE = 2000;
/** Éclat maximal des ailettes portées au rouge. */
const HEAT_MAX_INTENSITY = 1.3;

/** Nombre d'ailettes du radiateur et pas vertical entre elles. */
const FIN_COUNT = 6;
const FIN_STEP = 0.11;
const FIN_BASE_Y = 0.34;

/** Nombre de tronçons approximant la couronne de la pince ampèremétrique. */
const CLAMP_SEGMENTS = 12;
/** Rayon de la couronne de la pince. */
const CLAMP_RADIUS = 0.15;
/** Abscisse curviligne où la pince est serrée sur le câble. */
const CLAMP_AT = 0.28;

/** Nombre de dents de la roue du compteur d'énergie. */
const TOOTH_COUNT = 8;
/** Rayon d'implantation des dents. */
const TOOTH_RADIUS = 0.098;

/** Ondes de chaleur : nombre, altitude de départ et course verticale. */
const WAVE_COUNT = 3;
const WAVE_START_Y = 1.02;
const WAVE_RISE = 0.48;
const WAVE_PERIOD = 2.6;

/**
 * Câble d'alimentation : descente en S de la prise murale vers le radiateur.
 * Le tracé est volontairement long et sinueux — c'est lui qui porte le flux de
 * points, et un câble tendu ne laisserait pas voir le débit.
 */
const CABLE_CURVE = new CatmullRomCurve3(
  [
    new Vector3(-1.21, 0.74, -0.1),
    new Vector3(-1.0, 0.66, 0.04),
    new Vector3(-0.78, 0.58, 0.2),
    new Vector3(-0.44, 0.4, 0.3),
    new Vector3(-0.08, 0.32, 0.24),
    new Vector3(0.16, 0.36, 0.1),
    new Vector3(0.34, 0.44, 0),
  ],
  false,
  "centripetal",
);

/** Sens conventionnel du courant : de la prise vers l'appareil. */
const CURRENT_DIRECTION: Vec3 = [1, 0, 0];
/** Axe de référence utilisé pour orienter la couronne de la pince. */
const X_AXIS = new Vector3(1, 0, 0);

/** Objets de travail partagés : `useFrame` n'alloue jamais. */
const FLOW_SOURCE = new Object3D();
const FLOW_POSITION = new Vector3();

/**
 * Nombre de points lumineux et vitesse de défilement d'une branche.
 * La densité et la vitesse sont toutes deux proportionnelles à l'intensité :
 * 8 A doivent se lire comme un flux dense et rapide, sans lire d'étiquette.
 */
function flowProfile(curve: CatmullRomCurve3, current: number) {
  const length = curve.getLength();
  const ratio = current / REFERENCE_CURRENT;
  const density = MathUtils.clamp(REFERENCE_DENSITY * ratio, 1.4, 9);
  return {
    count: Math.max(3, Math.round(density * length)),
    // Vitesse exprimée en paramètre normalisé par seconde, plafonnée à 1 u/s.
    speed: Math.min(REFERENCE_SPEED * ratio, 1) / length,
  };
}

/** Écrit un nombre à la française (virgule décimale). */
function formatNumber(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

/**
 * Schéma « P = U · I, E = P · t » : un radiateur branché sur le secteur, la
 * pince ampèremétrique posée sur son câble et un compteur qui égrène le temps.
 * Le schéma affiche les trois données de l'énoncé (U, I, t) ; l'énergie
 * consommée reste l'inconnue.
 */
export function PowerApplianceCircuitScene({ params }: DiagramSceneProps) {
  const voltage = Number(params.U ?? 230);
  const current = Number(params.I ?? 8);
  const power = Number(params.P ?? voltage * current);
  const duration = Number(params.t ?? 2.5);

  /** Palier de chauffe atteint par les ailettes, proportionnel à la puissance. */
  const heatPlateau =
    HEAT_MAX_INTENSITY * MathUtils.clamp(power / POWER_FULL_SCALE, 0, 1);

  const clampAnchor = useMemo(() => CABLE_CURVE.getPointAt(CLAMP_AT), []);
  const clampOrientation = useMemo(
    () =>
      new Quaternion().setFromUnitVectors(
        X_AXIS,
        CABLE_CURVE.getTangentAt(CLAMP_AT),
      ),
    [],
  );

  return (
    <group>
      {/* Plan de travail. */}
      <mesh position={[0, BOARD_TOP / 2, 0]} receiveShadow>
        <boxGeometry args={[3, BOARD_TOP, 2.4]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.85}
          metalness={0.15}
        />
      </mesh>

      {/* Panneau mural qui porte la prise secteur. */}
      <mesh position={[-1.42, 0.675, -0.1]} receiveShadow>
        <boxGeometry args={[0.08, 1.15, 1.5]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      <WallSocket />

      {/* Câble d'alimentation et le courant qui le parcourt. */}
      <mesh>
        <tubeGeometry args={[CABLE_CURVE, 120, 0.045, 8, false]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.55}
          metalness={0.7}
        />
      </mesh>

      <CurrentFlow curve={CABLE_CURVE} current={current} />

      <ClampMeter position={clampAnchor} orientation={clampOrientation} />
      <Radiator plateau={heatPlateau} />
      <EnergyMeter />

      {Array.from({ length: WAVE_COUNT }, (_, index) => (
        <HeatWave key={index} index={index} />
      ))}

      {/* Sens conventionnel du courant, de la prise vers l'appareil. */}
      <VectorArrow
        origin={[-0.36, 0.6, 0.3]}
        direction={CURRENT_DIRECTION}
        length={0.26}
        color={DIAGRAM_COLORS.current}
        thickness={0.022}
      />

      <DiagramLabel position={[-1.14, 1.34, -0.1]}>
        {`U = ${formatNumber(voltage, 0)} V`}
      </DiagramLabel>
      <DiagramLabel position={[-1.16, 0.86, 0.22]}>
        {`I = ${formatNumber(current, 1)} A`}
      </DiagramLabel>
      <DiagramLabel position={[-1.05, 0.66, 0.9]}>
        {`t = ${formatNumber(duration, 1)} h`}
      </DiagramLabel>
      <DiagramLabel position={[0.82, 1.36, 0]} tone="accent">
        E = ?
      </DiagramLabel>
    </group>
  );
}

/**
 * Flux de points lumineux circulant dans un fil.
 * Les points sont des instances d'une même sphère repositionnées le long de la
 * courbe du tube : le câble et le courant partagent exactement le même tracé.
 */
function CurrentFlow({
  curve,
  current,
  radius = 0.05,
}: {
  curve: CatmullRomCurve3;
  current: number;
  radius?: number;
}) {
  const points = useRef<InstancedMesh>(null);
  const progress = useRef(0);

  const { count, speed } = useMemo(
    () => flowProfile(curve, current),
    [curve, current],
  );

  useFrame((_, delta) => {
    const mesh = points.current;
    if (!mesh) return;

    progress.current = (progress.current + speed * delta) % 1;

    for (let index = 0; index < count; index += 1) {
      const t = (index / count + progress.current) % 1;
      curve.getPointAt(t, FLOW_POSITION);
      FLOW_SOURCE.position.copy(FLOW_POSITION);
      FLOW_SOURCE.updateMatrix();
      mesh.setMatrixAt(index, FLOW_SOURCE.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={points}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      <sphereGeometry args={[radius, 10, 10]} />
      <meshStandardMaterial
        color={DIAGRAM_COLORS.current}
        emissive={DIAGRAM_COLORS.current}
        emissiveIntensity={2.2}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

/** Prise secteur murale : socle dressé et ses deux alvéoles en creux. */
function WallSocket() {
  return (
    <group position={[-1.3, 0.78, -0.1]}>
      <mesh castShadow>
        <boxGeometry args={[0.16, 0.5, 0.42]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.object}
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      {[-0.09, 0.09].map((z) => (
        <mesh key={z} position={[0.075, 0.02, z]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.045, 0.045, 0.05, 16]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.structure}
            roughness={0.95}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Pince ampèremétrique serrée sur le câble : la couronne est approximée par
 * douze tronçons cylindriques, chacun tangent au cercle. Elle est orientée
 * d'après la tangente du câble, donc elle l'enserre réellement.
 */
function ClampMeter({
  position,
  orientation,
}: {
  position: Vector3;
  orientation: Quaternion;
}) {
  return (
    <group position={position}>
      <group quaternion={orientation}>
        {Array.from({ length: CLAMP_SEGMENTS }, (_, index) => {
          const angle = (index / CLAMP_SEGMENTS) * Math.PI * 2;
          return (
            <mesh
              key={index}
              position={[
                0,
                CLAMP_RADIUS * Math.cos(angle),
                CLAMP_RADIUS * Math.sin(angle),
              ]}
              rotation-x={angle + Math.PI / 2}
            >
              <cylinderGeometry args={[0.028, 0.028, 0.082, 10]} />
              <meshStandardMaterial
                color={DIAGRAM_COLORS.metal}
                roughness={0.35}
                metalness={0.8}
              />
            </mesh>
          );
        })}
      </group>

      {/* Corps de l'appareil, sous la couronne : il reste toujours vertical. */}
      <mesh position={[0, -0.3, 0]} castShadow>
        <boxGeometry args={[0.17, 0.32, 0.13]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.65}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0, -0.24, 0.068]}>
        <boxGeometry args={[0.11, 0.07, 0.012]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.current}
          emissive={DIAGRAM_COLORS.current}
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Radiateur électrique : corps, pieds et six ailettes dont l'émissif monte
 * pendant la première moitié du cycle puis se stabilise au palier imposé par
 * la puissance. C'est la traduction visuelle de « P = U · I ».
 */
function Radiator({ plateau }: { plateau: number }) {
  const finMaterials = useRef<(MeshStandardMaterial | null)[]>([]);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime % CYCLE;

    // Montée régulière, palier vibrant, puis fondu court pour boucler net.
    let level: number;
    if (time < HEAT_RAMP) {
      level = plateau * (time / HEAT_RAMP);
    } else if (time < CYCLE - HEAT_FADE) {
      level = plateau * (1 + 0.08 * Math.sin(time * 9));
    } else {
      level = plateau * ((CYCLE - time) / HEAT_FADE);
    }

    for (const material of finMaterials.current) {
      if (material) {
        material.emissiveIntensity = Math.max(level, 0);
      }
    }
  });

  return (
    <group position={[0.82, 0, 0]}>
      <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.05, 0.72, 0.34]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.object}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, 0.18, 0]} castShadow>
          <boxGeometry args={[0.1, 0.16, 0.3]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.metal}
            roughness={0.4}
            metalness={0.8}
          />
        </mesh>
      ))}

      {Array.from({ length: FIN_COUNT }, (_, index) => (
        <mesh key={index} position={[0, FIN_BASE_Y + index * FIN_STEP, 0]}>
          <boxGeometry args={[0.98, 0.055, 0.4]} />
          <meshStandardMaterial
            ref={(material) => {
              finMaterials.current[index] = material;
            }}
            color={DIAGRAM_COLORS.object}
            emissive={DIAGRAM_COLORS.hot}
            emissiveIntensity={0}
            roughness={0.5}
            metalness={0.35}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Voile de chaleur montant du radiateur : un plan très transparent qui s'élève
 * et s'efface. Trois voiles déphasés suffisent à faire lire la convection.
 */
function HeatWave({ index }: { index: number }) {
  const veil = useRef<Mesh>(null);
  const material = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    const phase = (clock.elapsedTime / WAVE_PERIOD + index / WAVE_COUNT) % 1;
    if (veil.current) {
      veil.current.position.y = WAVE_START_Y + phase * WAVE_RISE;
    }
    if (material.current) {
      // Apparition et disparition symétriques : aucun bord franc.
      material.current.opacity = 0.1 * Math.sin(phase * Math.PI);
    }
  });

  return (
    <mesh ref={veil} position={[0.82, WAVE_START_Y, 0]} rotation-y={0.5}>
      <planeGeometry args={[0.85, 0.4]} />
      <meshStandardMaterial
        ref={material}
        color={DIAGRAM_COLORS.hot}
        emissive={DIAGRAM_COLORS.hot}
        emissiveIntensity={0.8}
        transparent
        opacity={0}
        depthWrite={false}
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * Compteur d'énergie : sa roue crantée fait exactement un tour par cycle.
 * C'est le seul indice visuel du temps qui s'écoule, celui que multiplie la
 * puissance pour donner l'énergie consommée.
 */
function EnergyMeter() {
  const wheel = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!wheel.current) return;
    wheel.current.rotation.z += (delta * Math.PI * 2) / CYCLE;
  });

  return (
    <group position={[-1.05, 0, 0.78]}>
      <mesh position={[0, 0.33, 0]} castShadow>
        <boxGeometry args={[0.62, 0.46, 0.24]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.65}
          metalness={0.3}
        />
      </mesh>

      {/* Face avant claire, où se lit le mécanisme. */}
      <mesh position={[0, 0.33, 0.121]}>
        <planeGeometry args={[0.5, 0.34]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.object}
          roughness={0.55}
          metalness={0.05}
        />
      </mesh>

      <group ref={wheel} position={[0, 0.33, 0.135]}>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.085, 0.085, 0.02, 24]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.metal}
            roughness={0.4}
            metalness={0.85}
          />
        </mesh>

        {Array.from({ length: TOOTH_COUNT }, (_, index) => {
          const angle = (index / TOOTH_COUNT) * Math.PI * 2;
          return (
            <mesh
              key={index}
              position={[
                TOOTH_RADIUS * Math.cos(angle),
                TOOTH_RADIUS * Math.sin(angle),
                0,
              ]}
              rotation-z={angle}
            >
              <boxGeometry args={[0.032, 0.018, 0.022]} />
              <meshStandardMaterial
                color={DIAGRAM_COLORS.current}
                emissive={DIAGRAM_COLORS.current}
                emissiveIntensity={0.9}
                toneMapped={false}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
