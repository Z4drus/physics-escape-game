"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Color } from "three";
import type { Group, Mesh, MeshStandardMaterial } from "three";

import { LAB } from "@/features/game/components/scene/materials";

/** Hauteur du plateau de la paillasse : tout le matériel repose dessus. */
const BENCH_TOP = 0.56;

/** Teintes bornant la couleur du liquide chauffé (froid → chaud). */
const COLD_LIQUID = new Color(LAB.fluid);
const HOT_LIQUID = new Color(LAB.warning);
/** Couleur de travail réutilisée à chaque image : zéro allocation dans `useFrame`. */
const WORKING_LIQUID = new Color();

/** Colonne de mercure du thermomètre : base et hauteur à pleine échelle. */
const MERCURY_BASE = -0.085;
const MERCURY_HEIGHT = 0.22;

/** Trajet de la vapeur au-dessus du bécher. */
const STEAM_BASE = 0.9;
const STEAM_RISE = 0.34;

/** Bouffées de vapeur : chacune boucle à son propre rythme. */
const STEAM_PUFFS: {
  x: number;
  z: number;
  radius: number;
  phase: number;
  speed: number;
}[] = [
  { x: 0.31, z: 0.0, radius: 0.03, phase: 0.0, speed: 0.3 },
  { x: 0.37, z: 0.05, radius: 0.024, phase: 0.22, speed: 0.26 },
  { x: 0.33, z: 0.07, radius: 0.02, phase: 0.45, speed: 0.34 },
  { x: 0.38, z: -0.03, radius: 0.027, phase: 0.66, speed: 0.28 },
  { x: 0.34, z: 0.01, radius: 0.022, phase: 0.85, speed: 0.32 },
];

/** Pieds de la paillasse, en [x, z]. */
const BENCH_LEGS: [number, number][] = [
  [-0.66, -0.4],
  [0.66, -0.4],
  [-0.66, 0.4],
  [0.66, 0.4],
];

/** Glaçons posés en vrac sur la soucoupe. */
const ICE_CUBES: {
  position: [number, number, number];
  rotation: [number, number, number];
  size: number;
}[] = [
  { position: [-0.11, 0.612, 0.3], rotation: [0.12, 0.42, 0.08], size: 0.072 },
  { position: [-0.02, 0.608, 0.36], rotation: [0.05, -0.6, 0.16], size: 0.064 },
  { position: [-0.06, 0.665, 0.325], rotation: [0.24, 0.9, -0.1], size: 0.058 },
];

/**
 * Poste « Chaleur » : un vase calorimétrique à double paroi équipé de son
 * thermomètre et de son agitateur, une plaque chauffante surmontée d'un bécher
 * qui fume, et quelques glaçons en attente.
 *
 * Repère local : (0, 0, 0) = centre du dessus du socle, poste allongé selon X.
 * Encombrement 1,50 (X) × 1,00 (Z) × 1,29 (hauteur).
 */
export function CalorimeterProp({ solved }: { solved: boolean }) {
  const liquidMaterial = useRef<MeshStandardMaterial>(null);
  const plateMaterial = useRef<MeshStandardMaterial>(null);
  const lamp = useRef<Mesh>(null);
  const lampMaterial = useRef<MeshStandardMaterial>(null);
  const mercury = useRef<Mesh>(null);
  const stirrer = useRef<Group>(null);
  const steamMeshes = useRef<(Mesh | null)[]>([]);
  const steamMaterials = useRef<(MeshStandardMaterial | null)[]>([]);

  /** Niveau de chauffe lissé : 0 = froid, 1 = chaud. */
  const heat = useRef(0);
  /** Apaisement progressif de l'animation une fois la station résolue. */
  const calm = useRef(0);

  const accent = solved ? LAB.solved : LAB.warning;

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;

    // Lissages exponentiels : le rendu reste identique quel que soit le framerate.
    calm.current +=
      ((solved ? 1 : 0) - calm.current) * (1 - Math.exp(-2.5 * delta));
    const target = (Math.sin(time * 0.45) + 1) / 2;
    heat.current += (target - heat.current) * (1 - Math.exp(-1.8 * delta));

    // Une station résolue garde son cycle, mais avec une amplitude réduite.
    const agitation = 1 - calm.current * 0.6;
    const level = heat.current * agitation;
    const pulse = (Math.sin(time * 3.2) + 1) / 2;

    if (liquidMaterial.current) {
      WORKING_LIQUID.lerpColors(COLD_LIQUID, HOT_LIQUID, level);
      liquidMaterial.current.color.copy(WORKING_LIQUID);
      liquidMaterial.current.emissiveIntensity = 0.18 + level * 0.5;
    }
    if (plateMaterial.current) {
      plateMaterial.current.emissiveIntensity = 0.12 + level * 1.15;
    }
    if (lampMaterial.current) {
      lampMaterial.current.emissiveIntensity = 0.7 + pulse * 1.9 * agitation;
    }
    if (lamp.current) {
      lamp.current.scale.setScalar(1 + pulse * 0.14 * agitation);
    }
    if (mercury.current) {
      // La colonne monte depuis le réservoir : on recentre le cylindre étiré.
      const fill = 0.3 + level * 0.7;
      mercury.current.scale.y = fill;
      mercury.current.position.y = MERCURY_BASE + (MERCURY_HEIGHT * fill) / 2;
    }
    if (stirrer.current) {
      // Rotation intégrée : un changement de vitesse ne provoque pas de saut.
      stirrer.current.rotation.y += delta * 1.7 * agitation;
    }

    for (let index = 0; index < STEAM_PUFFS.length; index += 1) {
      const puff = STEAM_PUFFS[index];
      const mesh = steamMeshes.current[index];
      const material = steamMaterials.current[index];
      if (!mesh || !material) continue;

      const progress = (time * puff.speed + puff.phase) % 1;
      mesh.position.x =
        puff.x + Math.sin(progress * 5 + puff.phase * 7) * 0.035;
      mesh.position.y = STEAM_BASE + progress * STEAM_RISE;
      mesh.scale.setScalar(0.55 + progress * 1.05);
      // Apparition puis évanouissement sur un demi-arche de sinus.
      material.opacity =
        Math.sin(progress * Math.PI) * 0.34 * (0.5 + agitation * 0.5);
    }
  });

  return (
    <group>
      <LabBench />

      {/* Vase calorimétrique : enveloppe extérieure et couronne isolante */}
      <mesh position={[-0.42, BENCH_TOP + 0.14, 0.06]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.28, 24]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.32}
          metalness={0.85}
        />
      </mesh>
      <mesh
        position={[-0.42, BENCH_TOP + 0.28, 0.06]}
        rotation-x={-Math.PI / 2}
      >
        <torusGeometry args={[0.2, 0.014, 6, 32]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.4}
          metalness={0.7}
        />
      </mesh>
      {/* Cuve intérieure, plus haute que l'enveloppe : la double paroi se lit */}
      <mesh position={[-0.42, BENCH_TOP + 0.15, 0.06]}>
        <cylinderGeometry args={[0.152, 0.152, 0.3, 20]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.45}
          metalness={0.6}
        />
      </mesh>

      {/* Couvercle et ses deux passages, pour le thermomètre et l'agitateur */}
      <mesh position={[-0.42, 0.873, 0.06]}>
        <cylinderGeometry args={[0.168, 0.168, 0.026, 24]} />
        <meshStandardMaterial
          color={LAB.panel}
          roughness={0.6}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[-0.36, 0.888, 0.1]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[0.02, 0.006, 6, 16]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.5}
          metalness={0.6}
        />
      </mesh>
      <mesh position={[-0.48, 0.888, 0.02]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[0.02, 0.006, 6, 16]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.5}
          metalness={0.6}
        />
      </mesh>

      {/* Thermomètre incliné : tube de verre, colonne animée, réservoir */}
      <group position={[-0.36, 0.845, 0.1]} rotation-z={-0.3}>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.011, 0.011, 0.44, 12]} />
          <meshStandardMaterial
            color={LAB.glass}
            transparent
            opacity={0.3}
            roughness={0.1}
            metalness={0.05}
          />
        </mesh>
        <mesh
          ref={mercury}
          position={[0, MERCURY_BASE + MERCURY_HEIGHT / 2, 0]}
        >
          <cylinderGeometry args={[0.005, 0.005, MERCURY_HEIGHT, 8]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={1.1}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <sphereGeometry args={[0.019, 12, 10]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={0.9}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0.365, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.03, 10]} />
          <meshStandardMaterial
            color={LAB.metalDark}
            roughness={0.5}
            metalness={0.6}
          />
        </mesh>
      </group>

      {/* Agitateur : tige, disque annulaire immergé et poignée en boucle */}
      <group ref={stirrer} position={[-0.48, 0.7, 0.02]}>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.38, 10]} />
          <meshStandardMaterial
            color={LAB.metal}
            roughness={0.3}
            metalness={0.85}
          />
        </mesh>
        <mesh position={[0, -0.04, 0]} rotation-x={-Math.PI / 2}>
          <torusGeometry args={[0.05, 0.007, 6, 20]} />
          <meshStandardMaterial
            color={LAB.metal}
            roughness={0.3}
            metalness={0.85}
          />
        </mesh>
        <mesh position={[0, 0.335, 0]}>
          <torusGeometry args={[0.032, 0.007, 6, 18]} />
          <meshStandardMaterial
            color={LAB.metal}
            roughness={0.3}
            metalness={0.85}
          />
        </mesh>
      </group>

      {/* Plaque chauffante : bâti, platine rougissante, molette et voyant */}
      <mesh position={[0.34, BENCH_TOP + 0.05, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.1, 0.36]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.6}
          metalness={0.35}
        />
      </mesh>
      <mesh position={[0.34, BENCH_TOP + 0.11, 0.02]}>
        <cylinderGeometry args={[0.15, 0.15, 0.02, 28]} />
        <meshStandardMaterial
          ref={plateMaterial}
          color={LAB.metalDark}
          emissive={accent}
          emissiveIntensity={0.12}
          roughness={0.4}
          metalness={0.7}
        />
      </mesh>
      <mesh position={[0.47, 0.605, 0.205]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.035, 0.035, 0.03, 16]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.35}
          metalness={0.8}
        />
      </mesh>
      <mesh ref={lamp} position={[0.21, 0.605, 0.205]}>
        <sphereGeometry args={[0.022, 12, 10]} />
        <meshStandardMaterial
          ref={lampMaterial}
          color={accent}
          emissive={accent}
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>

      {/* Bécher en verre gradué et son liquide, qui passe du froid au chaud */}
      <mesh position={[0.34, 0.78, 0.02]}>
        <cylinderGeometry args={[0.11, 0.1, 0.2, 24]} />
        <meshStandardMaterial
          color={LAB.glass}
          transparent
          opacity={0.2}
          roughness={0.08}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[0.34, 0.745, 0.02]}>
        <cylinderGeometry args={[0.093, 0.088, 0.13, 20]} />
        <meshStandardMaterial
          ref={liquidMaterial}
          color={LAB.fluid}
          emissive={accent}
          emissiveIntensity={0.18}
          transparent
          opacity={0.85}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[0.34, 0.88, 0.02]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[0.11, 0.006, 6, 28]} />
        <meshStandardMaterial
          color={LAB.accentLight}
          transparent
          opacity={0.5}
          roughness={0.1}
        />
      </mesh>
      <mesh position={[0.34, 0.755, 0.02]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[0.105, 0.0035, 6, 24]} />
        <meshStandardMaterial
          color={LAB.accentLight}
          emissive={LAB.accent}
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[0.34, 0.815, 0.02]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[0.108, 0.0035, 6, 24]} />
        <meshStandardMaterial
          color={LAB.accentLight}
          emissive={LAB.accent}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Vapeur : les bouffées montent, grossissent puis s'estompent en boucle */}
      {STEAM_PUFFS.map((puff, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            steamMeshes.current[index] = mesh;
          }}
          position={[puff.x, STEAM_BASE, puff.z]}
        >
          <sphereGeometry args={[puff.radius, 10, 8]} />
          <meshStandardMaterial
            ref={(material) => {
              steamMaterials.current[index] = material;
            }}
            color={LAB.accentLight}
            emissive={LAB.accentLight}
            emissiveIntensity={0.35}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}

      <IceCubes />
    </group>
  );
}

/** Paillasse du poste : plateau, étagère basse et quatre pieds tubulaires. */
function LabBench() {
  return (
    <group>
      <mesh position={[0, BENCH_TOP - 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.06, 1]} />
        <meshStandardMaterial
          color={LAB.panel}
          roughness={0.65}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[0, 0.16, 0]} receiveShadow>
        <boxGeometry args={[1.36, 0.03, 0.84]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.8}
          metalness={0.15}
        />
      </mesh>
      {BENCH_LEGS.map(([x, z], index) => (
        <mesh key={index} position={[x, 0.25, z]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.5, 12]} />
          <meshStandardMaterial
            color={LAB.metalDark}
            roughness={0.45}
            metalness={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Glaçons translucides sur leur soucoupe, réserve de froid du montage. */
function IceCubes() {
  return (
    <group>
      <mesh position={[-0.05, BENCH_TOP + 0.007, 0.33]} receiveShadow>
        <cylinderGeometry args={[0.13, 0.13, 0.014, 20]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.35}
          metalness={0.8}
        />
      </mesh>
      {ICE_CUBES.map((cube, index) => (
        <mesh key={index} position={cube.position} rotation={cube.rotation}>
          <boxGeometry args={[cube.size, cube.size, cube.size]} />
          <meshStandardMaterial
            color={LAB.glass}
            transparent
            opacity={0.38}
            roughness={0.15}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}
