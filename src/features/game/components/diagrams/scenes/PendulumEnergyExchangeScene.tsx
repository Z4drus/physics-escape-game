"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  MeshStandardMaterial,
  Object3D,
  TubeGeometry,
  Vector3,
} from "three";
import type { Group, InstancedMesh, Mesh } from "three";

import { DIAGRAM_COLORS } from "@/features/game/components/diagrams/palette";
import { DiagramLabel } from "@/features/game/components/diagrams/primitives/DiagramLabel";
import { VectorArrow } from "@/features/game/components/diagrams/primitives/VectorArrow";
import type { DiagramSceneProps } from "@/features/game/components/diagrams/registry";
import type { Vec3 } from "@/types/game";

/** Teinte de l'énergie cinétique : le cyan de la palette. */
const KINETIC_COLOR = DIAGRAM_COLORS.buoyancy;
/** Teinte de l'énergie potentielle et du poids : l'ambre de la pesanteur. */
const POTENTIAL_COLOR = DIAGRAM_COLORS.weight;

/** Échelle du schéma : le fil et la dénivellation gardent leur rapport réel. */
const UNITS_PER_METRE = 0.8;
/** Altitude du point de suspension. */
const PIVOT_Y = 1.35;

/** Deux allers-retours complets par boucle. */
const PERIOD_SECONDS = 2.4;
const CYCLE_SECONDS = PERIOD_SECONDS * 2;
/** Durée de la pulsation qui attire l'œil sur la cote h, une fois par boucle. */
const PULSE_SECONDS = 1.2;

/** Longueur du vecteur vitesse à sa valeur maximale, au point le plus bas. */
const SPEED_ARROW_LENGTH = 0.55;
/** Longueur constante du poids : présent, mais volontairement discret. */
const WEIGHT_ARROW_LENGTH = 0.34;

/** Hauteur d'une jauge pleine : elle vaut l'énergie mécanique totale. */
const GAUGE_HEIGHT = 0.8;
const GAUGE_Z = -0.85;
const POTENTIAL_GAUGE_X = -1.3;
const KINETIC_GAUGE_X = -0.8;

/** Lignes de niveau : neuf tirets tracés de gauche à droite de la trajectoire. */
const DASH_COUNT = 9;
const DASH_START_X = -0.72;
const DASH_END_X = 1.02;
/** Abscisse de la cote de dénivellation, à droite de la trajectoire. */
const HEIGHT_GUIDE_X = 0.95;

/** Objet de travail réutilisé pour poser les tirets : zéro allocation par frame. */
const dashPlacer = new Object3D();

/** Met un nombre au format français, virgule décimale comprise. */
function formatFr(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

/**
 * Schéma de la conservation de l'énergie mécanique : une boule oscille sans
 * frottement au bout d'un fil. Les deux jauges se transvasent en permanence,
 * leur somme restant strictement égale à la hauteur du liseré « Em ». Les
 * deux longueurs du problème — le fil L et la dénivellation h — sont cotées
 * séparément, la seconde pulsant une fois par boucle : c'est elle qui donne
 * la vitesse cherchée, que le schéma se garde bien d'afficher.
 */
export function PendulumEnergyExchangeScene({ params }: DiagramSceneProps) {
  const wireLength = Number(params.longueur_fil_m ?? 1.2);
  const mass = Number(params.masse_kg ?? 0.5);
  const drop = Number(params.denivellation_m ?? 0.2);

  const wire = useRef<Mesh>(null);
  const ball = useRef<Group>(null);
  const velocity = useRef<Group>(null);
  const heightGuide = useRef<Group>(null);
  const potentialBar = useRef<Mesh>(null);
  const kineticBar = useRef<Mesh>(null);
  const kineticMaterial = useRef<MeshStandardMaterial>(null);
  const lowestDashes = useRef<InstancedMesh>(null);
  const releaseDashes = useRef<InstancedMesh>(null);

  /**
   * Géométrie du problème : l'amplitude angulaire découle de la dénivellation
   * (cos θ₀ = 1 − h / L), si bien que la hauteur dessinée est exactement celle
   * de l'énoncé — c'est tout l'enjeu de ce schéma.
   */
  const layout = useMemo(() => {
    const length = wireLength * UNITS_PER_METRE;
    const height = drop * UNITS_PER_METRE;
    const cosMax = Math.min(Math.max(1 - drop / wireLength, -1), 1);
    const angle = Math.acos(cosMax);

    return {
      length,
      height,
      angle,
      cosMax,
      lowestY: PIVOT_Y - length,
      releaseY: PIVOT_Y - length + height,
      /** Milieu du fil dans sa position extrême droite : ancre de la cote L. */
      guideOrigin: [
        (length / 2) * Math.sin(angle),
        PIVOT_Y - (length / 2) * cosMax,
        0.14,
      ] as Vec3,
      guideDirection: [Math.sin(angle), -cosMax, 0] as Vec3,
    };
  }, [wireLength, drop]);

  const arcGeometry = useMemo(() => {
    const points: Vector3[] = [];
    for (let index = 0; index <= 24; index += 1) {
      const angle = layout.angle * (-1 + (2 * index) / 24);
      points.push(
        new Vector3(
          layout.length * Math.sin(angle),
          PIVOT_Y - layout.length * Math.cos(angle),
          0,
        ),
      );
    }
    const curve = new CatmullRomCurve3(points, false, "centripetal", 0.5);
    return new TubeGeometry(curve, 60, 0.008, 6, false);
  }, [layout]);

  const wireGeometry = useMemo(() => {
    const geometry = new CylinderGeometry(0.01, 0.01, 1, 8);
    // Fil accroché par le haut : `scale.y` lui donne la longueur du pendule.
    geometry.translate(0, -0.5, 0);
    return geometry;
  }, []);

  const barGeometry = useMemo(() => {
    const geometry = new BoxGeometry(0.1, 1, 0.1);
    // Barre ancrée sur sa base : `scale.y` la remplit, ne la dilate pas.
    geometry.translate(0, 0.5, 0);
    return geometry;
  }, []);

  const dashGeometry = useMemo(() => new BoxGeometry(0.085, 0.008, 0.008), []);
  const lowestDashMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: DIAGRAM_COLORS.object,
        emissive: DIAGRAM_COLORS.object,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.7,
        toneMapped: false,
      }),
    [],
  );
  const releaseDashMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: POTENTIAL_COLOR,
        emissive: POTENTIAL_COLOR,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.8,
        toneMapped: false,
      }),
    [],
  );

  // Les deux lignes de niveau sont posées une fois : elles ne bougent jamais.
  useEffect(() => {
    const rows: readonly { mesh: InstancedMesh | null; y: number }[] = [
      { mesh: lowestDashes.current, y: layout.lowestY },
      { mesh: releaseDashes.current, y: layout.releaseY },
    ];
    const step = (DASH_END_X - DASH_START_X) / (DASH_COUNT - 1);

    for (const row of rows) {
      if (!row.mesh) continue;
      for (let index = 0; index < DASH_COUNT; index += 1) {
        dashPlacer.position.set(DASH_START_X + index * step, row.y, 0);
        dashPlacer.updateMatrix();
        row.mesh.setMatrixAt(index, dashPlacer.matrix);
      }
      row.mesh.instanceMatrix.needsUpdate = true;
    }
  }, [layout]);

  useEffect(
    () => () => {
      arcGeometry.dispose();
      wireGeometry.dispose();
      barGeometry.dispose();
      dashGeometry.dispose();
      lowestDashMaterial.dispose();
      releaseDashMaterial.dispose();
    },
    [
      arcGeometry,
      wireGeometry,
      barGeometry,
      dashGeometry,
      lowestDashMaterial,
      releaseDashMaterial,
    ],
  );

  useFrame(({ clock }) => {
    const time = clock.elapsedTime % CYCLE_SECONDS;
    const phase = (2 * Math.PI * time) / PERIOD_SECONDS;
    const angle = layout.angle * Math.cos(phase);
    const cosAngle = Math.cos(angle);
    const ballX = layout.length * Math.sin(angle);
    const ballY = PIVOT_Y - layout.length * cosAngle;

    if (wire.current) {
      wire.current.rotation.z = angle;
    }
    if (ball.current) {
      ball.current.position.set(ballX, ballY, 0);
    }

    // Épp ∝ (1 − cos θ) et Ec = Em − Epp : la somme est constante par
    // construction, c'est elle que le liseré blanc matérialise.
    const potentialShare = (1 - cosAngle) / (1 - layout.cosMax);
    const kineticShare = Math.max(1 - potentialShare, 0);

    if (potentialBar.current) {
      potentialBar.current.scale.y = Math.max(
        potentialShare * GAUGE_HEIGHT,
        0.012,
      );
    }
    if (kineticBar.current) {
      kineticBar.current.scale.y = Math.max(kineticShare * GAUGE_HEIGHT, 0.012);
    }

    // v ∝ √Ec : la flèche s'annule aux extrémités et culmine en bas de course,
    // où un bref éclat souligne le passage.
    if (velocity.current) {
      const forward = Math.sin(phase) > 0 ? -1 : 1;
      velocity.current.position.set(ballX, ballY, 0);
      velocity.current.rotation.z = angle - (forward * Math.PI) / 2;
      velocity.current.scale.y = Math.max(Math.sqrt(kineticShare), 0.02);
    }
    if (kineticMaterial.current) {
      kineticMaterial.current.emissiveIntensity =
        1 + (kineticShare > 0.97 ? 1.8 : 0) + kineticShare * 0.4;
    }

    // Respiration de la cote h, une seule fois par boucle : le regard doit
    // aller vers la dénivellation, jamais vers la longueur du fil.
    if (heightGuide.current) {
      const pulse =
        time < PULSE_SECONDS ? Math.sin((time / PULSE_SECONDS) * Math.PI) : 0;
      heightGuide.current.scale.setScalar(1 + pulse * 0.06);
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

      {/* Potence : montant, bras et point de suspension */}
      <mesh position={[-0.95, 0.7, 0]}>
        <boxGeometry args={[0.08, 1.4, 0.08]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.55}
          metalness={0.5}
        />
      </mesh>
      <mesh position={[-0.45, PIVOT_Y + 0.04, 0]}>
        <boxGeometry args={[1.04, 0.08, 0.08]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.55}
          metalness={0.5}
        />
      </mesh>
      <mesh position={[0, PIVOT_Y, 0]}>
        <sphereGeometry args={[0.045, 16, 12]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>

      {/* Trajectoire : l'arc est tracé en permanence, la boule le parcourt */}
      <mesh geometry={arcGeometry}>
        <meshStandardMaterial
          color={KINETIC_COLOR}
          emissive={KINETIC_COLOR}
          emissiveIntensity={0.5}
          transparent
          opacity={0.3}
          toneMapped={false}
        />
      </mesh>

      <instancedMesh
        ref={lowestDashes}
        args={[dashGeometry, lowestDashMaterial, DASH_COUNT]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={releaseDashes}
        args={[dashGeometry, releaseDashMaterial, DASH_COUNT]}
        frustumCulled={false}
      />

      <mesh
        ref={wire}
        geometry={wireGeometry}
        position={[0, PIVOT_Y, 0]}
        scale-y={layout.length}
      >
        <meshStandardMaterial
          color={DIAGRAM_COLORS.object}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Boule : elle porte son poids et sa masse, sans jamais tourner */}
      <group ref={ball} position={[0, layout.releaseY, 0]}>
        <mesh>
          <sphereGeometry args={[0.075, 22, 16]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.metal}
            roughness={0.25}
            metalness={0.95}
          />
        </mesh>
        <VectorArrow
          origin={[0, 0, 0]}
          direction={[0, -1, 0]}
          length={WEIGHT_ARROW_LENGTH}
          color={POTENTIAL_COLOR}
          thickness={0.018}
          opacity={0.5}
        />
        <DiagramLabel position={[0, 0.2, 0]}>
          m = {formatFr(mass, 2)} kg
        </DiagramLabel>
      </group>

      {/* Vitesse : le groupe s'oriente sur la tangente et s'étire avec |v| */}
      <group ref={velocity}>
        <VectorArrow
          origin={[0, 0, 0]}
          direction={[0, 1, 0]}
          length={SPEED_ARROW_LENGTH}
          color={DIAGRAM_COLORS.velocity}
          thickness={0.024}
        />
        <mesh position={[0, -0.17, 0]} scale={[1, 2.4, 1]}>
          <sphereGeometry args={[0.042, 14, 10]} />
          <meshStandardMaterial
            color={KINETIC_COLOR}
            emissive={KINETIC_COLOR}
            emissiveIntensity={0.8}
            transparent
            opacity={0.4}
            toneMapped={false}
          />
        </mesh>
      </group>

      <DiagramLabel position={[0.34, 0.24, 0]} tone="info">
        v = ?
      </DiagramLabel>

      {/* Cote L : longue, oblique, discrète — le piège du problème */}
      <VectorArrow
        origin={layout.guideOrigin}
        direction={layout.guideDirection}
        length={layout.length / 2}
        color={DIAGRAM_COLORS.object}
        thickness={0.013}
        opacity={0.55}
      />
      <VectorArrow
        origin={layout.guideOrigin}
        direction={[
          -layout.guideDirection[0],
          -layout.guideDirection[1],
          -layout.guideDirection[2],
        ]}
        length={layout.length / 2}
        color={DIAGRAM_COLORS.object}
        thickness={0.013}
        opacity={0.55}
      />
      <DiagramLabel
        position={[
          layout.guideOrigin[0] + 0.2,
          layout.guideOrigin[1] + 0.09,
          0.14,
        ]}
      >
        L = {formatFr(wireLength, 2)} m
      </DiagramLabel>

      {/* Cote h : courte, verticale, pulsée — la grandeur à retenir */}
      <group
        ref={heightGuide}
        position={[HEIGHT_GUIDE_X, (layout.lowestY + layout.releaseY) / 2, 0]}
      >
        <VectorArrow
          origin={[0, 0, 0]}
          direction={[0, 1, 0]}
          length={layout.height / 2}
          color={POTENTIAL_COLOR}
          thickness={0.014}
        />
        <VectorArrow
          origin={[0, 0, 0]}
          direction={[0, -1, 0]}
          length={layout.height / 2}
          color={POTENTIAL_COLOR}
          thickness={0.014}
        />
      </group>
      <DiagramLabel
        position={[
          HEIGHT_GUIDE_X + 0.24,
          (layout.lowestY + layout.releaseY) / 2,
          0,
        ]}
        tone="warning"
      >
        h = {formatFr(drop, 2)} m
      </DiagramLabel>

      <EnergyGauges
        barGeometry={barGeometry}
        potentialBar={potentialBar}
        kineticBar={kineticBar}
        kineticMaterial={kineticMaterial}
      />
    </group>
  );
}

/**
 * Couple de jauges à somme constante : ce que l'une perd, l'autre le gagne.
 * Le liseré immobile posé au sommet marque l'énergie mécanique totale, que
 * les deux colonnes réunies atteignent à chaque instant de l'oscillation.
 */
function EnergyGauges({
  barGeometry,
  potentialBar,
  kineticBar,
  kineticMaterial,
}: {
  barGeometry: BoxGeometry;
  potentialBar: RefObject<Mesh | null>;
  kineticBar: RefObject<Mesh | null>;
  kineticMaterial: RefObject<MeshStandardMaterial | null>;
}) {
  return (
    <group>
      {[POTENTIAL_GAUGE_X, KINETIC_GAUGE_X].map((x) => (
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
        ref={potentialBar}
        geometry={barGeometry}
        position={[POTENTIAL_GAUGE_X, 0, GAUGE_Z]}
        scale-y={GAUGE_HEIGHT}
      >
        <meshStandardMaterial
          color={POTENTIAL_COLOR}
          emissive={POTENTIAL_COLOR}
          emissiveIntensity={1.3}
          toneMapped={false}
        />
      </mesh>
      <mesh
        ref={kineticBar}
        geometry={barGeometry}
        position={[KINETIC_GAUGE_X, 0, GAUGE_Z]}
        scale-y={0.012}
      >
        <meshStandardMaterial
          ref={kineticMaterial}
          color={KINETIC_COLOR}
          emissive={KINETIC_COLOR}
          emissiveIntensity={1}
          toneMapped={false}
        />
      </mesh>

      {/* Liseré de l'énergie mécanique : il ne bouge pas d'un pixel */}
      <mesh
        position={[
          (POTENTIAL_GAUGE_X + KINETIC_GAUGE_X) / 2,
          GAUGE_HEIGHT,
          GAUGE_Z,
        ]}
      >
        <boxGeometry args={[0.74, 0.012, 0.012]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.object}
          emissive={DIAGRAM_COLORS.object}
          emissiveIntensity={0.8}
          toneMapped={false}
        />
      </mesh>

      <DiagramLabel
        position={[
          (POTENTIAL_GAUGE_X + KINETIC_GAUGE_X) / 2,
          GAUGE_HEIGHT + 0.14,
          GAUGE_Z,
        ]}
      >
        Em = constante
      </DiagramLabel>
      <DiagramLabel
        position={[POTENTIAL_GAUGE_X, 0.06, GAUGE_Z]}
        tone="warning"
      >
        Epp
      </DiagramLabel>
      <DiagramLabel position={[KINETIC_GAUGE_X, 0.06, GAUGE_Z]} tone="accent">
        Ec
      </DiagramLabel>
    </group>
  );
}
