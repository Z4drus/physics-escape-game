"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { BoxGeometry, CylinderGeometry, EdgesGeometry } from "three";
import type { Group, Mesh, MeshStandardMaterial } from "three";

import { DIAGRAM_COLORS } from "@/features/game/components/diagrams/palette";
import { DiagramLabel } from "@/features/game/components/diagrams/primitives/DiagramLabel";
import { VectorArrow } from "@/features/game/components/diagrams/primitives/VectorArrow";
import type { DiagramSceneProps } from "@/features/game/components/diagrams/registry";
import type { Vec3 } from "@/types/game";

/** Teinte de l'énergie cinétique : le cyan de la palette. */
const KINETIC_COLOR = DIAGRAM_COLORS.buoyancy;
/** Teinte de l'énergie potentielle et du poids : l'ambre de la pesanteur. */
const POTENTIAL_COLOR = DIAGRAM_COLORS.weight;
/** Teinte du travail moteur et de la tension du câble : le violet. */
const WORK_COLOR = DIAGRAM_COLORS.applied;

/** Boucle : 4 s de montée, 1 s de lecture en haut, 1 s de retour en fondu. */
const CYCLE_SECONDS = 6;
const RISE_SECONDS = 4;
const HOLD_END_SECONDS = 5;

/** Altitudes du centre de la caisse au départ et à l'arrivée. */
const BOTTOM_Y = 0.33;
const TOP_Y = 1.05;
const LIFT = TOP_Y - BOTTOM_Y;
/** Demi-arête de la caisse : elle sert de référence d'échelle au schéma. */
const CRATE_HALF = 0.17;
/** Altitude de l'axe de la poulie, d'où pend le câble. */
const PULLEY_Y = 1.42;

/** Demi-écartement des montants du portique. */
const POST_X = 0.42;
/** Abscisse de la cote de hauteur, à gauche du portique. */
const HEIGHT_GUIDE_X = -0.75;

/** Hauteur d'une jauge pleine et implantation du bloc de mesure. */
const GAUGE_HEIGHT = 0.78;
const GAUGE_Z = -0.9;
const KINETIC_GAUGE_X = -1.45;
const POTENTIAL_GAUGE_X = -0.95;
const WORK_GAUGE_X = -0.45;
/**
 * Part d'énergie cinétique pendant la montée : la vitesse étant constante,
 * elle ne varie pas — on la dessine basse mais non nulle pour qu'on la voie.
 */
const KINETIC_SHARE = 0.05;

/** Repères de hauteur portés par le montant gauche, un par 1,5 m réel. */
const HEIGHT_MARKS: readonly number[] = [
  BOTTOM_Y,
  BOTTOM_Y + LIFT / 4,
  BOTTOM_Y + LIFT / 2,
  BOTTOM_Y + (3 * LIFT) / 4,
  TOP_Y,
];

/** Flèches de tension et de poids : mêmes longueurs, sens opposés. */
const FORCE_LENGTH = 0.3;
const FORCE_Z = 0.3;
const TENSION_ORIGIN: Vec3 = [0, CRATE_HALF, FORCE_Z];
const TENSION_DIRECTION: Vec3 = [0, 1, 0];
const WEIGHT_ORIGIN: Vec3 = [0, 0, FORCE_Z];
const WEIGHT_DIRECTION: Vec3 = [0, -1, 0];

/** Met un nombre au format français, virgule décimale comprise. */
function formatFr(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

/**
 * Schéma « W = m·g·h puis P = W/t » : un treuil hisse une caisse à vitesse
 * constante le long d'un portique. La tension et le poids ont exactement la
 * même longueur — vitesse constante — pendant que la barre du travail moteur
 * suit l'énergie potentielle gagnée. Un chronomètre donne la durée, seule
 * grandeur qui distingue le travail de la puissance ; aucune valeur calculée
 * n'est affichée.
 */
export function WinchLiftPowerScene({ params }: DiagramSceneProps) {
  const mass = Number(params.masse_kg ?? 80);
  const height = Number(params.hauteur_m ?? 6);
  const duration = Number(params.duree_s ?? 12);

  const crate = useRef<Group>(null);
  const cable = useRef<Mesh>(null);
  const crateMaterial = useRef<MeshStandardMaterial>(null);
  const potentialBar = useRef<Mesh>(null);
  const workBar = useRef<Mesh>(null);
  /** Durée écoulée à l'échelle de l'énoncé, partagée avec le chronomètre. */
  const chronometer = useRef(0);

  const cableGeometry = useMemo(() => {
    const geometry = new CylinderGeometry(0.012, 0.012, 1, 8);
    // Câble suspendu par le haut : `scale.y` l'allonge vers le bas.
    geometry.translate(0, -0.5, 0);
    return geometry;
  }, []);

  const barGeometry = useMemo(() => {
    const geometry = new BoxGeometry(0.1, 1, 0.1);
    // Barre ancrée sur sa base : `scale.y` la fait monter, pas grossir.
    geometry.translate(0, 0.5, 0);
    return geometry;
  }, []);

  const crateEdges = useMemo(() => {
    const box = new BoxGeometry(CRATE_HALF * 2, CRATE_HALF * 2, CRATE_HALF * 2);
    const edges = new EdgesGeometry(box);
    box.dispose();
    return edges;
  }, []);

  useEffect(
    () => () => {
      cableGeometry.dispose();
      barGeometry.dispose();
      crateEdges.dispose();
    },
    [cableGeometry, barGeometry, crateEdges],
  );

  useFrame(({ clock }) => {
    const time = clock.elapsedTime % CYCLE_SECONDS;

    // Trois temps : montée linéaire, palier de lecture, puis retour au sol en
    // fondu — jamais une descente, qui se lirait comme une chute libre.
    let rise: number;
    let opacity = 1;
    let slack = 0;

    if (time < RISE_SECONDS) {
      rise = time / RISE_SECONDS;
    } else if (time < HOLD_END_SECONDS) {
      rise = 1;
      // Caisse posée sur la passerelle : le câble se détend légèrement.
      slack = 0.04;
    } else {
      const back =
        (time - HOLD_END_SECONDS) / (CYCLE_SECONDS - HOLD_END_SECONDS);
      rise = back < 0.5 ? 1 : 0;
      opacity = 1 - Math.sin(back * Math.PI) * 0.85;
    }

    const crateY = BOTTOM_Y + rise * LIFT;
    // Le chronomètre suit la montée et se remet à zéro pendant le fondu.
    chronometer.current = rise * duration;

    if (crate.current) {
      crate.current.position.y = crateY;
    }
    if (cable.current) {
      cable.current.scale.y = Math.max(
        PULLEY_Y - (crateY + CRATE_HALF + 0.03) - slack,
        0.01,
      );
    }
    if (crateMaterial.current) {
      crateMaterial.current.opacity = opacity;
    }

    // Le travail fourni se retrouve intégralement en énergie potentielle :
    // les deux barres montent ensemble, exactement à la même hauteur.
    if (potentialBar.current) {
      potentialBar.current.scale.y = Math.max(rise * GAUGE_HEIGHT, 0.012);
    }
    if (workBar.current) {
      workBar.current.scale.y = Math.max(rise * GAUGE_HEIGHT, 0.012);
    }
  });

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3, 2.4]} />
        <meshStandardMaterial color={DIAGRAM_COLORS.structure} roughness={1} />
      </mesh>
      <gridHelper
        args={[3, 6, DIAGRAM_COLORS.guide, DIAGRAM_COLORS.structure]}
        position={[0, 0.002, 0]}
        material-transparent
        material-opacity={0.22}
      />

      {/* Portique : deux montants, une traverse, une poulie */}
      {[POST_X, -POST_X].map((x) => (
        <mesh key={`post-${x}`} position={[x, 0.75, 0]}>
          <boxGeometry args={[0.08, 1.5, 0.08]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.metal}
            roughness={0.55}
            metalness={0.5}
          />
        </mesh>
      ))}
      <mesh position={[0, 1.55, 0]}>
        <boxGeometry args={[1, 0.1, 0.1]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.55}
          metalness={0.5}
        />
      </mesh>
      <mesh position={[0, PULLEY_Y, 0]}>
        <torusGeometry args={[0.09, 0.022, 10, 24]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.3}
          metalness={0.85}
        />
      </mesh>

      {/* Câble : une seule géométrie étirée entre la poulie et le crochet */}
      <mesh ref={cable} geometry={cableGeometry} position={[0, PULLEY_Y, 0]}>
        <meshStandardMaterial
          color={DIAGRAM_COLORS.object}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {HEIGHT_MARKS.map((y) => (
        <mesh key={`mark-${y}`} position={[-POST_X - 0.09, y, 0]}>
          <boxGeometry args={[0.12, 0.018, 0.018]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.guide}
            emissive={DIAGRAM_COLORS.guide}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}

      {/* Socle de départ et passerelle d'arrivée : les deux niveaux cotés */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.5, 0.16, 0.44]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.9}
        />
      </mesh>
      <mesh position={[0.82, 0.85, 0]}>
        <boxGeometry args={[0.6, 0.06, 0.42]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.8}
        />
      </mesh>
      <mesh position={[1.05, 0.41, 0]}>
        <boxGeometry args={[0.06, 0.82, 0.06]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.6}
          metalness={0.4}
        />
      </mesh>

      {/* Cote de hauteur : double flèche et traits de rappel */}
      <VectorArrow
        origin={[HEIGHT_GUIDE_X, (BOTTOM_Y + TOP_Y) / 2, 0]}
        direction={[0, 1, 0]}
        length={LIFT / 2}
        color={DIAGRAM_COLORS.object}
        thickness={0.016}
        opacity={0.85}
      />
      <VectorArrow
        origin={[HEIGHT_GUIDE_X, (BOTTOM_Y + TOP_Y) / 2, 0]}
        direction={[0, -1, 0]}
        length={LIFT / 2}
        color={DIAGRAM_COLORS.object}
        thickness={0.016}
        opacity={0.85}
      />
      {[BOTTOM_Y, TOP_Y].map((y) => (
        <mesh key={`recall-${y}`} position={[-0.48, y, 0]}>
          <boxGeometry args={[0.62, 0.008, 0.008]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.guide}
            transparent
            opacity={0.55}
          />
        </mesh>
      ))}
      <DiagramLabel
        position={[HEIGHT_GUIDE_X - 0.24, (BOTTOM_Y + TOP_Y) / 2, 0]}
      >
        h = {formatFr(height, 1)} m
      </DiagramLabel>

      {/* Caisse : elle porte crochet, forces et masse, tout est solidaire */}
      <group ref={crate} position={[0, BOTTOM_Y, 0]}>
        <mesh>
          <boxGeometry
            args={[CRATE_HALF * 2, CRATE_HALF * 2, CRATE_HALF * 2]}
          />
          <meshStandardMaterial
            ref={crateMaterial}
            color={DIAGRAM_COLORS.object}
            roughness={0.75}
            transparent
          />
        </mesh>
        <lineSegments geometry={crateEdges}>
          <lineBasicMaterial
            color={DIAGRAM_COLORS.structure}
            transparent
            opacity={0.9}
          />
        </lineSegments>
        <mesh position={[0, CRATE_HALF + 0.03, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.035, 0.012, 8, 16]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.metal}
            roughness={0.3}
            metalness={0.9}
          />
        </mesh>

        <VectorArrow
          origin={TENSION_ORIGIN}
          direction={TENSION_DIRECTION}
          length={FORCE_LENGTH}
          color={WORK_COLOR}
          thickness={0.022}
        />
        <VectorArrow
          origin={WEIGHT_ORIGIN}
          direction={WEIGHT_DIRECTION}
          length={FORCE_LENGTH}
          color={POTENTIAL_COLOR}
          thickness={0.022}
        />

        <DiagramLabel position={[0, CRATE_HALF + FORCE_LENGTH + 0.08, FORCE_Z]}>
          F
        </DiagramLabel>
        <DiagramLabel
          position={[0, -FORCE_LENGTH - 0.08, FORCE_Z]}
          tone="warning"
        >
          P = m·g
        </DiagramLabel>
        <DiagramLabel position={[0.3, 0.02, 0.14]}>
          m = {formatFr(mass, 0)} kg
        </DiagramLabel>
      </group>

      <Chronometer elapsed={chronometer} duration={duration} />

      <EnergyGauges
        barGeometry={barGeometry}
        potentialBar={potentialBar}
        workBar={workBar}
      />
    </group>
  );
}

/**
 * Chronomètre de la manœuvre. Il n'est rendu qu'au demi-dixième de seconde
 * près et vit dans son propre composant : la scène 3D ne se rend jamais à
 * nouveau à cause de lui.
 */
function Chronometer({
  elapsed,
  duration,
}: {
  elapsed: RefObject<number>;
  duration: number;
}) {
  const [shown, setShown] = useState(0);

  useFrame(() => {
    const stepped = Math.round(elapsed.current * 2) / 2;
    if (stepped !== shown) setShown(stepped);
  });

  return (
    <DiagramLabel position={[1.05, 1.5, 0]} tone="info">
      t = {formatFr(shown, 1)} s / {formatFr(duration, 1)} s
    </DiagramLabel>
  );
}

/**
 * Bloc de mesure à trois colonnes : l'énergie cinétique reste basse et
 * constante (vitesse constante), tandis que l'énergie potentielle et le
 * travail moteur montent exactement ensemble.
 */
function EnergyGauges({
  barGeometry,
  potentialBar,
  workBar,
}: {
  barGeometry: BoxGeometry;
  potentialBar: RefObject<Mesh | null>;
  workBar: RefObject<Mesh | null>;
}) {
  return (
    <group>
      {[KINETIC_GAUGE_X, POTENTIAL_GAUGE_X, WORK_GAUGE_X].map((x) => (
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
        geometry={barGeometry}
        position={[KINETIC_GAUGE_X, 0, GAUGE_Z]}
        scale-y={GAUGE_HEIGHT * KINETIC_SHARE}
      >
        <meshStandardMaterial
          color={KINETIC_COLOR}
          emissive={KINETIC_COLOR}
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      <mesh
        ref={potentialBar}
        geometry={barGeometry}
        position={[POTENTIAL_GAUGE_X, 0, GAUGE_Z]}
        scale-y={0.012}
      >
        <meshStandardMaterial
          color={POTENTIAL_COLOR}
          emissive={POTENTIAL_COLOR}
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
      <mesh
        ref={workBar}
        geometry={barGeometry}
        position={[WORK_GAUGE_X, 0, GAUGE_Z]}
        scale-y={0.012}
      >
        <meshStandardMaterial
          color={WORK_COLOR}
          emissive={WORK_COLOR}
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>

      {/* Liseré de mi-course sur la colonne du travail moteur */}
      <mesh position={[WORK_GAUGE_X, GAUGE_HEIGHT / 2, GAUGE_Z]}>
        <boxGeometry args={[0.18, 0.008, 0.18]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.guide}
          emissive={DIAGRAM_COLORS.guide}
          emissiveIntensity={0.4}
        />
      </mesh>

      <DiagramLabel
        position={[
          KINETIC_GAUGE_X,
          GAUGE_HEIGHT * KINETIC_SHARE + 0.1,
          GAUGE_Z,
        ]}
        tone="accent"
      >
        Ec
      </DiagramLabel>
      <DiagramLabel
        position={[POTENTIAL_GAUGE_X, 0.06, GAUGE_Z]}
        tone="warning"
      >
        Epp
      </DiagramLabel>
      <DiagramLabel position={[WORK_GAUGE_X, GAUGE_HEIGHT + 0.14, GAUGE_Z]}>
        W moteur
      </DiagramLabel>
    </group>
  );
}
