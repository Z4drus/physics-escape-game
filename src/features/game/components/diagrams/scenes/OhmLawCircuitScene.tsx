"use client";

import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import { useMemo, useRef } from "react";
import type { Group, InstancedMesh, MeshStandardMaterial } from "three";
import { CatmullRomCurve3, MathUtils, Object3D, Vector3 } from "three";

import { DIAGRAM_COLORS } from "@/features/game/components/diagrams/palette";
import { DiagramLabel } from "@/features/game/components/diagrams/primitives/DiagramLabel";
import { VectorArrow } from "@/features/game/components/diagrams/primitives/VectorArrow";
import type { DiagramSceneProps } from "@/features/game/components/diagrams/registry";
import type { Vec3 } from "@/types/game";

/** Hauteur du dessus de la platine : tout le circuit repose dessus. */
const BOARD_TOP = 0.1;
/** Hauteur du plan des fils, au-dessus de la platine. */
const WIRE_Y = 0.3;

/** Intensité de référence des flux lumineux, en ampères. */
const REFERENCE_CURRENT = 0.6;
/** Vitesse d'un flux à l'intensité de référence, en unités de scène par seconde. */
const REFERENCE_SPEED = 0.32;
/** Densité d'un flux à l'intensité de référence, en points par unité de longueur. */
const REFERENCE_DENSITY = 6;

/** Durée du cycle d'animation : chauffe de la résistance et lancer d'aiguille. */
const CYCLE = 4;
/** Pleine échelle du cadran de l'ampèremètre, en ampères. */
const DIAL_FULL_SCALE = 1;
/** Angle de l'aiguille au zéro du cadran, en radians. */
const DIAL_ZERO_ANGLE = -0.75;
/** Débattement total de l'aiguille entre le zéro et la pleine échelle. */
const DIAL_SWEEP = 1.5;

/**
 * Boucle unique du circuit : générateur (gauche) → branche arrière portant la
 * résistance → descente à droite → branche avant portant l'ampèremètre →
 * retour au générateur. Fermée, donc le défilement des points boucle sans saut.
 */
const LOOP_CURVE = new CatmullRomCurve3(
  [
    new Vector3(-1.05, WIRE_Y, -0.5),
    new Vector3(-0.85, WIRE_Y, -0.72),
    new Vector3(0.85, WIRE_Y, -0.72),
    new Vector3(1.05, WIRE_Y, -0.5),
    new Vector3(1.05, WIRE_Y, 0.5),
    new Vector3(0.85, WIRE_Y, 0.72),
    new Vector3(-0.85, WIRE_Y, 0.72),
    new Vector3(-1.05, WIRE_Y, 0.5),
  ],
  true,
  "centripetal",
);

/** Sens conventionnel du courant sur la branche arrière : de gauche à droite. */
const CURRENT_DIRECTION: Vec3 = [1, 0, 0];
/** Cotes en z des deux bornes du générateur, dans son repère local. */
const TERMINAL_Z: readonly number[] = [-0.18, 0.18];
/** Hauteur des bornes au-dessus de la platine. */
const TERMINAL_Y = 0.66;
/** Décalages des trois bagues du code des couleurs le long du corps. */
const RING_OFFSETS: readonly number[] = [-0.14, 0, 0.14];

/** Objets de travail partagés : `useFrame` n'alloue jamais. */
const FLOW_SOURCE = new Object3D();
const FLOW_POSITION = new Vector3();

/**
 * Nombre de points lumineux et vitesse de défilement d'une branche.
 * La densité et la vitesse sont toutes deux proportionnelles à l'intensité :
 * un courant faible se lit à la fois comme rare et comme lent.
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
 * Schéma « U = R · I » : une résistance seule, alimentée par un générateur
 * réglable, avec un ampèremètre en série. La boucle unique porte le message
 * essentiel — une seule intensité partout — et la tension reste l'inconnue.
 */
export function OhmLawCircuitScene({ params }: DiagramSceneProps) {
  const resistance = Number(params.R ?? 220);
  const current = Number(params.I ?? 0.25);

  const resistorMaterial = useRef<MeshStandardMaterial>(null);
  const needle = useRef<Group>(null);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime % CYCLE;

    // Dissipation dans la résistance : respiration thermique lente, sans
    // jamais atteindre l'éclat d'une ampoule.
    if (resistorMaterial.current) {
      resistorMaterial.current.emissiveIntensity =
        0.225 * (1 - Math.cos((time / CYCLE) * Math.PI * 2));
    }

    // Aiguille de l'ampèremètre : micro-dépassement amorti au début du cycle,
    // puis lecture stable — c'est ce qui rend la mesure crédible.
    if (needle.current) {
      const rest =
        DIAL_ZERO_ANGLE +
        MathUtils.clamp(current / DIAL_FULL_SCALE, 0, 1) * DIAL_SWEEP;
      // Réponse d'un galvanomètre : oscillation amortie autour de la valeur lue.
      const settled = 1 - Math.exp(-6 * time) * Math.cos(12 * time);
      needle.current.rotation.y =
        DIAL_ZERO_ANGLE + (rest - DIAL_ZERO_ANGLE) * settled;
    }
  });

  return (
    <group>
      {/* Platine d'expérience : tout le circuit y est posé à plat. */}
      <mesh position={[0, BOARD_TOP / 2, 0]} receiveShadow>
        <boxGeometry args={[3, BOARD_TOP, 2.4]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.85}
          metalness={0.15}
        />
      </mesh>

      {/* Fil unique de la boucle. */}
      <mesh>
        <tubeGeometry args={[LOOP_CURVE, 160, 0.035, 8, true]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.45}
          metalness={0.8}
        />
      </mesh>

      <CurrentFlow curve={LOOP_CURVE} current={current} />

      <Generator />
      <Resistor materialRef={resistorMaterial} />
      <Ammeter needleRef={needle} />

      {/* Sens conventionnel du courant, rappelé sur la branche arrière. */}
      <VectorArrow
        origin={[-0.55, 0.44, -0.72]}
        direction={CURRENT_DIRECTION}
        length={0.26}
        color={DIAGRAM_COLORS.current}
        thickness={0.022}
      />

      <DiagramLabel position={[0.15, 0.64, -0.72]}>
        {`R = ${formatNumber(resistance, 0)} Ω`}
      </DiagramLabel>
      <DiagramLabel position={[0.78, 0.56, 0.72]}>
        {`I = ${formatNumber(current, 2)} A`}
      </DiagramLabel>
      <DiagramLabel position={[-1.05, 1.02, 0]} tone="accent">
        U = ?
      </DiagramLabel>
    </group>
  );
}

/**
 * Flux de points lumineux circulant dans un fil.
 * Les points sont des instances d'une même sphère repositionnées le long de la
 * courbe du tube : le fil et le courant partagent exactement le même tracé.
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

/** Générateur réglable : boîtier, deux bornes et leur halo pulsant. */
function Generator() {
  return (
    <group position={[-1.05, 0, 0]}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.75, 0.5, 0.55]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.6}
          metalness={0.35}
        />
      </mesh>

      {/* Bandeau de réglage sur la face avant : c'est un générateur variable. */}
      <mesh position={[0, 0.42, 0.278]}>
        <boxGeometry args={[0.44, 0.1, 0.012]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.support}
          emissive={DIAGRAM_COLORS.support}
          emissiveIntensity={0.9}
          toneMapped={false}
        />
      </mesh>

      {TERMINAL_Z.map((z, index) => (
        <group key={z} position={[0, TERMINAL_Y, z]}>
          <mesh>
            <cylinderGeometry args={[0.055, 0.055, 0.13, 14]} />
            <meshStandardMaterial
              color={DIAGRAM_COLORS.weight}
              roughness={0.3}
              metalness={0.85}
            />
          </mesh>
          <TerminalHalo phase={index * Math.PI} />
        </group>
      ))}
    </group>
  );
}

/**
 * Halo translucide d'une borne sous tension : son opacité respire lentement,
 * ce qui signale que le générateur débite sans ajouter de géométrie.
 */
function TerminalHalo({ phase }: { phase: number }) {
  const material = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!material.current) return;
    material.current.opacity =
      0.25 + 0.1 * Math.sin(clock.elapsedTime * 2.4 + phase);
  });

  return (
    <mesh>
      <sphereGeometry args={[0.1, 14, 14]} />
      <meshStandardMaterial
        ref={material}
        color={DIAGRAM_COLORS.support}
        emissive={DIAGRAM_COLORS.support}
        emissiveIntensity={1.4}
        transparent
        opacity={0.25}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * Résistance couchée sur la branche arrière : corps céramique, trois bagues du
 * code des couleurs et deux pattes qui enrobent le fil. Le matériau du corps
 * est piloté par la scène pour montrer l'échauffement.
 */
function Resistor({
  materialRef,
}: {
  materialRef: RefObject<MeshStandardMaterial | null>;
}) {
  return (
    <group position={[0.15, WIRE_Y, -0.72]} rotation-z={Math.PI / 2}>
      <mesh castShadow>
        <cylinderGeometry args={[0.17, 0.17, 0.55, 20]} />
        <meshStandardMaterial
          ref={materialRef}
          color={DIAGRAM_COLORS.object}
          emissive={DIAGRAM_COLORS.hot}
          emissiveIntensity={0}
          roughness={0.55}
          metalness={0.1}
          toneMapped={false}
        />
      </mesh>

      {RING_OFFSETS.map((offset, index) => (
        <mesh key={index} position={[0, offset, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.06, 20]} />
          <meshStandardMaterial
            color={
              index === 1 ? DIAGRAM_COLORS.structure : DIAGRAM_COLORS.weight
            }
            roughness={0.6}
          />
        </mesh>
      ))}

      {[-0.36, 0.36].map((offset) => (
        <mesh key={offset} position={[0, offset, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.24, 12]} />
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

/** Ampèremètre en série : boîtier plat, cadran tourné vers la caméra, aiguille. */
function Ammeter({ needleRef }: { needleRef: RefObject<Group | null> }) {
  return (
    <group position={[0.15, 0, 0.72]}>
      <mesh position={[0, 0.24, 0]} castShadow>
        <boxGeometry args={[0.7, 0.28, 0.5]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>

      {/* Cadran à plat : la caméra plonge sur la scène, il reste lisible. */}
      <mesh position={[0, 0.395, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.03, 24]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.object}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      <group ref={needleRef} position={[0, 0.415, 0]}>
        <mesh position={[0, 0, -0.07]}>
          <boxGeometry args={[0.014, 0.012, 0.14]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.hot}
            emissive={DIAGRAM_COLORS.hot}
            emissiveIntensity={1.1}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
