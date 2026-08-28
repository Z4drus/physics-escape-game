"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import { DoubleSide, MathUtils } from "three";

import { LAB } from "@/features/game/components/scene/materials";
import type { Vec3 } from "@/types/game";

/** Hauteur du plateau de paillasse (le dessus du socle est à y = 0). */
const BENCH_TOP = 0.9;
/** Inclinaison de la rampe, en radians (≈ 20°). */
const INCLINE = 0.36;

/**
 * Course du bloc le long de la rampe, exprimée dans le repère local de la
 * rampe : l'axe X y suit la pente, l'origine étant la charnière.
 */
const BLOCK_LOW = 0.14;
const BLOCK_SPAN = 0.22;
const BLOCK_HALF = 0.065;
/** Abscisse du crochet du dynamomètre sur la même pente. */
const HOOK_X = 0.47;
/** Course de l'index à l'intérieur du corps gradué du dynamomètre. */
const NEEDLE_LOW = 0.53;
const NEEDLE_SPAN = 0.18;
/** Niveau du liquide de la cuve : le cube y flotte à demi immergé. */
const FLOAT_Y = 1.124;

const LEG_POSITIONS: readonly Vec3[] = [
  [-0.88, 0.42, -0.52],
  [0.88, 0.42, -0.52],
  [-0.88, 0.42, 0.52],
  [0.88, 0.42, 0.52],
];

/**
 * Table des forces : la paillasse du thème « Forces ».
 *
 * Elle réunit les quatre notions du thème en une seule lecture : un plan
 * incliné réglable dont le bloc est retenu par un dynamomètre à ressort
 * (pesanteur, soutien, frottements), une cuve où un cube flotte à demi immergé
 * (poussée d'Archimède), une pile de masses marquées et un fil à plomb.
 *
 * Repère local : (0, 0, 0) est le centre du dessus du socle de la station.
 * Encombrement 2,00 × 1,29 × 1,39 m.
 */
export function ForceTableProp({ solved }: { solved: boolean }) {
  const block = useRef<Mesh>(null);
  const thread = useRef<Mesh>(null);
  const needle = useRef<Mesh>(null);
  const floater = useRef<Mesh>(null);
  const liquid = useRef<Mesh>(null);
  const plumb = useRef<Group>(null);
  const edgeLight = useRef<MeshStandardMaterial>(null);
  const led = useRef<MeshStandardMaterial>(null);
  /** Position lissée du bloc sur la pente, conservée entre deux images. */
  const slide = useRef(BLOCK_LOW);

  const accent = solved ? LAB.solved : LAB.accent;

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    // Le poste reste vivant une fois résolu, mais les amplitudes retombent.
    const amplitude = solved ? 0.35 : 1;

    // Bloc sur le plan incliné : traction lente du dynamomètre, puis
    // décrochage brutal quand le frottement statique cède.
    const cycle = (time * 0.42) % 1;
    const target =
      cycle < 0.82
        ? BLOCK_LOW + BLOCK_SPAN * amplitude * (cycle / 0.82)
        : BLOCK_LOW;
    // Lissage exponentiel : indépendant du framerate, sans à-coups.
    slide.current = MathUtils.lerp(
      slide.current,
      target,
      1 - Math.exp(-7 * delta),
    );

    if (block.current) {
      block.current.position.x = slide.current;
    }
    if (thread.current) {
      // Le fil relie le bord haut du bloc au crochet : il s'allonge d'autant.
      const start = slide.current + BLOCK_HALF;
      const length = Math.max(HOOK_X - start, 0.01);
      thread.current.scale.y = length;
      thread.current.position.x = start + length / 2;
    }
    if (needle.current) {
      // L'index suit la traction, avec la vibration propre au ressort.
      const load = (slide.current - BLOCK_LOW) / BLOCK_SPAN;
      needle.current.position.x =
        NEEDLE_LOW +
        load * NEEDLE_SPAN +
        Math.sin(time * 11) * 0.004 * amplitude;
    }

    // Cube flottant : pilonnement et tangage autour de sa ligne de flottaison.
    if (floater.current) {
      floater.current.position.y =
        FLOAT_Y + Math.sin(time * 1.35) * 0.016 * amplitude;
      floater.current.rotation.z = Math.sin(time * 1.1) * 0.15 * amplitude;
      floater.current.rotation.x = Math.cos(time * 0.9) * 0.1 * amplitude;
    }
    if (liquid.current) {
      liquid.current.scale.y =
        1 + Math.sin(time * 1.35 + 0.6) * 0.014 * amplitude;
    }

    // Fil à plomb : balancier lent, modulé par un battement plus long.
    if (plumb.current) {
      const beat = 0.6 + 0.4 * Math.sin(time * 0.31);
      plumb.current.rotation.z = Math.sin(time * 1.9) * 0.17 * amplitude * beat;
    }

    // Accent lumineux du poste.
    const pulse = (Math.sin(time * 2.2) + 1) / 2;
    const glow = (solved ? 1.5 : 0.7) + pulse * 0.5;
    if (edgeLight.current) {
      edgeLight.current.emissiveIntensity = glow;
    }
    if (led.current) {
      led.current.emissiveIntensity = glow + 0.6;
    }
  });

  return (
    <group>
      {/* ---- Paillasse : plateau, piètement, étagère et dosseret ---- */}
      <mesh position={[0, BENCH_TOP - 0.03, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.06, 1.3]} />
        <meshStandardMaterial
          color={LAB.panel}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>

      {/* Bandeau lumineux du chant avant : c'est l'accent du poste. */}
      <mesh position={[0, BENCH_TOP - 0.065, 0.645]}>
        <boxGeometry args={[1.96, 0.018, 0.02]} />
        <meshStandardMaterial
          ref={edgeLight}
          color={accent}
          emissive={accent}
          emissiveIntensity={0.7}
          toneMapped={false}
        />
      </mesh>

      {LEG_POSITIONS.map((position, index) => (
        <mesh key={index} position={position} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.84, 12]} />
          <meshStandardMaterial
            color={LAB.metalDark}
            roughness={0.4}
            metalness={0.8}
          />
        </mesh>
      ))}

      <mesh position={[0, 0.26, 0]} receiveShadow>
        <boxGeometry args={[1.86, 0.04, 1.06]} />
        <meshStandardMaterial color={LAB.frame} roughness={0.75} />
      </mesh>

      {/* Caisse de rangement sous la paillasse. */}
      <mesh position={[-0.55, 0.41, 0]} castShadow>
        <boxGeometry args={[0.5, 0.26, 0.5]} />
        <meshStandardMaterial color={LAB.frame} roughness={0.85} />
      </mesh>

      <mesh position={[0, 1.01, -0.62]} castShadow>
        <boxGeometry args={[1.96, 0.22, 0.04]} />
        <meshStandardMaterial
          color={LAB.panel}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      <mesh position={[-0.8, 1.05, -0.597]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.03, 0.03, 0.012, 16]} />
        <meshStandardMaterial
          ref={led}
          color={accent}
          emissive={accent}
          emissiveIntensity={1.3}
          toneMapped={false}
        />
      </mesh>

      {/* ---- Plan incliné réglable : bâti, charnière et rapporteur ---- */}
      <mesh position={[-0.5, 0.915, -0.14]} receiveShadow>
        <boxGeometry args={[0.86, 0.03, 0.36]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.45}
          metalness={0.7}
        />
      </mesh>

      <mesh position={[-0.88, 0.941, -0.14]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.022, 0.022, 0.34, 12]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>

      {/* Secteur gradué qui matérialise l'angle de la pente. */}
      <mesh position={[-0.88, 0.941, 0.045]}>
        <ringGeometry args={[0.12, 0.17, 24, 1, 0, INCLINE]} />
        <meshStandardMaterial
          color={LAB.accentLight}
          emissive={LAB.accentLight}
          emissiveIntensity={0.7}
          transparent
          opacity={0.85}
          side={DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Vérin de réglage sous la rampe. */}
      <mesh position={[-0.35, 1.03, -0.14]}>
        <cylinderGeometry args={[0.018, 0.018, 0.2, 10]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.35}
          metalness={0.85}
        />
      </mesh>

      {/* Repère de la pente : +X monte le long de la rampe. */}
      <group position={[-0.88, 0.93, -0.14]} rotation-z={INCLINE}>
        <mesh position={[0.39, 0.012, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.78, 0.024, 0.3]} />
          <meshStandardMaterial
            color={LAB.panel}
            roughness={0.5}
            metalness={0.35}
          />
        </mesh>

        {/* Butée basse qui arrête le bloc en fin de course. */}
        <mesh position={[0.008, 0.04, 0]}>
          <boxGeometry args={[0.02, 0.05, 0.3]} />
          <meshStandardMaterial
            color={LAB.metalDark}
            roughness={0.5}
            metalness={0.7}
          />
        </mesh>

        {/* Bloc tracté : il remonte lentement puis décroche. */}
        <mesh ref={block} position={[BLOCK_LOW, 0.069, 0]} castShadow>
          <boxGeometry args={[0.13, 0.09, 0.16]} />
          <meshStandardMaterial
            color={LAB.warning}
            roughness={0.7}
            metalness={0.15}
          />
        </mesh>

        {/* Fil de traction : sa longueur suit le bloc. */}
        <mesh ref={thread} position={[0.32, 0.072, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.004, 0.004, 1, 6]} />
          <meshStandardMaterial color={LAB.accentLight} roughness={0.6} />
        </mesh>

        {/* Crochet, corps gradué et index du dynamomètre à ressort. */}
        <mesh position={[0.47, 0.072, 0]} rotation-y={Math.PI / 2}>
          <torusGeometry args={[0.016, 0.005, 8, 16]} />
          <meshStandardMaterial
            color={LAB.metal}
            roughness={0.3}
            metalness={0.9}
          />
        </mesh>

        <mesh position={[0.62, 0.072, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.032, 0.032, 0.26, 16]} />
          <meshStandardMaterial
            color={LAB.glass}
            roughness={0.12}
            metalness={0.1}
            transparent
            opacity={0.35}
          />
        </mesh>

        <mesh ref={needle} position={[NEEDLE_LOW, 0.072, 0]}>
          <boxGeometry args={[0.012, 0.05, 0.05]} />
          <meshStandardMaterial
            color={LAB.warning}
            emissive={LAB.warning}
            emissiveIntensity={0.8}
            toneMapped={false}
          />
        </mesh>

        {/* Équerre d'ancrage en haut de la rampe. */}
        <mesh position={[0.765, 0.11, 0]}>
          <boxGeometry args={[0.03, 0.16, 0.16]} />
          <meshStandardMaterial
            color={LAB.metalDark}
            roughness={0.45}
            metalness={0.75}
          />
        </mesh>
      </group>

      {/* ---- Cuve transparente : poussée d'Archimède ---- */}
      <mesh position={[0.28, 0.912, 0.06]}>
        <boxGeometry args={[0.46, 0.02, 0.4]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.5}
          metalness={0.6}
        />
      </mesh>

      <mesh position={[0.28, 1.072, 0.06]} castShadow>
        <boxGeometry args={[0.42, 0.3, 0.36]} />
        <meshStandardMaterial
          color={LAB.glass}
          roughness={0.08}
          metalness={0.05}
          transparent
          opacity={0.22}
        />
      </mesh>

      <mesh ref={liquid} position={[0.28, 1.024, 0.06]}>
        <boxGeometry args={[0.395, 0.2, 0.335]} />
        <meshStandardMaterial
          color={LAB.fluid}
          emissive={LAB.fluid}
          emissiveIntensity={0.35}
          roughness={0.15}
          transparent
          opacity={0.55}
        />
      </mesh>

      <mesh ref={floater} position={[0.28, FLOAT_Y, 0.06]}>
        <boxGeometry args={[0.12, 0.12, 0.12]} />
        <meshStandardMaterial color={LAB.warning} roughness={0.65} />
      </mesh>

      {/* Réglette graduée collée sur la face avant de la cuve. */}
      <mesh position={[0.1, 1.07, 0.242]}>
        <boxGeometry args={[0.014, 0.24, 0.006]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* ---- Masses marquées ---- */}
      <mesh position={[0.8, 0.9075, -0.2]}>
        <boxGeometry args={[0.3, 0.015, 0.3]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.5}
          metalness={0.6}
        />
      </mesh>

      <mesh position={[0.8, 0.94, -0.2]} castShadow>
        <cylinderGeometry args={[0.115, 0.115, 0.05, 20]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.35}
          metalness={0.85}
        />
      </mesh>

      <mesh position={[0.8, 0.9875, -0.2]}>
        <cylinderGeometry args={[0.095, 0.095, 0.045, 20]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.35}
          metalness={0.85}
        />
      </mesh>

      <mesh position={[0.8, 1.03, -0.2]}>
        <cylinderGeometry args={[0.075, 0.075, 0.04, 20]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.35}
          metalness={0.85}
        />
      </mesh>

      <mesh position={[0.8, 1.062, -0.2]}>
        <torusGeometry args={[0.03, 0.008, 8, 20]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>

      <mesh position={[0.8, 0.935, 0.1]}>
        <cylinderGeometry args={[0.075, 0.075, 0.05, 20]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.35}
          metalness={0.85}
        />
      </mesh>

      {/* ---- Fil à plomb : la verticale de référence ---- */}
      <mesh position={[0.62, 1.13, -0.55]}>
        <cylinderGeometry args={[0.018, 0.018, 0.46, 10]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.35}
          metalness={0.85}
        />
      </mesh>

      <mesh position={[0.5, 1.35, -0.55]}>
        <boxGeometry args={[0.26, 0.02, 0.03]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.35}
          metalness={0.85}
        />
      </mesh>

      <group ref={plumb} position={[0.39, 1.34, -0.55]}>
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.2, 6]} />
          <meshStandardMaterial color={LAB.accentLight} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.245, 0]} rotation-x={Math.PI}>
          <coneGeometry args={[0.03, 0.09, 14]} />
          <meshStandardMaterial
            color={LAB.metalDark}
            roughness={0.3}
            metalness={0.9}
          />
        </mesh>
      </group>
    </group>
  );
}
