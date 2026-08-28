"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { InstancedMesh, MeshStandardMaterial } from "three";
import { CatmullRomCurve3, MathUtils, Object3D, Vector3 } from "three";

import { DIAGRAM_COLORS } from "@/features/game/components/diagrams/palette";
import { DiagramLabel } from "@/features/game/components/diagrams/primitives/DiagramLabel";
import { VectorArrow } from "@/features/game/components/diagrams/primitives/VectorArrow";
import type { DiagramSceneProps } from "@/features/game/components/diagrams/registry";
import type { Vec3 } from "@/types/game";

/** Hauteur du dessus de la platine. */
const BOARD_TOP = 0.1;
/** Hauteur du plan des fils, au-dessus de la platine. */
const WIRE_Y = 0.3;

/** Intensité de référence des flux lumineux, en ampères. */
const REFERENCE_CURRENT = 0.6;
/** Vitesse d'un flux à l'intensité de référence, en unités de scène par seconde. */
const REFERENCE_SPEED = 0.32;
/** Densité d'un flux à l'intensité de référence, en points par unité de longueur. */
const REFERENCE_DENSITY = 6;

/** Rayon du tronc commun : il porte le courant total, il est plus épais. */
const TRUNK_RADIUS = 0.045;
/** Rayon d'une branche dérivée. */
const BRANCH_RADIUS = 0.035;

/**
 * Facteur reliant la puissance dissipée `R · I²` à l'éclat rouge d'une
 * résistance. Calé pour que 4,8 W donne 0,50 et 2,4 W donne 0,25 : la
 * hiérarchie thermique visible est exactement celle du calcul.
 */
const RESISTOR_HEAT_SCALE = 0.104;
/** Puissance qui porte l'ampoule témoin à son éclat nominal, en watts. */
const LAMP_POWER_REFERENCE = 7.2;

/** Position des deux nœuds du montage en dérivation. */
const NODE_A: Vec3 = [-0.35, WIRE_Y, 0];
const NODE_B: Vec3 = [1.2, WIRE_Y, 0];
/** Abscisse commune des deux résistances, sur le sommet de chaque branche. */
const RESISTOR_X = 0.42;
/** Écart en z entre l'axe du montage et chacune des deux branches. */
const BRANCH_Z = 0.68;
/** Position de l'ampoule témoin sur le tronc de retour. */
const LAMP_POSITION: Vec3 = [0.35, WIRE_Y, 0.98];

/** Tronc commun aller : borne + de la pile → interrupteur → nœud A. */
const TRUNK_IN_CURVE = new CatmullRomCurve3(
  [
    new Vector3(-0.68, 0.33, -0.68),
    new Vector3(-0.58, WIRE_Y, -0.62),
    new Vector3(-0.5, WIRE_Y, -0.47),
    new Vector3(-0.44, WIRE_Y, -0.27),
    new Vector3(-0.38, WIRE_Y, -0.11),
    new Vector3(...NODE_A),
  ],
  false,
  "centripetal",
);

/** Branche arrière, celle de R₁ : elle part du nœud A et rejoint le nœud B. */
const BRANCH_1_CURVE = new CatmullRomCurve3(
  [
    new Vector3(...NODE_A),
    new Vector3(-0.12, WIRE_Y, -0.42),
    new Vector3(RESISTOR_X, WIRE_Y, -BRANCH_Z),
    new Vector3(0.96, WIRE_Y, -0.42),
    new Vector3(...NODE_B),
  ],
  false,
  "centripetal",
);

/** Branche avant, celle de R₂ : même départ, même arrivée, autre chemin. */
const BRANCH_2_CURVE = new CatmullRomCurve3(
  [
    new Vector3(...NODE_A),
    new Vector3(-0.12, WIRE_Y, 0.42),
    new Vector3(RESISTOR_X, WIRE_Y, BRANCH_Z),
    new Vector3(0.96, WIRE_Y, 0.42),
    new Vector3(...NODE_B),
  ],
  false,
  "centripetal",
);

/** Tronc commun retour : nœud B → ampoule témoin → borne − de la pile. */
const TRUNK_OUT_CURVE = new CatmullRomCurve3(
  [
    new Vector3(...NODE_B),
    new Vector3(1.36, WIRE_Y, 0.42),
    new Vector3(1.1, WIRE_Y, 0.82),
    new Vector3(...LAMP_POSITION),
    new Vector3(-0.45, WIRE_Y, 0.92),
    new Vector3(-1.02, WIRE_Y, 0.66),
    new Vector3(-1.12, WIRE_Y, 0.18),
    new Vector3(-1.12, 0.32, -0.26),
  ],
  false,
  "centripetal",
);

/** Sens conventionnel du courant à la sortie du nœud A, sur chaque branche. */
const BRANCH_1_DIRECTION: Vec3 = [0.48, 0, -0.88];
const BRANCH_2_DIRECTION: Vec3 = [0.48, 0, 0.88];
/** Sens du courant sur le tronc de retour : il revient vers la pile. */
const TRUNK_OUT_DIRECTION: Vec3 = [-1, 0, 0];

/** Décalages des trois bagues du code des couleurs le long d'un corps. */
const RING_OFFSETS: readonly number[] = [-0.14, 0, 0.14];

/** Objets de travail partagés : `useFrame` n'alloue jamais. */
const FLOW_SOURCE = new Object3D();
const FLOW_POSITION = new Vector3();

/**
 * Nombre de points lumineux et vitesse de défilement d'une branche.
 * Densité et vitesse sont toutes deux proportionnelles à l'intensité : les
 * densités s'ajoutent au nœud B (4 + 2 = 6 points par unité), ce qui montre
 * `I₁ + I₂ = I` avant même qu'on lise une étiquette.
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
 * Schéma de l'association en dérivation : deux résistances branchées entre les
 * deux mêmes nœuds, alimentées par une pile.
 *
 * Le débit de chaque branche se voit — la branche R₁ est deux fois plus fournie
 * que la branche R₂ — mais aucune valeur d'intensité n'est affichée : le joueur
 * doit conclure lui-même, et l'intensité totale reste l'inconnue.
 */
export function ParallelResistorsCircuitScene({ params }: DiagramSceneProps) {
  const voltage = Number(params.U ?? 12);
  const resistance1 = Number(params.R1 ?? 30);
  const resistance2 = Number(params.R2 ?? 60);
  const totalCurrent = Number(params.I ?? 0.6);
  const current1 = Number(params.I1 ?? 0.4);
  const current2 = Number(params.I2 ?? 0.2);

  /** Éclat de l'ampoule témoin : elle traduit la puissance totale du montage. */
  const lampIntensity = MathUtils.clamp(
    (voltage * totalCurrent) / LAMP_POWER_REFERENCE,
    0.2,
    2,
  );

  return (
    <group>
      {/* Platine d'expérience. */}
      <mesh position={[0, BOARD_TOP / 2, 0]} receiveShadow>
        <boxGeometry args={[3, BOARD_TOP, 2.4]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.85}
          metalness={0.15}
        />
      </mesh>

      <Battery />

      {/* Tronc commun : plus épais, car il porte la somme des deux branches. */}
      <mesh>
        <tubeGeometry args={[TRUNK_IN_CURVE, 80, TRUNK_RADIUS, 8, false]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.45}
          metalness={0.8}
        />
      </mesh>
      <mesh>
        <tubeGeometry args={[TRUNK_OUT_CURVE, 200, TRUNK_RADIUS, 8, false]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.45}
          metalness={0.8}
        />
      </mesh>

      {/* Les deux branches dérivées, strictement symétriques. */}
      <mesh>
        <tubeGeometry args={[BRANCH_1_CURVE, 120, BRANCH_RADIUS, 8, false]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.45}
          metalness={0.8}
        />
      </mesh>
      <mesh>
        <tubeGeometry args={[BRANCH_2_CURVE, 120, BRANCH_RADIUS, 8, false]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.45}
          metalness={0.8}
        />
      </mesh>

      <CurrentFlow curve={TRUNK_IN_CURVE} current={totalCurrent} />
      <CurrentFlow curve={BRANCH_1_CURVE} current={current1} />
      <CurrentFlow curve={BRANCH_2_CURVE} current={current2} />
      <CurrentFlow curve={TRUNK_OUT_CURVE} current={totalCurrent} />

      <CircuitNode position={NODE_A} phase={0} />
      <CircuitNode position={NODE_B} phase={Math.PI} />

      <Switch />

      <Resistor
        z={-BRANCH_Z}
        bandColor={DIAGRAM_COLORS.weight}
        heat={RESISTOR_HEAT_SCALE * resistance1 * current1 * current1}
      />
      <Resistor
        z={BRANCH_Z}
        bandColor={DIAGRAM_COLORS.cold}
        heat={RESISTOR_HEAT_SCALE * resistance2 * current2 * current2}
      />

      <IndicatorLamp intensity={lampIntensity} />

      {/* Sens conventionnel du courant : deux sorties au nœud A, un retour. */}
      <VectorArrow
        origin={[-0.28, 0.44, -0.12]}
        direction={BRANCH_1_DIRECTION}
        length={0.24}
        color={DIAGRAM_COLORS.current}
        thickness={0.02}
      />
      <VectorArrow
        origin={[-0.28, 0.44, 0.12]}
        direction={BRANCH_2_DIRECTION}
        length={0.24}
        color={DIAGRAM_COLORS.current}
        thickness={0.02}
      />
      <VectorArrow
        origin={[0.9, 0.44, 0.94]}
        direction={TRUNK_OUT_DIRECTION}
        length={0.24}
        color={DIAGRAM_COLORS.current}
        thickness={0.02}
      />

      <DiagramLabel position={[-1.5, 0.82, -0.55]}>
        {`U = ${formatNumber(voltage, 0)} V`}
      </DiagramLabel>
      <DiagramLabel position={[RESISTOR_X, 0.64, -0.86]}>
        {`R₁ = ${formatNumber(resistance1, 0)} Ω`}
      </DiagramLabel>
      <DiagramLabel position={[RESISTOR_X, 0.64, 0.86]}>
        {`R₂ = ${formatNumber(resistance2, 0)} Ω`}
      </DiagramLabel>

      {/* Les deux intensités de branche restent sans valeur : c'est au joueur
          de les déduire du rapport des résistances. */}
      <DiagramLabel position={[0, 0.58, -0.45]}>I₁</DiagramLabel>
      <DiagramLabel position={[0, 0.58, 0.45]}>I₂</DiagramLabel>

      <DiagramLabel position={[-0.58, 0.68, -0.56]} tone="accent">
        I = ?
      </DiagramLabel>
    </group>
  );
}

/**
 * Flux de points lumineux circulant dans un fil.
 * Les points sont des instances d'une même sphère repositionnées le long de la
 * courbe du tube : chaque branche a donc son propre débit, sur son propre
 * tracé, et les points naissent bien au nœud A pour mourir au nœud B.
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

/** Pile 12 V : corps, capuchon de la borne + et plot de la borne −. */
function Battery() {
  return (
    <group position={[-1.12, 0, -0.55]}>
      <mesh position={[0, 0.31, 0]} castShadow>
        <boxGeometry args={[0.72, 0.42, 0.46]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.6}
          metalness={0.35}
        />
      </mesh>

      {/* Capuchon laiton de la borne +, d'où part le tronc commun. */}
      <mesh position={[0.4, 0.33, -0.13]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.06, 0.06, 0.09, 16]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.weight}
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>

      {/* Plot de la borne −, où revient le tronc de retour. */}
      <mesh position={[0, 0.33, 0.29]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.06, 0.06, 0.07, 16]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.35}
          metalness={0.9}
        />
      </mesh>
    </group>
  );
}

/**
 * Nœud de dérivation : bille métallique et halo pulsant. Le halo n'est pas
 * décoratif — il désigne les deux seuls points où le courant se sépare puis
 * se regroupe, là où la lecture du schéma se joue.
 */
function CircuitNode({ position, phase }: { position: Vec3; phase: number }) {
  const halo = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!halo.current) return;
    halo.current.opacity =
      0.225 + 0.075 * Math.sin(clock.elapsedTime * Math.PI + phase);
  });

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.085, 16, 16]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.25}
          metalness={0.9}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial
          ref={halo}
          color={DIAGRAM_COLORS.support}
          emissive={DIAGRAM_COLORS.support}
          emissiveIntensity={1.2}
          transparent
          opacity={0.22}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** Interrupteur fermé sur le tronc commun : deux plots et une lame inclinée. */
function Switch() {
  return (
    <group position={[-0.5, WIRE_Y, -0.47]} rotation-y={-1.19}>
      {[-0.15, 0.15].map((x) => (
        <mesh key={x} position={[x, 0.05, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.1, 14]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.metal}
            roughness={0.3}
            metalness={0.9}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.105, 0]} rotation-z={0.105} castShadow>
        <boxGeometry args={[0.35, 0.035, 0.09]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.25}
          metalness={0.95}
        />
      </mesh>
    </group>
  );
}

/**
 * Résistance couchée au sommet d'une branche. Son éclat rouge est fixé par la
 * puissance qu'elle dissipe : R₁ chauffe deux fois plus que R₂, ce qui reste
 * cohérent avec la correction quel que soit l'angle de vue.
 */
function Resistor({
  z,
  bandColor,
  heat,
}: {
  z: number;
  bandColor: string;
  heat: number;
}) {
  /** Code des couleurs : la première bague identifie la branche. */
  const bands = [bandColor, DIAGRAM_COLORS.structure, DIAGRAM_COLORS.hot];

  return (
    <group position={[RESISTOR_X, WIRE_Y, z]} rotation-z={Math.PI / 2}>
      <mesh castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.55, 20]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.object}
          emissive={DIAGRAM_COLORS.hot}
          emissiveIntensity={heat}
          roughness={0.55}
          metalness={0.1}
          toneMapped={false}
        />
      </mesh>

      {RING_OFFSETS.map((offset, index) => (
        <mesh key={offset} position={[0, offset, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.06, 20]} />
          <meshStandardMaterial color={bands[index]} roughness={0.6} />
        </mesh>
      ))}

      {[-0.36, 0.36].map((offset) => (
        <mesh key={offset} position={[0, offset, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.22, 12]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.metal}
            roughness={0.35}
            metalness={0.85}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Ampoule témoin posée sur le tronc de retour : son éclat suit la puissance
 * totale, donc le courant total — jamais celui d'une seule branche.
 */
function IndicatorLamp({ intensity }: { intensity: number }) {
  const glass = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!glass.current) return;
    // Scintillement de ±4 % : l'ampoule vit sans jamais changer de niveau.
    glass.current.emissiveIntensity =
      intensity * (1 + 0.04 * Math.sin(clock.elapsedTime * 7.3));
  });

  return (
    <group position={LAMP_POSITION}>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.18, 16]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.35}
          metalness={0.9}
        />
      </mesh>

      <mesh position={[0, 0.33, 0]}>
        <sphereGeometry args={[0.16, 20, 20]} />
        <meshStandardMaterial
          ref={glass}
          color={DIAGRAM_COLORS.friction}
          emissive={DIAGRAM_COLORS.friction}
          emissiveIntensity={intensity}
          roughness={0.15}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>

      <pointLight
        position={[0, 0.33, 0]}
        color={DIAGRAM_COLORS.friction}
        intensity={intensity * 3}
        distance={2.2}
      />
    </group>
  );
}
