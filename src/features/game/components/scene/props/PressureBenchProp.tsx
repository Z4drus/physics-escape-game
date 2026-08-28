"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { DoubleSide } from "three";
import type { Group, Mesh, MeshStandardMaterial } from "three";

import { LAB } from "@/features/game/components/scene/materials";

/** Face supérieure du plateau de la paillasse (origine = dessus du socle). */
const BENCH_TOP = 0.88;

/* --- Colonne d'eau graduée --- */
const COLUMN_X = -0.76;
const COLUMN_Z = -0.05;
const COLUMN_BASE = 0.93;
const COLUMN_HEIGHT = 0.8;
/** Le fond de la colonne d'eau, juste au-dessus de l'embase. */
const WATER_BASE = 0.94;
const WATER_MIN = 0.26;
const WATER_MAX = 0.68;

/* --- Manomètre à cadran --- */
const DIAL_X = -0.3;
const DIAL_Y = 1.3;
const DIAL_Z = -0.3;
/** Demi-ouverture du balayage de l'aiguille, en radians. */
const NEEDLE_SWEEP = 1.15;

/* --- Presse hydraulique --- */
const SMALL_PISTON_X = 0.25;
const LARGE_PISTON_X = 0.78;
const SMALL_PISTON_RADIUS = 0.05;
const LARGE_PISTON_RADIUS = 0.11;
/**
 * Rapport des sections S₂/S₁ des deux pistons (≈ 4,84).
 * C'est lui qui inverse les amplitudes : à volume de fluide constant,
 * le grand piston se déplace d'autant moins que sa section est grande.
 */
const SECTION_RATIO =
  (LARGE_PISTON_RADIUS * LARGE_PISTON_RADIUS) /
  (SMALL_PISTON_RADIUS * SMALL_PISTON_RADIUS);
/** Course du petit piston (celle du grand en découle). */
const SMALL_PISTON_STROKE = 0.11;

/* --- Cloche à vide --- */
const BELL_X = -0.3;
const BELL_Z = 0.3;

/** Amortissement de l'animation quand le poste est résolu. */
const SOLVED_CALM = 0.35;

/**
 * Facteur de rattrapage indépendant du framerate.
 * `k` est la vitesse de convergence : plus il est grand, plus la valeur
 * colle à sa cible.
 */
function smoothing(k: number, delta: number): number {
  return 1 - Math.exp(-k * delta);
}

/**
 * Banc de pression : le poste du thème « Pression ».
 *
 * La paillasse rassemble quatre démonstrations lisibles d'un coup d'œil :
 * une colonne d'eau graduée dont le niveau respire, un manomètre à cadran
 * dont l'aiguille balaie son arc, une presse hydraulique dont les deux
 * pistons bougent en sens inverse avec des courses inversement
 * proportionnelles à leurs sections, et une cloche à vide où un ballon
 * gonfle à mesure que l'air est aspiré.
 *
 * Repère local : (0, 0, 0) = centre du dessus du socle, poste allongé
 * selon X. Encombrement 1,90 × 1,15 × 1,73 (X × Z × hauteur).
 */
export function PressureBenchProp({ solved }: { solved: boolean }) {
  const accent = solved ? LAB.solved : LAB.accent;
  const calm = solved ? SOLVED_CALM : 1;

  return (
    <group>
      <Bench accent={accent} />
      <WaterColumn accent={accent} calm={calm} />
      <Manometer accent={accent} calm={calm} />
      <HydraulicPress accent={accent} calm={calm} />
      <VacuumBell accent={accent} calm={calm} />
    </group>
  );
}

/** Paillasse porteuse : plateau, joues, tablette basse et bandeau d'accent. */
function Bench({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.06, 1.15]} />
        <meshStandardMaterial
          color={LAB.panel}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {/* Joues latérales tenant le plateau */}
      <mesh position={[-0.86, 0.41, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.06, 0.82, 1.05]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.75}
          metalness={0.15}
        />
      </mesh>
      <mesh position={[0.86, 0.41, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.06, 0.82, 1.05]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.75}
          metalness={0.15}
        />
      </mesh>

      <mesh position={[0, 0.28, 0]} receiveShadow>
        <boxGeometry args={[1.72, 0.04, 0.95]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Bandeau de façade : porte la couleur d'accent du poste */}
      <mesh position={[0, 0.8, 0.565]}>
        <boxGeometry args={[1.9, 0.035, 0.03]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={1.1}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Colonne d'eau graduée : le liquide monte et descend lentement dans un
 * tube de verre, un ménisque lumineux marque le niveau à lire.
 */
function WaterColumn({ accent, calm }: { accent: string; calm: number }) {
  const water = useRef<Mesh>(null);
  const meniscus = useRef<Mesh>(null);
  const meniscusMaterial = useRef<MeshStandardMaterial>(null);
  const level = useRef(WATER_MIN);

  useFrame(({ clock }, delta) => {
    // Respiration lente entre le niveau bas et le niveau haut.
    const wave = (Math.sin(clock.elapsedTime * 0.55) + 1) / 2;
    const target = WATER_MIN + (WATER_MAX - WATER_MIN) * calm * wave;

    level.current += (target - level.current) * smoothing(2.4, delta);

    if (water.current) {
      // Le cylindre a une hauteur unitaire : on le met à l'échelle puis on
      // recale son centre pour garder sa base posée au fond du tube.
      water.current.scale.y = level.current;
      water.current.position.y = WATER_BASE + level.current / 2;
    }
    if (meniscus.current) {
      meniscus.current.position.y = WATER_BASE + level.current;
    }
    if (meniscusMaterial.current) {
      meniscusMaterial.current.emissiveIntensity =
        1.1 + (level.current - WATER_MIN) * 1.6;
    }
  });

  return (
    <group position={[COLUMN_X, 0, COLUMN_Z]}>
      {/* Embase lestée */}
      <mesh position={[0, 0.905, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.11, 0.12, 0.05, 24]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.45}
          metalness={0.7}
        />
      </mesh>

      {/* Tube de verre */}
      <mesh position={[0, COLUMN_BASE + COLUMN_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.055, 0.055, COLUMN_HEIGHT, 24, 1, true]} />
        <meshPhysicalMaterial
          color={LAB.glass}
          transparent
          opacity={0.2}
          roughness={0.06}
          metalness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.1}
          side={DoubleSide}
        />
      </mesh>

      <mesh
        ref={water}
        position={[0, WATER_BASE + WATER_MIN / 2, 0]}
        scale-y={WATER_MIN}
      >
        <cylinderGeometry args={[0.048, 0.048, 1, 20]} />
        <meshStandardMaterial
          color={LAB.fluid}
          transparent
          opacity={0.72}
          roughness={0.25}
          metalness={0.1}
        />
      </mesh>

      {/* Ménisque : c'est lui que le joueur lit sur les graduations */}
      <mesh ref={meniscus} position={[0, WATER_BASE + WATER_MIN, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.008, 20]} />
        <meshStandardMaterial
          ref={meniscusMaterial}
          color={accent}
          emissive={accent}
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>

      {/* Graduations */}
      <mesh position={[0, 1.1, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.058, 0.005, 8, 20]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
      <mesh position={[0, 1.42, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.058, 0.005, 8, 20]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>

      {/* Collier de tête */}
      <mesh position={[0, 1.7, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.058, 0.011, 8, 20]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.4}
          metalness={0.7}
        />
      </mesh>
    </group>
  );
}

/**
 * Manomètre monté sur potence : l'aiguille balaie l'arc gradué du cadran,
 * tourné vers l'avant du poste (+Z local).
 */
function Manometer({ accent, calm }: { accent: string; calm: number }) {
  const needle = useRef<Group>(null);
  const angle = useRef(0);

  useFrame(({ clock }, delta) => {
    const target =
      -Math.sin(clock.elapsedTime * 0.8 + 1.2) * NEEDLE_SWEEP * calm;
    angle.current += (target - angle.current) * smoothing(3.2, delta);

    if (needle.current) {
      needle.current.rotation.z = angle.current;
    }
  });

  return (
    <group position={[DIAL_X, 0, DIAL_Z]}>
      {/* Potence */}
      <mesh position={[0, (BENCH_TOP + DIAL_Y) / 2, 0]}>
        <cylinderGeometry args={[0.018, 0.024, DIAL_Y - BENCH_TOP, 12]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.35}
          metalness={0.8}
        />
      </mesh>

      {/* Boîtier du cadran */}
      <mesh position={[0, DIAL_Y, 0]} rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.06, 28]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.4}
          metalness={0.75}
        />
      </mesh>

      {/* Fond de cadran */}
      <mesh position={[0, DIAL_Y, 0.034]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.135, 0.135, 0.008, 28]} />
        <meshStandardMaterial
          color={LAB.panel}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Arc de graduations */}
      <mesh position={[0, DIAL_Y, 0.041]}>
        <ringGeometry
          args={[0.112, 0.134, 32, 1, Math.PI * 0.16, Math.PI * 0.68]}
        />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={1}
          toneMapped={false}
        />
      </mesh>

      {/* Lunette */}
      <mesh position={[0, DIAL_Y, 0.032]}>
        <torusGeometry args={[0.15, 0.012, 8, 32]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.3}
          metalness={0.85}
        />
      </mesh>

      {/* Aiguille : le groupe pivote sur l'axe du cadran */}
      <group ref={needle} position={[0, DIAL_Y, 0.048]}>
        <mesh position={[0, 0.056, 0]}>
          <boxGeometry args={[0.012, 0.112, 0.008]} />
          <meshStandardMaterial
            color={LAB.warning}
            emissive={LAB.warning}
            emissiveIntensity={1.4}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Presse hydraulique miniature : deux corps de verre de sections très
 * différentes reliés par un tube plein de fluide. Les pistons descendent et
 * remontent en opposition, la course du grand étant divisée par le rapport
 * des sections — c'est la démonstration du principe de Pascal.
 */
function HydraulicPress({ accent, calm }: { accent: string; calm: number }) {
  const smallPiston = useRef<Group>(null);
  const largePiston = useRef<Group>(null);
  const stroke = useRef(0);

  useFrame(({ clock }, delta) => {
    const target =
      Math.sin(clock.elapsedTime * 0.75) * SMALL_PISTON_STROKE * calm;
    stroke.current += (target - stroke.current) * smoothing(2.8, delta);

    if (smallPiston.current) {
      smallPiston.current.position.y = stroke.current;
    }
    if (largePiston.current) {
      // Sens inverse et amplitude divisée par le rapport des sections.
      largePiston.current.position.y = -stroke.current / SECTION_RATIO;
    }
  });

  return (
    <group>
      {/* Plaque de base */}
      <mesh position={[0.515, 0.905, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.86, 0.05, 0.44]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.6}
          metalness={0.35}
        />
      </mesh>

      {/* Tube de liaison rempli de fluide */}
      <mesh position={[0.515, 0.975, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.028, 0.028, 0.53, 16]} />
        <meshStandardMaterial
          color={LAB.fluid}
          emissive={LAB.fluid}
          emissiveIntensity={0.35}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      {/* Corps de verre du petit piston (faible section) */}
      <mesh position={[SMALL_PISTON_X, 1.12, 0]}>
        <cylinderGeometry
          args={[SMALL_PISTON_RADIUS, SMALL_PISTON_RADIUS, 0.34, 20, 1, true]}
        />
        <meshPhysicalMaterial
          color={LAB.glass}
          transparent
          opacity={0.2}
          roughness={0.06}
          metalness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.1}
          side={DoubleSide}
        />
      </mesh>

      {/* Corps de verre du grand piston (grande section) */}
      <mesh position={[LARGE_PISTON_X, 1.07, 0]}>
        <cylinderGeometry
          args={[LARGE_PISTON_RADIUS, LARGE_PISTON_RADIUS, 0.24, 24, 1, true]}
        />
        <meshPhysicalMaterial
          color={LAB.glass}
          transparent
          opacity={0.2}
          roughness={0.06}
          metalness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.1}
          side={DoubleSide}
        />
      </mesh>

      {/* Fluide au fond des deux corps */}
      <mesh position={[SMALL_PISTON_X, 0.9725, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.045, 20]} />
        <meshStandardMaterial
          color={LAB.fluid}
          transparent
          opacity={0.85}
          roughness={0.25}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[LARGE_PISTON_X, 0.9725, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.045, 24]} />
        <meshStandardMaterial
          color={LAB.fluid}
          transparent
          opacity={0.85}
          roughness={0.25}
          metalness={0.1}
        />
      </mesh>

      {/* Petit piston : grande course */}
      <group ref={smallPiston}>
        <mesh position={[SMALL_PISTON_X, 1.14, 0]}>
          <cylinderGeometry args={[0.044, 0.044, 0.045, 20]} />
          <meshStandardMaterial
            color={LAB.metal}
            roughness={0.35}
            metalness={0.8}
          />
        </mesh>
        <mesh position={[SMALL_PISTON_X, 1.3125, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.3, 12]} />
          <meshStandardMaterial
            color={LAB.metal}
            roughness={0.3}
            metalness={0.85}
          />
        </mesh>
        <mesh position={[SMALL_PISTON_X, 1.4725, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.075, 0.02, 20]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={0.7}
            roughness={0.4}
            metalness={0.5}
          />
        </mesh>
      </group>

      {/* Grand piston : course divisée par le rapport des sections */}
      <group ref={largePiston}>
        <mesh position={[LARGE_PISTON_X, 1.07, 0]}>
          <cylinderGeometry args={[0.104, 0.104, 0.04, 24]} />
          <meshStandardMaterial
            color={LAB.metal}
            roughness={0.35}
            metalness={0.8}
          />
        </mesh>
        <mesh position={[LARGE_PISTON_X, 1.17, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.16, 12]} />
          <meshStandardMaterial
            color={LAB.metal}
            roughness={0.3}
            metalness={0.85}
          />
        </mesh>
        <mesh position={[LARGE_PISTON_X, 1.261, 0]} castShadow>
          <cylinderGeometry args={[0.155, 0.155, 0.022, 24]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={0.7}
            roughness={0.4}
            metalness={0.5}
          />
        </mesh>
        {/* Masse soulevée par le grand piston */}
        <mesh position={[LARGE_PISTON_X, 1.332, 0]} castShadow>
          <boxGeometry args={[0.16, 0.12, 0.16]} />
          <meshStandardMaterial
            color={LAB.warning}
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Cloche à vide et sa pompe : le ballon enfermé sous la cloche gonfle à
 * mesure que la pression extérieure baisse, puis se rétracte.
 */
function VacuumBell({ accent, calm }: { accent: string; calm: number }) {
  const balloon = useRef<Mesh>(null);
  const swell = useRef(1);

  useFrame(({ clock }, delta) => {
    // Plus la cloche se vide, plus le ballon prend du volume.
    const wave = (Math.sin(clock.elapsedTime * 0.45 - 0.6) + 1) / 2;
    const target = 1 + wave * 0.45 * calm;
    swell.current += (target - swell.current) * smoothing(1.8, delta);

    if (balloon.current) {
      balloon.current.scale.setScalar(swell.current);
    }
  });

  return (
    <group position={[BELL_X, 0, BELL_Z]}>
      {/* Platine d'étanchéité */}
      <mesh position={[0, 0.895, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.14, 0.145, 0.03, 24]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.45}
          metalness={0.7}
        />
      </mesh>

      {/* Cloche : fût de verre puis calotte */}
      <mesh position={[0, 0.99, 0]}>
        <cylinderGeometry args={[0.115, 0.115, 0.16, 24, 1, true]} />
        <meshPhysicalMaterial
          color={LAB.glass}
          transparent
          opacity={0.18}
          roughness={0.06}
          metalness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.1}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 1.07, 0]}>
        <sphereGeometry
          args={[0.115, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshPhysicalMaterial
          color={LAB.glass}
          transparent
          opacity={0.18}
          roughness={0.06}
          metalness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.1}
          side={DoubleSide}
        />
      </mesh>

      {/* Ballon témoin */}
      <mesh ref={balloon} position={[0, 0.99, 0]}>
        <sphereGeometry args={[0.05, 16, 12]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.8}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>

      {/* Pompe à vide et son flexible */}
      <mesh position={[-0.32, 0.935, 0.04]} castShadow receiveShadow>
        <boxGeometry args={[0.19, 0.11, 0.14]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.65}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[-0.14, 0.9, 0.01]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.014, 0.014, 0.24, 10]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.7}
          metalness={0.35}
        />
      </mesh>
    </group>
  );
}
