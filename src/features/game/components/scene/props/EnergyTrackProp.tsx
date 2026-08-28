"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { CatmullRomCurve3, TubeGeometry, Vector3 } from "three";
import type { Group, Mesh, MeshStandardMaterial } from "three";

import { LAB } from "@/features/game/components/scene/materials";

/** Altitude de la face supérieure du plateau de la paillasse. */
const WORKTOP_Y = 0.78;
/** Épaisseur du plateau. */
const WORKTOP_THICKNESS = 0.06;
/** Rayon d'un rail de la piste. */
const RAIL_RADIUS = 0.018;
/** Demi-écartement des deux rails : la bille roule dans la gouttière. */
const RAIL_GAP = 0.034;
/** Rayon de la bille d'acier. */
const BALL_RADIUS = 0.05;
/** Hauteur du centre de la bille au-dessus de l'axe de la courbe. */
const BALL_RIDE_HEIGHT = 0.032;
/** Accélération de la pesanteur servant à la loi de vitesse. */
const GRAVITY = 9.81;
/** Ralenti de démonstration appliqué à la vitesse physique. */
const SPEED_SCALE = 0.55;
/**
 * Marge d'altitude ajoutée au sommet de la piste pour fixer la hauteur de
 * lâcher : la bille garde toujours un reste d'énergie cinétique et ne se fige
 * donc jamais aux points hauts.
 */
const RELEASE_MARGIN = 0.03;
/** Pied et hauteur utile des deux colonnes de jauge. */
const GAUGE_BASE_Y = 0.9;
const GAUGE_HEIGHT = 0.46;
/** Abscisses des deux jauges (cinétique à gauche, potentielle à droite). */
const GAUGE_KINETIC_X = 0.88;
const GAUGE_POTENTIAL_X = 1.04;
/** Profondeur du module de mesure, reculé au fond de la paillasse. */
const GAUGE_Z = -0.3;
/** Constante de lissage des jauges (indépendante du framerate). */
const GAUGE_SMOOTHING = 12;

/**
 * Points de contrôle du toboggan, dans le repère local du poste :
 * rampe de lâcher, premier creux, bosse intermédiaire, second creux puis
 * remontée finale. Le léger serpentement en Z évite une piste plate.
 */
const TRACK_POINTS: readonly [number, number, number][] = [
  [-0.88, 1.38, 0.2],
  [-0.62, 1.18, 0.16],
  [-0.32, 0.96, 0.1],
  [0, 0.88, 0.12],
  [0.32, 1.1, 0.18],
  [0.6, 0.92, 0.16],
  [0.86, 1.24, 0.1],
];

/** Position des quatre pieds de la paillasse. */
const LEGS: readonly [number, number][] = [
  [-1.02, -0.52],
  [-1.02, 0.52],
  [1.02, -0.52],
  [1.02, 0.52],
];

/** Montants qui soutiennent la piste au-dessus du plateau. */
const TRACK_SUPPORTS: readonly {
  position: [number, number, number];
  height: number;
}[] = [
  { position: [-0.32, 0.87, 0.1], height: 0.22 },
  { position: [0.32, 0.95, 0.18], height: 0.36 },
  { position: [0.86, 1.02, 0.1], height: 0.5 },
];

/** Vecteur de travail réutilisé image après image : zéro allocation par frame. */
const trackPoint = new Vector3();

/**
 * Piste d'énergie : toboggan tubulaire parcouru par une bille d'acier dont la
 * vitesse dérive de la conservation de l'énergie mécanique, doublé de deux
 * jauges lumineuses où l'énergie cinétique et l'énergie potentielle se
 * transvasent à somme constante.
 */
export function EnergyTrackProp({ solved }: { solved: boolean }) {
  const accent = solved ? LAB.solved : LAB.accent;

  const ball = useRef<Mesh>(null);
  const pendulum = useRef<Group>(null);
  const kineticBar = useRef<Mesh>(null);
  const potentialBar = useRef<Mesh>(null);
  const kineticMaterial = useRef<MeshStandardMaterial>(null);
  const potentialMaterial = useRef<MeshStandardMaterial>(null);
  const magnetMaterial = useRef<MeshStandardMaterial>(null);
  const stripMaterial = useRef<MeshStandardMaterial>(null);

  /** Abscisse curviligne normalisée de la bille et sens de parcours. */
  const progress = useRef(0);
  const direction = useRef(1);
  /** Remplissages lissés des deux jauges (leur somme vaut toujours 1). */
  const kineticFill = useRef(0);
  const potentialFill = useRef(1);

  const track = useMemo(() => {
    const curve = new CatmullRomCurve3(
      TRACK_POINTS.map(([x, y, z]) => new Vector3(x, y, z)),
      false,
      "centripetal",
      0.5,
    );
    const geometry = new TubeGeometry(curve, 140, RAIL_RADIUS, 8, false);

    // Échantillonnage de la courbe : ses altitudes extrêmes fixent le zéro
    // d'énergie potentielle (point le plus bas) et la hauteur de lâcher.
    const sample = new Vector3();
    let lowest = Infinity;
    let highest = -Infinity;
    for (let index = 0; index <= 96; index += 1) {
      curve.getPointAt(index / 96, sample);
      lowest = Math.min(lowest, sample.y);
      highest = Math.max(highest, sample.y);
    }

    const releaseHeight = highest + RELEASE_MARGIN;

    return {
      curve,
      geometry,
      length: curve.getLength(),
      lowest,
      releaseHeight,
      /** Dénominateur commun aux deux jauges : l'énergie mécanique totale. */
      totalDrop: releaseHeight - lowest,
    };
  }, []);

  useEffect(() => () => track.geometry.dispose(), [track]);

  useFrame(({ clock }, delta) => {
    // Un onglet réactivé livre un delta énorme : on le borne pour éviter que
    // la bille ne saute par-dessus une portion entière de la piste.
    const step = Math.min(delta, 0.05);
    const elapsed = clock.elapsedTime;

    track.curve.getPointAt(progress.current, trackPoint);

    // v = sqrt(2 g (h_lâcher - h)) : rapide dans les creux, lente aux sommets.
    const drop = Math.max(track.releaseHeight - trackPoint.y, 0.01);
    const speed =
      Math.sqrt(2 * GRAVITY * drop) * SPEED_SCALE * (solved ? 0.55 : 1);
    const travelled = direction.current * speed * step;

    if (ball.current) {
      ball.current.position.set(
        trackPoint.x,
        trackPoint.y + BALL_RIDE_HEIGHT,
        trackPoint.z,
      );
      ball.current.rotation.z -= travelled / BALL_RADIUS;
    }

    // Répartition de l'énergie : Ec = h_lâcher - h, Epp = h - h_min, et leur
    // somme vaut exactement la chute totale — d'où deux jauges complémentaires.
    const kineticTarget = drop / track.totalDrop;
    const potentialTarget = (trackPoint.y - track.lowest) / track.totalDrop;
    const smoothing = 1 - Math.exp(-GAUGE_SMOOTHING * step);
    kineticFill.current += (kineticTarget - kineticFill.current) * smoothing;
    potentialFill.current +=
      (potentialTarget - potentialFill.current) * smoothing;

    // Les colonnes ont une géométrie de hauteur unitaire : on les étire depuis
    // leur base au lieu de les faire grandir symétriquement.
    if (kineticBar.current) {
      const height = Math.max(kineticFill.current, 0.01) * GAUGE_HEIGHT;
      kineticBar.current.scale.y = height;
      kineticBar.current.position.y = GAUGE_BASE_Y + height / 2;
    }
    if (potentialBar.current) {
      const height = Math.max(potentialFill.current, 0.01) * GAUGE_HEIGHT;
      potentialBar.current.scale.y = height;
      potentialBar.current.position.y = GAUGE_BASE_Y + height / 2;
    }
    if (kineticMaterial.current) {
      kineticMaterial.current.emissiveIntensity = 1 + kineticFill.current * 1.4;
    }
    if (potentialMaterial.current) {
      potentialMaterial.current.emissiveIntensity =
        1 + potentialFill.current * 1.4;
    }

    // L'électro-aimant de la potence brille quand la bille revient au lâcher.
    if (magnetMaterial.current) {
      magnetMaterial.current.emissiveIntensity =
        0.5 + (1 - progress.current) * 1.6;
    }
    if (stripMaterial.current) {
      stripMaterial.current.emissiveIntensity =
        (solved ? 1.1 : 0.5) + Math.sin(elapsed * 2.2) * 0.12;
    }

    if (pendulum.current) {
      const amplitude = solved ? 0.18 : 0.34;
      pendulum.current.rotation.z = Math.sin(elapsed * 2.2) * amplitude;
    }

    // La bille fait la navette : elle repart en sens inverse à chaque extrémité.
    progress.current += travelled / track.length;
    if (progress.current >= 1) {
      progress.current = 1;
      direction.current = -1;
    } else if (progress.current <= 0) {
      progress.current = 0;
      direction.current = 1;
    }
  });

  return (
    <group>
      {/* Paillasse : plateau, pieds, tablette basse et bandeau lumineux */}
      <mesh
        position={[0, WORKTOP_Y - WORKTOP_THICKNESS / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[2.32, WORKTOP_THICKNESS, 1.26]} />
        <meshStandardMaterial
          color={LAB.panel}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>

      {LEGS.map(([x, z]) => (
        <mesh
          key={`leg-${x}-${z}`}
          position={[x, (WORKTOP_Y - WORKTOP_THICKNESS) / 2, z]}
          castShadow
        >
          <boxGeometry args={[0.07, WORKTOP_Y - WORKTOP_THICKNESS, 0.07]} />
          <meshStandardMaterial
            color={LAB.frame}
            roughness={0.7}
            metalness={0.3}
          />
        </mesh>
      ))}

      <mesh position={[0, 0.16, 0]} receiveShadow>
        <boxGeometry args={[2, 0.04, 1]} />
        <meshStandardMaterial color={LAB.frame} roughness={0.8} />
      </mesh>

      <mesh position={[0, 0.75, 0.632]}>
        <boxGeometry args={[2.32, 0.03, 0.015]} />
        <meshStandardMaterial
          ref={stripMaterial}
          color={accent}
          emissive={accent}
          emissiveIntensity={0.5}
          toneMapped={false}
        />
      </mesh>

      {/* Piste : deux rails jumeaux issus d'une même géométrie tubulaire */}
      <mesh geometry={track.geometry} position={[0, 0, RAIL_GAP]} castShadow>
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.25}
          metalness={0.85}
        />
      </mesh>
      <mesh geometry={track.geometry} position={[0, 0, -RAIL_GAP]} castShadow>
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.25}
          metalness={0.85}
        />
      </mesh>

      {TRACK_SUPPORTS.map((support) => (
        <mesh
          key={`support-${support.position[0]}`}
          position={support.position}
        >
          <cylinderGeometry args={[0.014, 0.014, support.height, 8]} />
          <meshStandardMaterial
            color={LAB.metalDark}
            roughness={0.5}
            metalness={0.6}
          />
        </mesh>
      ))}

      <mesh ref={ball} position={[-0.88, 1.41, 0.2]} castShadow>
        <sphereGeometry args={[BALL_RADIUS, 20, 14]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.12}
          metalness={1}
          emissive={accent}
          emissiveIntensity={0.25}
        />
      </mesh>

      <ReleaseGantry accent={accent} magnetMaterial={magnetMaterial} />

      {/* Console de commande, reculée derrière la rampe de lâcher */}
      <mesh position={[-0.6, 0.85, -0.44]} castShadow>
        <boxGeometry args={[0.36, 0.14, 0.26]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.55}
          metalness={0.35}
        />
      </mesh>
      <mesh position={[-0.6, 0.87, -0.312]}>
        <boxGeometry args={[0.28, 0.07, 0.012]} />
        <meshStandardMaterial
          color={LAB.glass}
          emissive={accent}
          emissiveIntensity={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Pendule témoin : même conservation d'énergie, sans rail */}
      <mesh position={[-0.1, 1.03, -0.46]}>
        <cylinderGeometry args={[0.016, 0.016, 0.5, 10]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.35}
          metalness={0.8}
        />
      </mesh>
      <mesh position={[0.04, 1.27, -0.46]}>
        <boxGeometry args={[0.3, 0.024, 0.024]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.35}
          metalness={0.8}
        />
      </mesh>
      <group ref={pendulum} position={[0.18, 1.26, -0.46]}>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.3, 6]} />
          <meshStandardMaterial color={LAB.metalDark} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.32, 0]}>
          <sphereGeometry args={[0.042, 16, 12]} />
          <meshStandardMaterial
            color={LAB.metalDark}
            roughness={0.3}
            metalness={0.9}
          />
        </mesh>
      </group>

      <EnergyGauges
        accent={accent}
        kineticBar={kineticBar}
        potentialBar={potentialBar}
        kineticMaterial={kineticMaterial}
        potentialMaterial={potentialMaterial}
      />
    </group>
  );
}

/**
 * Potence de lâcher : colonne graduée, collier coulissant verrouillé par une
 * molette et électro-aimant qui retient la bille au sommet de la rampe.
 */
function ReleaseGantry({
  accent,
  magnetMaterial,
}: {
  accent: string;
  magnetMaterial: RefObject<MeshStandardMaterial | null>;
}) {
  return (
    <group position={[-1.05, 0, 0.2]}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.1, 0.04, 16]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.6}
          metalness={0.35}
        />
      </mesh>
      <mesh position={[0, 1.21, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.86, 12]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.3}
          metalness={0.85}
        />
      </mesh>
      {/* Règle graduée : c'est elle qui matérialise le réglage en hauteur */}
      <mesh position={[0, 1.2, 0.024]}>
        <boxGeometry args={[0.02, 0.68, 0.008]} />
        <meshStandardMaterial
          color={LAB.accentLight}
          emissive={accent}
          emissiveIntensity={0.7}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.07, 12]} />
        <meshStandardMaterial
          color={LAB.metalDark}
          roughness={0.45}
          metalness={0.7}
        />
      </mesh>
      <mesh position={[-0.05, 1.5, 0]} rotation-y={Math.PI / 2}>
        <torusGeometry args={[0.02, 0.008, 8, 12]} />
        <meshStandardMaterial
          color={LAB.warning}
          roughness={0.5}
          metalness={0.4}
        />
      </mesh>
      <mesh position={[0.095, 1.5, 0]}>
        <boxGeometry args={[0.19, 0.028, 0.04]} />
        <meshStandardMaterial
          color={LAB.metal}
          roughness={0.35}
          metalness={0.8}
        />
      </mesh>
      <mesh position={[0.17, 1.49, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.05, 12]} />
        <meshStandardMaterial
          ref={magnetMaterial}
          color={LAB.accentLight}
          emissive={accent}
          emissiveIntensity={0.9}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Module de mesure : deux colonnes de verre côte à côte où l'énergie cinétique
 * (accent) et l'énergie potentielle (ambre) se transvasent à somme constante.
 */
function EnergyGauges({
  accent,
  kineticBar,
  potentialBar,
  kineticMaterial,
  potentialMaterial,
}: {
  accent: string;
  kineticBar: RefObject<Mesh | null>;
  potentialBar: RefObject<Mesh | null>;
  kineticMaterial: RefObject<MeshStandardMaterial | null>;
  potentialMaterial: RefObject<MeshStandardMaterial | null>;
}) {
  return (
    <group>
      <mesh position={[0.96, 0.84, GAUGE_Z]} castShadow>
        <boxGeometry args={[0.3, 0.12, 0.26]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.55}
          metalness={0.35}
        />
      </mesh>

      <mesh position={[GAUGE_KINETIC_X, 1.13, GAUGE_Z]}>
        <cylinderGeometry args={[0.05, 0.05, GAUGE_HEIGHT, 14]} />
        <meshStandardMaterial
          color={LAB.glass}
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={0.24}
        />
      </mesh>
      <mesh position={[GAUGE_POTENTIAL_X, 1.13, GAUGE_Z]}>
        <cylinderGeometry args={[0.05, 0.05, GAUGE_HEIGHT, 14]} />
        <meshStandardMaterial
          color={LAB.glass}
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={0.24}
        />
      </mesh>

      {/* Colonnes de hauteur unitaire, étirées en Y par `useFrame` */}
      <mesh
        ref={kineticBar}
        position={[GAUGE_KINETIC_X, GAUGE_BASE_Y, GAUGE_Z]}
      >
        <cylinderGeometry args={[0.036, 0.036, 1, 12]} />
        <meshStandardMaterial
          ref={kineticMaterial}
          color={accent}
          emissive={accent}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
      <mesh
        ref={potentialBar}
        position={[GAUGE_POTENTIAL_X, GAUGE_BASE_Y, GAUGE_Z]}
      >
        <cylinderGeometry args={[0.036, 0.036, 1, 12]} />
        <meshStandardMaterial
          ref={potentialMaterial}
          color={LAB.warning}
          emissive={LAB.warning}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0.96, 1.375, GAUGE_Z]}>
        <boxGeometry args={[0.3, 0.035, 0.26]} />
        <meshStandardMaterial
          color={LAB.frame}
          roughness={0.55}
          metalness={0.35}
        />
      </mesh>

      {/* Pastilles d'identification, à l'aplomb de chaque colonne */}
      <mesh position={[GAUGE_KINETIC_X, 0.855, GAUGE_Z + 0.134]}>
        <boxGeometry args={[0.06, 0.02, 0.012]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[GAUGE_POTENTIAL_X, 0.855, GAUGE_Z + 0.134]}>
        <boxGeometry args={[0.06, 0.02, 0.012]} />
        <meshStandardMaterial
          color={LAB.warning}
          emissive={LAB.warning}
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
