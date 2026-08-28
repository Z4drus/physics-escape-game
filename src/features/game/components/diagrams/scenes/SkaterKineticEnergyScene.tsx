"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { BoxGeometry, CylinderGeometry } from "three";
import type { Group, Mesh } from "three";

import { DIAGRAM_COLORS } from "@/features/game/components/diagrams/palette";
import { DiagramLabel } from "@/features/game/components/diagrams/primitives/DiagramLabel";
import { VectorArrow } from "@/features/game/components/diagrams/primitives/VectorArrow";
import type { DiagramSceneProps } from "@/features/game/components/diagrams/registry";
import type { Vec3 } from "@/types/game";

/** Teinte de l'énergie cinétique : le cyan de la palette. */
const KINETIC_COLOR = DIAGRAM_COLORS.buoyancy;
/** Teinte de l'énergie potentielle : l'ambre, déjà associé à la pesanteur. */
const POTENTIAL_COLOR = DIAGRAM_COLORS.weight;

/** Durée d'une traversée complète du cadre, en secondes. */
const CYCLE_SECONDS = 4;
/** Abscisses d'entrée et de sortie du skateur, hors de la piste visible. */
const START_X = -1.55;
const END_X = 1.55;
const TRAVEL = END_X - START_X;
/** Rayon des roues : il lie la rotation au déplacement (roulement sans glissement). */
const WHEEL_RADIUS = 0.032;
/** Longueur maximale de la traînée laissée derrière la planche. */
const TRAIL_LENGTH = 0.8;
/** Instant de la boucle où la mesure de vitesse apparaît (skateur au centre). */
const SPEED_LABEL_START = 0.45;

/** Hauteur d'une jauge pleine : elle représente l'énergie mécanique totale. */
const GAUGE_HEIGHT = 0.8;
/** Les jauges sont reculées pour ne jamais croiser la piste. */
const GAUGE_Z = -0.85;
const KINETIC_GAUGE_X = -1.4;
const POTENTIAL_GAUGE_X = -0.85;

/** Position des quatre roues sous la planche. */
const WHEELS: readonly Vec3[] = [
  [-0.145, WHEEL_RADIUS, 0.05],
  [-0.145, WHEEL_RADIUS, -0.05],
  [0.145, WHEEL_RADIUS, 0.05],
  [0.145, WHEEL_RADIUS, -0.05],
];

/** Jalons posés le long du bord de piste : ils donnent l'échelle du trajet. */
const DISTANCE_MARKERS: readonly number[] = [-1.2, -0.6, 0, 0.6, 1.2];

/** Origine et direction du vecteur vitesse, constant sur toute la boucle. */
const SPEED_ARROW_ORIGIN: Vec3 = [0.12, 0.22, 0];
const SPEED_ARROW_DIRECTION: Vec3 = [1, 0, 0];
const SPEED_ARROW_LENGTH = 0.5;

/** Met un nombre au format français, virgule décimale comprise. */
function formatFr(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

/**
 * Schéma « Ec = ½ · m · v² » : un skateur traverse une piste rigoureusement
 * plane à vitesse constante. Rien ne change d'altitude, donc rien ne se
 * transvase : la jauge cinétique reste pleine et la jauge potentielle vide.
 * Le schéma affiche la masse et la vitesse de l'énoncé, jamais l'énergie.
 */
export function SkaterKineticEnergyScene({ params }: DiagramSceneProps) {
  const mass = Number(params.masse_kg ?? 60);
  const speed = Number(params.vitesse_m_s ?? 5);

  const skater = useRef<Group>(null);
  const trail = useRef<Mesh>(null);
  const wheels = useRef<Mesh[]>([]);
  const kineticBar = useRef<Mesh>(null);
  /** Avancement normalisé de la boucle, partagé avec l'étiquette de vitesse. */
  const progress = useRef(0);

  const wheelGeometry = useMemo(() => {
    const geometry = new CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.03, 12);
    // L'axe des roues est transversal : la géométrie est basculée une fois
    // pour toutes, si bien que `rotation.z` du mesh devient le roulement.
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }, []);

  const trailGeometry = useMemo(() => {
    const geometry = new CylinderGeometry(0.024, 0.024, 1, 10);
    // Cylindre couché vers l'arrière et ancré sur son extrémité avant :
    // `scale.x` allonge alors la traînée sans la décaler.
    geometry.rotateZ(Math.PI / 2);
    geometry.translate(-0.5, 0, 0);
    return geometry;
  }, []);

  const barGeometry = useMemo(() => {
    const geometry = new BoxGeometry(0.1, 1, 0.1);
    // Barre ancrée sur sa base : `scale.y` la fait monter, pas grossir.
    geometry.translate(0, 0.5, 0);
    return geometry;
  }, []);

  useEffect(
    () => () => {
      wheelGeometry.dispose();
      trailGeometry.dispose();
      barGeometry.dispose();
    },
    [wheelGeometry, trailGeometry, barGeometry],
  );

  useFrame(({ clock }) => {
    const cycle = (clock.elapsedTime % CYCLE_SECONDS) / CYCLE_SECONDS;
    progress.current = cycle;

    // Déplacement strictement linéaire en `t` : c'est le message du schéma,
    // aucune accélération ne doit se lire dans le mouvement.
    const travelled = cycle * TRAVEL;

    if (skater.current) {
      skater.current.position.x = START_X + travelled;
    }
    if (trail.current) {
      trail.current.scale.x = Math.min(TRAIL_LENGTH, travelled);
    }

    const spin = -travelled / WHEEL_RADIUS;
    for (const wheel of wheels.current) {
      wheel.rotation.z = spin;
    }

    // Sur le plat, l'énergie cinétique est constante : la jauge reste pleine,
    // une respiration de ±2 % suffit à la garder vivante.
    if (kineticBar.current) {
      const breathing = 1 + Math.sin(clock.elapsedTime * Math.PI * 2) * 0.02;
      kineticBar.current.scale.y = GAUGE_HEIGHT * breathing;
    }
  });

  return (
    <group>
      {/* Sol et piste : plans nus, sans la moindre pente */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[3, 2.4]} />
        <meshStandardMaterial color={DIAGRAM_COLORS.structure} roughness={1} />
      </mesh>
      <gridHelper
        args={[3, 6, DIAGRAM_COLORS.guide, DIAGRAM_COLORS.structure]}
        position={[0, 0.002, 0]}
        material-transparent
        material-opacity={0.22}
      />
      <mesh position={[0, 0.006, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[2.9, 0.9]} />
        <meshStandardMaterial color={DIAGRAM_COLORS.guide} roughness={0.9} />
      </mesh>

      {/* Bordures de piste : elles matérialisent l'horizontale */}
      {[0.44, -0.44].map((z) => (
        <mesh key={`rail-${z}`} position={[0, 0.02, z]}>
          <boxGeometry args={[2.9, 0.04, 0.05]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.metal}
            roughness={0.6}
            metalness={0.3}
          />
        </mesh>
      ))}

      {DISTANCE_MARKERS.map((x) => (
        <mesh key={`marker-${x}`} position={[x, 0.07, 0.5]}>
          <boxGeometry args={[0.02, 0.14, 0.02]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.guide}
            emissive={DIAGRAM_COLORS.guide}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}

      <DiagramLabel position={[-1.45, 0.14, 0.55]}>
        piste horizontale
      </DiagramLabel>

      {/* Skateur : un seul groupe translaté, tout le reste est solidaire */}
      <group ref={skater} position={[START_X, 0, 0]}>
        <mesh geometry={trailGeometry} position={[-0.2, 0.09, 0]}>
          <meshStandardMaterial
            color={KINETIC_COLOR}
            emissive={KINETIC_COLOR}
            emissiveIntensity={0.6}
            transparent
            opacity={0.35}
            toneMapped={false}
          />
        </mesh>

        <mesh position={[0, 0.082, 0]}>
          <boxGeometry args={[0.4, 0.035, 0.14]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.object}
            roughness={0.5}
            metalness={0.2}
          />
        </mesh>

        {WHEELS.map((wheel, index) => (
          <mesh
            key={`wheel-${wheel[0]}-${wheel[2]}`}
            ref={(mesh) => {
              if (mesh) wheels.current[index] = mesh;
            }}
            geometry={wheelGeometry}
            position={wheel}
          >
            <meshStandardMaterial
              color={DIAGRAM_COLORS.metal}
              roughness={0.4}
              metalness={0.7}
            />
          </mesh>
        ))}

        {/* Silhouette : tronc, tête et bras tendus — objet de référence */}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.062, 0.072, 0.4, 14]} />
          <meshStandardMaterial color={DIAGRAM_COLORS.object} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.572, 0]}>
          <sphereGeometry args={[0.072, 18, 14]} />
          <meshStandardMaterial color={DIAGRAM_COLORS.object} roughness={0.7} />
        </mesh>
        {[1, -1].map((side) => (
          <mesh
            key={`arm-${side}`}
            position={[side * 0.13, 0.42, 0]}
            rotation-z={side * -0.18}
          >
            <boxGeometry args={[0.24, 0.032, 0.032]} />
            <meshStandardMaterial
              color={DIAGRAM_COLORS.object}
              roughness={0.7}
            />
          </mesh>
        ))}

        {/* Vitesse : longueur constante, comme le mouvement qu'elle décrit */}
        <VectorArrow
          origin={SPEED_ARROW_ORIGIN}
          direction={SPEED_ARROW_DIRECTION}
          length={SPEED_ARROW_LENGTH}
          color={DIAGRAM_COLORS.velocity}
          thickness={0.026}
        />

        <DiagramLabel position={[0, 0.8, 0]}>
          m = {formatFr(mass, 0)} kg
        </DiagramLabel>
        <SpeedLabel progress={progress} value={speed} />
      </group>

      <EnergyGauges barGeometry={barGeometry} kineticBar={kineticBar} />
    </group>
  );
}

/**
 * Étiquette de vitesse : elle n'apparaît qu'au milieu de la traversée, quand
 * le skateur occupe le centre du cadre, puis accompagne la flèche jusqu'à la
 * sortie. Ce composant isolé encaisse seul le rendu, la scène ne bouge pas.
 */
function SpeedLabel({
  progress,
  value,
}: {
  progress: RefObject<number>;
  value: number;
}) {
  const [visible, setVisible] = useState(false);

  useFrame(() => {
    const shown = progress.current >= SPEED_LABEL_START;
    if (shown !== visible) setVisible(shown);
  });

  if (!visible) return null;

  return (
    <DiagramLabel position={[0.72, 0.28, 0]} tone="info">
      v = {formatFr(value, 1)} m/s
    </DiagramLabel>
  );
}

/**
 * Couple de jauges d'énergie. Sur une piste horizontale la hauteur ne varie
 * pas : la colonne cinétique reste pleine et la colonne potentielle vide, ce
 * qui prépare le lecteur aux schémas où, elles, se transvasent.
 */
function EnergyGauges({
  barGeometry,
  kineticBar,
}: {
  barGeometry: BoxGeometry;
  kineticBar: RefObject<Mesh | null>;
}) {
  return (
    <group>
      {[KINETIC_GAUGE_X, POTENTIAL_GAUGE_X].map((x) => (
        <mesh key={`case-${x}`} position={[x, GAUGE_HEIGHT / 2, GAUGE_Z]}>
          <boxGeometry args={[0.15, GAUGE_HEIGHT, 0.15]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.guide}
            transparent
            opacity={0.12}
            roughness={0.2}
          />
        </mesh>
      ))}

      <mesh
        ref={kineticBar}
        geometry={barGeometry}
        position={[KINETIC_GAUGE_X, 0, GAUGE_Z]}
        scale-y={GAUGE_HEIGHT}
      >
        <meshStandardMaterial
          color={KINETIC_COLOR}
          emissive={KINETIC_COLOR}
          emissiveIntensity={1.3}
          toneMapped={false}
        />
      </mesh>

      {/* Colonne potentielle vide : présente, mais éteinte */}
      <mesh
        geometry={barGeometry}
        position={[POTENTIAL_GAUGE_X, 0, GAUGE_Z]}
        scale-y={0.012}
      >
        <meshStandardMaterial
          color={POTENTIAL_COLOR}
          emissive={POTENTIAL_COLOR}
          emissiveIntensity={0.15}
          transparent
          opacity={0.5}
          toneMapped={false}
        />
      </mesh>

      <DiagramLabel
        position={[KINETIC_GAUGE_X, GAUGE_HEIGHT + 0.12, GAUGE_Z]}
        tone="accent"
      >
        Ec
      </DiagramLabel>
      <DiagramLabel
        position={[POTENTIAL_GAUGE_X, 0.06, GAUGE_Z]}
        tone="warning"
      >
        Epp = 0
      </DiagramLabel>
    </group>
  );
}
