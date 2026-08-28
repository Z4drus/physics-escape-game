"use client";

import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import { useRef } from "react";
import type { Group, Mesh, MeshStandardMaterial } from "three";
import { CatmullRomCurve3, Vector3 } from "three";

import { LAB } from "@/features/game/components/scene/materials";

/** Longueur du rail et hauteur de son arête supérieure. */
const RAIL_LENGTH = 2.6;
/** Hauteur de vol du chariot au-dessus du socle. */
const CART_Y = 0.72;
/** Abscisses des deux portiques photoélectriques. */
const GATE_A_X = -0.42;
const GATE_B_X = 0.52;
/** Demi-largeur de la fenêtre de détection d'une cellule. */
const GATE_WINDOW = 0.09;
/** Nombre de graduations gravées sur le flanc du rail. */
const GRADUATION_COUNT = 11;

/** Bornes du parcours : départ, fin de la phase MRU, contact sur la butée. */
const CART_START_X = -1;
const CART_SWITCH_X = 0.1;
const CART_END_X = 0.99;

/** Découpage temporel du cycle, en secondes. */
const PHASE_MRU = 2.6;
const PHASE_MRUA = 1.3;
const PHASE_BOUNCE = 0.45;
const PHASE_RETURN = 1.6;
const PHASE_IDLE = 0.45;
const CYCLE_DURATION =
  PHASE_MRU + PHASE_MRUA + PHASE_BOUNCE + PHASE_RETURN + PHASE_IDLE;

/** Vitesse de la phase à vitesse constante. */
const MRU_SPEED = (CART_SWITCH_X - CART_START_X) / PHASE_MRU;
/**
 * Accélération de la phase uniformément accélérée : choisie pour que le
 * chariot parte exactement à `MRU_SPEED` (pas de saut de vitesse à la
 * transition) et arrive pile sur la butée à la fin de `PHASE_MRUA`.
 */
const MRUA_ACCEL =
  (2 * (CART_END_X - CART_SWITCH_X - MRU_SPEED * PHASE_MRUA)) /
  (PHASE_MRUA * PHASE_MRUA);
/** Enfoncement du chariot dans l'élastique au moment du rebond. */
const BOUNCE_DEPTH = 0.06;

/** Tracé du tuyau souple entre le compresseur et l'embout d'injection. */
const HOSE_CURVE = new CatmullRomCurve3([
  new Vector3(-1.23, 0.19, 0.3),
  new Vector3(-1.34, 0.16, 0.22),
  new Vector3(-1.38, 0.24, 0.1),
  new Vector3(-1.34, 0.4, 0.02),
  new Vector3(-1.26, 0.5, 0),
]);

/**
 * Position du chariot le long du rail pour un temps donné dans le cycle.
 * Fonction pure et sans allocation : elle est appelée à chaque frame.
 */
function cartPositionX(time: number): number {
  // Phase 1 — MRU : la distance parcourue croît linéairement avec le temps.
  if (time < PHASE_MRU) {
    return CART_START_X + MRU_SPEED * time;
  }

  // Phase 2 — MRUA : on ajoute le terme en ½·a·t² à la même vitesse initiale.
  const sinceMru = time - PHASE_MRU;
  if (sinceMru < PHASE_MRUA) {
    return (
      CART_SWITCH_X +
      MRU_SPEED * sinceMru +
      0.5 * MRUA_ACCEL * sinceMru * sinceMru
    );
  }

  // Phase 3 — rebond amorti contre la butée élastique.
  const sinceMrua = sinceMru - PHASE_MRUA;
  if (sinceMrua < PHASE_BOUNCE) {
    return (
      CART_END_X - Math.sin((sinceMrua / PHASE_BOUNCE) * Math.PI) * BOUNCE_DEPTH
    );
  }

  // Phase 4 — remise en position : trajectoire lissée, volontairement
  // ni uniforme ni uniformément accélérée pour ne pas brouiller la lecture.
  const sinceBounce = sinceMrua - PHASE_BOUNCE;
  if (sinceBounce < PHASE_RETURN) {
    const progress = sinceBounce / PHASE_RETURN;
    const eased = progress * progress * (3 - 2 * progress);
    return CART_END_X + (CART_START_X - CART_END_X) * eased;
  }

  // Phase 5 — chariot à l'arrêt, prêt pour la mesure suivante.
  return CART_START_X;
}

/**
 * Rail à coussin d'air du poste « MRU / MRUA ».
 *
 * Le chariot enchaîne en boucle une phase à vitesse constante puis une phase
 * uniformément accélérée jusqu'à la butée élastique ; les deux cellules
 * photoélectriques s'allument à son passage. Résolu, l'accent vire au vert
 * et le cycle ralentit.
 */
export function AirRailProp({ solved }: { solved: boolean }) {
  const cart = useRef<Group>(null);
  const gateA = useRef<MeshStandardMaterial>(null);
  const gateB = useRef<MeshStandardMaterial>(null);
  const readout = useRef<MeshStandardMaterial>(null);
  const fan = useRef<Mesh>(null);
  const cycle = useRef(0);

  const accent = solved ? LAB.solved : LAB.accentLight;

  useFrame((_, delta) => {
    // Une seule commande de « calme » : le cycle et la turbine ralentissent.
    const rate = solved ? 0.5 : 1;
    const time = (cycle.current + delta * rate) % CYCLE_DURATION;
    cycle.current = time;

    const x = cartPositionX(time);
    // Lissage exponentiel : indépendant du framerate, sans à-coups.
    const smoothing = 1 - Math.exp(-12 * delta);

    if (cart.current) {
      cart.current.position.x = x;
      // Frémissement du coussin d'air sous le chariot.
      cart.current.position.y = CART_Y + Math.sin(time * 24) * 0.005;
    }
    if (fan.current) {
      fan.current.rotation.y += delta * rate * 7;
    }
    if (gateA.current) {
      const target = Math.abs(x - GATE_A_X) < GATE_WINDOW ? 3.2 : 0.25;
      gateA.current.emissiveIntensity +=
        (target - gateA.current.emissiveIntensity) * smoothing;
    }
    if (gateB.current) {
      const target = Math.abs(x - GATE_B_X) < GATE_WINDOW ? 3.2 : 0.25;
      gateB.current.emissiveIntensity +=
        (target - gateB.current.emissiveIntensity) * smoothing;
    }
    if (readout.current) {
      // L'afficheur monte pendant la phase accélérée : c'est la mesure utile.
      const accelerating = time >= PHASE_MRU && time < PHASE_MRU + PHASE_MRUA;
      const target = accelerating ? 2.6 : time < PHASE_MRU ? 1.2 : 0.5;
      readout.current.emissiveIntensity +=
        (target - readout.current.emissiveIntensity) * smoothing;
    }
  });

  return (
    <group>
      {/* Corps du rail et son profil triangulaire (boîte tournée à 45°) */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[RAIL_LENGTH, 0.1, 0.16]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.45}
          metalness={0.7}
        />
      </mesh>
      <mesh position={[0, 0.6, 0]} rotation-x={Math.PI / 4} castShadow>
        <boxGeometry args={[RAIL_LENGTH, 0.11, 0.11]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.28}
          metalness={0.85}
        />
      </mesh>

      {/* Graduations régulières, une marque haute tous les cinq crans */}
      {Array.from({ length: GRADUATION_COUNT }, (_, index) => {
        const major = index % 5 === 0;
        const height = major ? 0.07 : 0.04;
        const x = -1.15 + (index * 2.3) / (GRADUATION_COUNT - 1);
        return (
          <mesh key={index} position={[x, 0.595 - height / 2, 0.085]}>
            <boxGeometry args={[0.012, height, 0.01]} />
            <meshStandardMaterial color={LAB.glass} roughness={0.5} />
          </mesh>
        );
      })}

      <RailFoot x={-0.98} />
      <RailFoot x={0.98} />

      {/* Chariot / aéroglisseur : corps, écran occulteur et ergot de choc */}
      <group ref={cart} position={[CART_START_X, CART_Y, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.26, 0.09, 0.3]} />
          <meshStandardMaterial
            color={LAB.metal}
            roughness={0.3}
            metalness={0.8}
          />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.018, 0.11, 0.09]} />
          <meshStandardMaterial color={LAB.warning} roughness={0.6} />
        </mesh>
        <mesh position={[0.19, 0, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.014, 0.014, 0.12, 10]} />
          <meshStandardMaterial
            color={LAB.metalDark}
            roughness={0.4}
            metalness={0.8}
          />
        </mesh>
      </group>

      <PhotoGate x={GATE_A_X} accent={accent} ledMaterial={gateA} />
      <PhotoGate x={GATE_B_X} accent={accent} ledMaterial={gateB} />

      {/* Butée élastique : deux montants tendant une sangle en caoutchouc */}
      <mesh position={[1.24, 0.38, -0.145]} castShadow>
        <boxGeometry args={[0.05, 0.76, 0.05]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.5}
          metalness={0.6}
        />
      </mesh>
      <mesh position={[1.24, 0.38, 0.145]} castShadow>
        <boxGeometry args={[0.05, 0.76, 0.05]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.5}
          metalness={0.6}
        />
      </mesh>
      <mesh position={[1.24, 0.72, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.017, 0.017, 0.29, 10]} />
        <meshStandardMaterial color={LAB.warning} roughness={0.75} />
      </mesh>

      {/* Soufflerie : caisson, turbine et embout de sortie */}
      <mesh position={[-1.02, 0.13, 0.3]} castShadow receiveShadow>
        <boxGeometry args={[0.32, 0.26, 0.3]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.65}
          metalness={0.3}
        />
      </mesh>
      <mesh ref={fan} position={[-1.02, 0.15, 0.152]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.09, 0.09, 0.02, 6]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.45}
          metalness={0.7}
        />
      </mesh>
      <mesh position={[-1.19, 0.19, 0.3]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.032, 0.032, 0.08, 10]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.35}
          metalness={0.8}
        />
      </mesh>

      {/* Tuyau souple remontant vers l'injection d'air sous le rail */}
      <mesh>
        <tubeGeometry args={[HOSE_CURVE, 40, 0.03, 8, false]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.85}
          metalness={0.1}
        />
      </mesh>

      {/* Boîtier chronomètre relié aux cellules */}
      <mesh position={[0.62, 0.065, -0.34]} castShadow>
        <boxGeometry args={[0.26, 0.13, 0.2]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.65}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0.62, 0.136, -0.34]}>
        <boxGeometry args={[0.18, 0.012, 0.1]} />
        <meshStandardMaterial
          ref={readout}
          color={accent}
          emissive={accent}
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** Pied réglable du rail : embase, colonne et molette de mise à niveau. */
function RailFoot({ x }: { x: number }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.018, 0]}>
        <cylinderGeometry args={[0.11, 0.13, 0.035, 16]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.55}
          metalness={0.6}
        />
      </mesh>
      <mesh position={[0, 0.268, 0]} castShadow>
        <cylinderGeometry args={[0.042, 0.042, 0.465, 12]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.35}
          metalness={0.8}
        />
      </mesh>
      <mesh position={[0, 0.13, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.062, 0.016, 8, 20]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.4}
          metalness={0.75}
        />
      </mesh>
    </group>
  );
}

/**
 * Portique de cellule photoélectrique enjambant le rail.
 * Le témoin lumineux est piloté par le parent au passage de l'écran occulteur.
 */
function PhotoGate({
  x,
  accent,
  ledMaterial,
}: {
  x: number;
  accent: string;
  ledMaterial: RefObject<MeshStandardMaterial | null>;
}) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.47, -0.26]} castShadow>
        <boxGeometry args={[0.05, 0.94, 0.05]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.6}
          metalness={0.35}
        />
      </mesh>
      <mesh position={[0, 0.47, 0.26]} castShadow>
        <boxGeometry args={[0.05, 0.94, 0.05]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.6}
          metalness={0.35}
        />
      </mesh>
      <mesh position={[0, 0.97, 0]} castShadow>
        <boxGeometry args={[0.06, 0.06, 0.6]} />
        <meshStandardMaterial
          color={LAB.panel}
          roughness={0.6}
          metalness={0.35}
        />
      </mesh>
      <mesh position={[0, 1.018, 0]}>
        <boxGeometry args={[0.11, 0.035, 0.04]} />
        <meshStandardMaterial
          ref={ledMaterial}
          color={accent}
          emissive={accent}
          emissiveIntensity={0.25}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
