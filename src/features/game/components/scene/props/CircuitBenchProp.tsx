"use client";

import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import { useMemo, useRef } from "react";
import type { Group, Mesh, MeshStandardMaterial, PointLight } from "three";
import { CatmullRomCurve3, MathUtils, Vector3 } from "three";

import { LAB } from "@/features/game/components/scene/materials";

/** Hauteur de la face supérieure du plateau, dans le repère local du poste. */
const TOP = 0.9;

type ControlPoint = readonly [number, number, number];

/**
 * Tracés des fils de connexion, en points de contrôle du repère local.
 * L'ordre des points donne le sens conventionnel du courant : alimentation →
 * interrupteur → résistances → ampoule → multimètre, puis retour par le fil
 * qui pend jusqu'à l'étagère basse.
 */
const WIRE_PATHS: readonly (readonly ControlPoint[])[] = [
  // Borne « + » de l'alimentation → interrupteur → première résistance.
  [
    [-0.47, 1.06, -0.05],
    [-0.42, 1.14, 0.04],
    [-0.34, 1.05, 0.09],
    [-0.27, 0.98, 0.11],
    [-0.2, 1.02, 0.04],
    [-0.13, 0.99, -0.03],
    [-0.1, 0.985, -0.06],
  ],
  // Seconde résistance → douille de l'ampoule.
  [
    [0.295, 0.985, 0.08],
    [0.36, 1.07, 0.09],
    [0.44, 1.05, 0.06],
    [0.49, 0.99, 0.045],
    [0.5, 0.955, 0.035],
  ],
  // Multimètre → plaque de montage, en grande boucle devant la paillasse.
  [
    [0.665, 0.94, 0.155],
    [0.62, 1.03, 0.28],
    [0.48, 1.02, 0.38],
    [0.3, 0.98, 0.4],
    [0.16, 0.95, 0.3],
    [0.13, 0.96, 0.17],
    [0.145, 0.985, 0.085],
  ],
  // Fil de retour qui déborde du plateau et pend jusqu'à l'étagère basse.
  [
    [-0.47, 0.97, -0.05],
    [-0.52, 1.0, 0.1],
    [-0.58, 0.94, 0.34],
    [-0.63, 0.86, 0.52],
    [-0.67, 0.62, 0.56],
    [-0.72, 0.4, 0.48],
    [-0.76, 0.3, 0.28],
  ],
];

/**
 * Gaine de chaque fil, dans l'ordre de `WIRE_PATHS` : la phase est repérée en
 * orange, la dérivation en bleu, les retours en gaine sombre.
 */
const WIRE_COLORS: readonly string[] = [
  LAB.warning,
  LAB.accent,
  LAB.panel,
  LAB.metalDark,
];

/** Points lumineux matérialisant le courant : fil parcouru et décalage initial. */
const CURRENT_DOTS: readonly { wire: number; offset: number }[] = [
  { wire: 0, offset: 0.0 },
  { wire: 1, offset: 0.35 },
  { wire: 2, offset: 0.1 },
  { wire: 2, offset: 0.62 },
  { wire: 3, offset: 0.45 },
];

/** Pieds de la paillasse, en coordonnées (x, z). */
const LEG_POSITIONS: readonly (readonly [number, number])[] = [
  [-0.86, -0.48],
  [0.86, -0.48],
  [-0.86, 0.48],
  [0.86, 0.48],
];

// Vecteur réutilisé d'une frame à l'autre : aucune allocation dans la boucle.
const wirePoint = new Vector3();

/**
 * Banc d'électricité du thème « Électricité » : alimentation stabilisée,
 * plaque de montage avec deux résistances baguées, ampoule sur douille,
 * interrupteur à bascule, multimètre à aiguille et fils souples câblés entre
 * les appareils. L'ampoule pulse, l'aiguille oscille et des points lumineux
 * remontent les fils pour matérialiser le courant ; tout se stabilise une fois
 * la station résolue.
 *
 * Repère local : (0, 0, 0) au centre du dessus du socle, poste allongé sur X.
 */
export function CircuitBenchProp({ solved }: { solved: boolean }) {
  const bulb = useRef<Mesh>(null);
  const bulbMaterial = useRef<MeshStandardMaterial>(null);
  const bulbLight = useRef<PointLight>(null);
  const needle = useRef<Group>(null);
  const supplyScreen = useRef<MeshStandardMaterial>(null);
  const dots = useRef<(Mesh | null)[]>([]);

  const accent = solved ? LAB.solved : LAB.accent;
  const glow = solved ? LAB.solved : LAB.warning;

  // Les courbes ne dépendent d'aucun état : elles survivent aux rendus.
  const wires = useMemo(
    () =>
      WIRE_PATHS.map(
        (path) =>
          new CatmullRomCurve3(
            path.map(([x, y, z]) => new Vector3(x, y, z)),
            false,
            "catmullrom",
            0.4,
          ),
      ),
    [],
  );

  useFrame(({ clock }, delta) => {
    const elapsed = clock.elapsedTime;
    // Lissage exponentiel : indépendant du framerate, sans à-coups.
    const smoothing = 1 - Math.exp(-6 * delta);
    const pulse = (Math.sin(elapsed * 2.4) + 1) / 2;

    if (bulbMaterial.current) {
      const target = solved ? 2.6 : 0.7 + pulse * 1.9;
      bulbMaterial.current.emissiveIntensity = MathUtils.lerp(
        bulbMaterial.current.emissiveIntensity,
        target,
        smoothing,
      );
    }
    if (bulb.current) {
      // Léger gonflement du bulbe, figé quand la station est résolue.
      const target = solved ? 1 : 1 + pulse * 0.04;
      bulb.current.scale.setScalar(
        MathUtils.lerp(bulb.current.scale.x, target, smoothing),
      );
    }
    if (bulbLight.current) {
      const target = solved ? 3.4 : 0.8 + pulse * 2.4;
      bulbLight.current.intensity = MathUtils.lerp(
        bulbLight.current.intensity,
        target,
        smoothing,
      );
    }
    if (needle.current) {
      // Deux harmoniques : une lente pour la mesure, une rapide pour la nervosité.
      const target = solved
        ? 0.4
        : 0.12 +
          Math.sin(elapsed * 2.2) * 0.32 +
          Math.sin(elapsed * 6.1) * 0.05;
      needle.current.rotation.z = MathUtils.lerp(
        needle.current.rotation.z,
        target,
        smoothing,
      );
    }
    if (supplyScreen.current) {
      const target = solved ? 2.2 : 1.1 + pulse * 0.9;
      supplyScreen.current.emissiveIntensity = MathUtils.lerp(
        supplyScreen.current.emissiveIntensity,
        target,
        smoothing,
      );
    }

    const flowSpeed = solved ? 0.1 : 0.26;
    for (let index = 0; index < CURRENT_DOTS.length; index += 1) {
      const dot = dots.current[index];
      if (!dot) continue;
      const config = CURRENT_DOTS[index];
      // getPointAt travaille en abscisse curviligne : vitesse constante.
      wires[config.wire].getPointAt(
        (config.offset + elapsed * flowSpeed) % 1,
        wirePoint,
      );
      dot.position.copy(wirePoint);
    }
  });

  return (
    <group>
      <BenchFrame />
      <PowerSupply accentRef={supplyScreen} accent={accent} />
      <ResistorBoard />
      <ToggleSwitch />

      {/* Ampoule sur douille : le cœur vivant du poste */}
      <mesh position={[0.5, TOP + 0.07, -0.02]} castShadow>
        <cylinderGeometry args={[0.052, 0.058, 0.14, 16]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.4}
          metalness={0.75}
        />
      </mesh>
      <mesh position={[0.5, TOP + 0.14, -0.02]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.052, 0.012, 8, 20]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.3}
          metalness={0.85}
        />
      </mesh>
      <mesh ref={bulb} position={[0.5, TOP + 0.22, -0.02]}>
        <sphereGeometry args={[0.085, 20, 16]} />
        <meshStandardMaterial
          ref={bulbMaterial}
          color={LAB.glass}
          emissive={glow}
          emissiveIntensity={1.2}
          roughness={0.15}
          transparent
          opacity={0.88}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        ref={bulbLight}
        position={[0.5, TOP + 0.22, -0.02]}
        intensity={1.4}
        distance={2.4}
        decay={2}
        color={glow}
      />

      {/* Multimètre à cadran */}
      <mesh position={[0.76, TOP + 0.095, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.19, 0.26]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.55}
          metalness={0.35}
        />
      </mesh>
      <mesh position={[0.76, TOP + 0.085, 0.137]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.062, 0.062, 0.014, 24]} />
        <meshStandardMaterial color={LAB.panel} roughness={0.5} />
      </mesh>
      <group ref={needle} position={[0.76, TOP + 0.045, 0.148]}>
        <mesh position={[0, 0.045, 0]}>
          <boxGeometry args={[0.007, 0.09, 0.005]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={1.6}
            toneMapped={false}
          />
        </mesh>
      </group>
      <mesh position={[0.76, TOP + 0.155, 0.132]}>
        <boxGeometry args={[0.2, 0.048, 0.012]} />
        <meshStandardMaterial
          color={LAB.panel}
          emissive={accent}
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0.665, TOP + 0.04, 0.145]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.016, 0.016, 0.04, 10]} />
        <meshStandardMaterial
          color={LAB.warning}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
      <mesh position={[0.855, TOP + 0.04, 0.145]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.016, 0.016, 0.04, 10]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>

      {/* Fils souples : tubes extrudés le long des courbes mémorisées */}
      {wires.map((wire, index) => (
        <mesh key={`wire-${index}`}>
          <tubeGeometry args={[wire, 44, 0.011, 6, false]} />
          <meshStandardMaterial
            color={WIRE_COLORS[index]}
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>
      ))}

      {/* Courant matérialisé : les points sont repositionnés dans useFrame */}
      {CURRENT_DOTS.map((_, index) => (
        <mesh
          key={`current-${index}`}
          ref={(mesh) => {
            dots.current[index] = mesh;
          }}
        >
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={2.4}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Bâti de la paillasse : plateau, étagère basse, quatre pieds et dosseret. */
function BenchFrame() {
  return (
    <group>
      <mesh position={[0, TOP - 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.06, 1.15]} />
        <meshStandardMaterial
          color={LAB.panel}
          roughness={0.6}
          metalness={0.25}
        />
      </mesh>
      <mesh position={[0, 0.26, 0]} receiveShadow>
        <boxGeometry args={[1.72, 0.04, 0.95]} />
        <meshStandardMaterial color={LAB.frame} roughness={0.75} />
      </mesh>
      {LEG_POSITIONS.map(([x, z]) => (
        <mesh key={`leg-${x}:${z}`} position={[x, 0.44, z]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.88, 10]} />
          <meshStandardMaterial
            color={LAB.metalDark}
            roughness={0.35}
            metalness={0.8}
          />
        </mesh>
      ))}
      {/* Dosseret arrière : sert de retour de plan de travail aux câbles. */}
      <mesh position={[0, TOP + 0.07, -0.55]}>
        <boxGeometry args={[1.9, 0.14, 0.045]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
}

/**
 * Alimentation stabilisée : boîtier, afficheur de tension, deux molettes de
 * réglage et les bornes de sortie d'où partent les fils.
 */
function PowerSupply({
  accentRef,
  accent,
}: {
  accentRef: RefObject<MeshStandardMaterial | null>;
  accent: string;
}) {
  return (
    <group>
      <mesh position={[-0.62, TOP + 0.17, -0.3]} castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.34, 0.34]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.55}
          metalness={0.4}
        />
      </mesh>
      <mesh position={[-0.7, TOP + 0.26, -0.122]}>
        <boxGeometry args={[0.26, 0.1, 0.012]} />
        <meshStandardMaterial
          ref={accentRef}
          color={LAB.panel}
          emissive={accent}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-0.76, TOP + 0.11, -0.113]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.042, 0.042, 0.035, 16]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.35}
          metalness={0.7}
        />
      </mesh>
      <mesh position={[-0.64, TOP + 0.11, -0.113]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.042, 0.042, 0.035, 16]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.35}
          metalness={0.7}
        />
      </mesh>
      {/* Bornes de sortie : « + » signalée en orange, « − » en métal sombre. */}
      <mesh position={[-0.47, TOP + 0.16, -0.1]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.019, 0.019, 0.06, 10]} />
        <meshStandardMaterial
          color={LAB.warning}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
      <mesh position={[-0.47, TOP + 0.07, -0.1]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.019, 0.019, 0.06, 10]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
    </group>
  );
}

/** Plaque de montage supportant les deux résistances baguées. */
function ResistorBoard() {
  return (
    <group>
      <mesh position={[0.1, TOP + 0.014, 0.02]} receiveShadow>
        <boxGeometry args={[0.66, 0.028, 0.4]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.65}
          metalness={0.15}
        />
      </mesh>
      <BandedResistor position={[-0.02, TOP + 0.085, -0.06]} />
      <BandedResistor position={[0.22, TOP + 0.085, 0.08]} />
    </group>
  );
}

/**
 * Résistance couchée sur la plaque, corps cylindrique et deux bagues de code
 * couleur. Le corps est orienté selon X par la rotation du groupe.
 */
function BandedResistor({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation-z={Math.PI / 2}>
      <mesh>
        <cylinderGeometry args={[0.026, 0.026, 0.15, 12]} />
        <meshStandardMaterial color={LAB.warning} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.038, 0]}>
        <cylinderGeometry args={[0.029, 0.029, 0.014, 12]} />
        <meshStandardMaterial color={LAB.frame} roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.012, 0]}>
        <cylinderGeometry args={[0.029, 0.029, 0.014, 12]} />
        <meshStandardMaterial color={LAB.accent} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Interrupteur à bascule, levier figé en position « circuit fermé ». */
function ToggleSwitch() {
  return (
    <group position={[-0.26, TOP, 0.1]}>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.16, 0.06, 0.12]} />
        <meshStandardMaterial
          color={LAB.panel}
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0, 0.075, 0.018]} rotation-x={-0.55}>
        <boxGeometry args={[0.055, 0.05, 0.032]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
}
