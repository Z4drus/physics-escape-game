"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { BoxGeometry, EdgesGeometry, Quaternion, Vector3 } from "three";
import type { Group } from "three";

import { DIAGRAM_COLORS } from "@/features/game/components/diagrams/palette";
import { DiagramLabel } from "@/features/game/components/diagrams/primitives/DiagramLabel";
import { VectorArrow } from "@/features/game/components/diagrams/primitives/VectorArrow";
import type { DiagramSceneProps } from "@/features/game/components/diagrams/registry";
import type { Vec3 } from "@/types/game";

/* -------------------------------------------------------------------- */
/* Échelle, rythme et géométrie                                          */
/* -------------------------------------------------------------------- */

/** Longueur, en unités de scène, attribuée à la force la plus intense. */
const MAX_ARROW_LENGTH = 1.1;
/** Durée d'un cycle complet d'animation, en secondes. */
const CYCLE_SECONDS = 5;
/** Instant figé lorsque l'utilisateur a demandé à limiter les animations. */
const STATIC_TIME = 4.65;

const RAMP_HALF_LENGTH = 1.2;
const RAMP_HALF_THICKNESS = 0.04;
const RAMP_DEPTH = 1;
/** Garde au sol de l'arête basse de la rampe : la scène repose sur y = 0. */
const RAMP_GROUND_CLEARANCE = 0.01;

const CRATE_SIZE: Vec3 = [0.6, 0.45, 0.55];
/** Abscisse de la caisse dans le repère de la rampe (+x descend la pente). */
const CRATE_ALONG = -0.55;
const CLEAT_SIZE: Vec3 = [0.08, 0.18, 0.55];

/**
 * Le schéma est réparti sur deux plans parallèles : la construction
 * géométrique (poids et ses deux composantes) derrière la caisse, les forces
 * de contact réellement exercées devant. Sans cette séparation, N et P⟂ —
 * portées par la même droite — se recouvriraient et deviendraient illisibles.
 */
const Z_BUILD = -0.2;
const Z_CONTACT = 0.2;
/** Plan du vecteur fantôme, en avant de la caisse pour comparer N et P. */
const Z_GHOST = 0.46;

const ARROW_ORIGIN: Vec3 = [0, 0, 0];
const DOWNWARD: Vec3 = [0, -1, 0];
const FLOOR_ROTATION_X = -Math.PI / 2;
const UP = new Vector3(0, 1, 0);

/* -------------------------------------------------------------------- */
/* Utilitaires                                                           */
/* -------------------------------------------------------------------- */

/** Progression de `time` sur l'intervalle [from, to], bornée à [0, 1]. */
function ramp(time: number, from: number, to: number): number {
  return Math.min(Math.max((time - from) / (to - from), 0), 1);
}

function easeOutCubic(value: number): number {
  return 1 - (1 - value) ** 3;
}

function easeInCubic(value: number): number {
  return value ** 3;
}

/** Écriture française d'un nombre : la virgule sépare les décimales. */
function formatNumber(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

/** Tige de construction reliant deux points : position, axe et longueur. */
function buildSegment(
  from: Vector3,
  to: Vector3,
): { start: Vec3; quaternion: Quaternion; length: number } {
  const delta = to.clone().sub(from);
  const length = delta.length();
  return {
    start: [from.x, from.y, from.z],
    quaternion: new Quaternion().setFromUnitVectors(UP, delta.normalize()),
    length,
  };
}

/**
 * Vrai quand le système demande de réduire les animations. La scène se fige
 * alors sur son état final, toutes les flèches et étiquettes visibles.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

/* -------------------------------------------------------------------- */
/* Scène                                                                 */
/* -------------------------------------------------------------------- */

/**
 * Schéma « force de soutien sur un plan incliné ». La rampe monte vers −X ;
 * le poids reste vertical, la force de soutien reste perpendiculaire au plan.
 *
 * L'animation déroule le raisonnement : le poids, sa décomposition en
 * parallélogramme, puis la force de soutien qui ne compense que la composante
 * perpendiculaire, et le taquet qui retient la composante parallèle. Un
 * vecteur fantôme, de la longueur du poids, vient enfin se placer à côté de N
 * pour montrer que N est plus courte. Aucune intensité n'est écrite : seules
 * les données de l'énoncé (masse, angle) sont affichées.
 */
export function InclineNormalForceScene({ params }: DiagramSceneProps) {
  const mass = Number(params.masse_kg ?? 20);
  const gravity = Number(params.g_m_s2 ?? 9.81);
  const angleDeg = Number(params.angle_deg ?? 30);
  const weight = Number(params.poids_N ?? mass * gravity);

  const alpha = (angleDeg * Math.PI) / 180;
  const cosAlpha = Math.cos(alpha);
  const sinAlpha = Math.sin(alpha);

  const support = Number(params.soutien_N ?? weight * cosAlpha);
  const parallel = Number(params.composante_parallele_N ?? weight * sinAlpha);

  // Échelle commune : la force la plus intense du schéma mesure 1,10 u, les
  // autres flèches sont à son échelle. Le facteur vient toujours de `params`.
  const unitPerNewton = MAX_ARROW_LENGTH / Math.max(weight, support, parallel);
  const weightLength = weight * unitPerNewton;
  const supportLength = support * unitPerNewton;
  const parallelLength = parallel * unitPerNewton;

  const reduced = usePrefersReducedMotion();

  const weightArrow = useRef<Group>(null);
  const perpendicularArrow = useRef<Group>(null);
  const parallelArrow = useRef<Group>(null);
  const supportArrow = useRef<Group>(null);
  const cleatArrow = useRef<Group>(null);
  const ghostArrow = useRef<Group>(null);
  const guideAlong = useRef<Group>(null);
  const guideAcross = useRef<Group>(null);

  // Les étiquettes sont du HTML : elles n'apparaissent qu'aux bascules du
  // cycle, jamais image par image.
  const [phase, setPhase] = useState(0);
  const currentPhase = useRef(0);

  const crateEdges = useMemo(() => {
    const box = new BoxGeometry(...CRATE_SIZE);
    const edges = new EdgesGeometry(box);
    box.dispose();
    return edges;
  }, []);

  useEffect(() => () => crateEdges.dispose(), [crateEdges]);

  const layout = useMemo(() => {
    // Hauteur du centre de la rampe pour que son arête basse frôle le sol.
    const rampCenterY =
      RAMP_GROUND_CLEARANCE +
      sinAlpha * RAMP_HALF_LENGTH +
      cosAlpha * RAMP_HALF_THICKNESS;

    /** Repère de la rampe : `along` descend la pente, `above` sort du plan. */
    const toWorld = (along: number, above: number): Vec3 => [
      cosAlpha * along + sinAlpha * above,
      rampCenterY - sinAlpha * along + cosAlpha * above,
      0,
    ];

    const crateCentre = toWorld(
      CRATE_ALONG,
      RAMP_HALF_THICKNESS + CRATE_SIZE[1] / 2,
    );
    const contact = toWorld(CRATE_ALONG, RAMP_HALF_THICKNESS);
    const cleatContact = toWorld(
      CRATE_ALONG + CRATE_SIZE[0] / 2,
      RAMP_HALF_THICKNESS + CLEAT_SIZE[1] / 2,
    );
    const cleatCentre = toWorld(
      CRATE_ALONG + CRATE_SIZE[0] / 2 + CLEAT_SIZE[0] / 2,
      RAMP_HALF_THICKNESS + CLEAT_SIZE[1] / 2,
    );
    const postTop = toWorld(-1, -RAMP_HALF_THICKNESS);
    const footing = toWorld(RAMP_HALF_LENGTH, -RAMP_HALF_THICKNESS);

    // Vecteurs unitaires du plan incliné.
    const normal: Vec3 = [sinAlpha, cosAlpha, 0];
    const intoSlope: Vec3 = [-sinAlpha, -cosAlpha, 0];
    const downSlope: Vec3 = [cosAlpha, -sinAlpha, 0];
    const upSlope: Vec3 = [-cosAlpha, sinAlpha, 0];

    // Parallélogramme de décomposition, tracé dans le plan de construction.
    const origin = new Vector3(crateCentre[0], crateCentre[1], Z_BUILD);
    const weightTip = origin
      .clone()
      .addScaledVector(new Vector3(0, -1, 0), weightLength);
    const perpendicularTip = origin
      .clone()
      .addScaledVector(new Vector3(...intoSlope), supportLength);
    const parallelTip = origin
      .clone()
      .addScaledVector(new Vector3(...downSlope), parallelLength);

    // Traits de cote de l'horizontale, sous la rampe : ils portent l'angle.
    const dashes: Vec3[] = Array.from({ length: 7 }, (_, index) => [
      footing[0] - 0.14 - index * 0.13,
      0.014,
      0,
    ]);

    return {
      rampCenterY,
      crateCentre,
      contact,
      cleatCentre,
      cleatContact,
      postHeight: postTop[1] + 0.06,
      postX: postTop[0],
      footing,
      normal,
      intoSlope,
      downSlope,
      upSlope,
      dashes,
      guides: [
        buildSegment(perpendicularTip, weightTip),
        buildSegment(parallelTip, weightTip),
      ],
      labels: {
        angle: [footing[0] - 0.42, 0.2, 0] as Vec3,
        mass: [crateCentre[0], crateCentre[1], 0.34] as Vec3,
        weight: [
          crateCentre[0] + 0.24,
          crateCentre[1] - weightLength / 2,
          Z_BUILD,
        ] as Vec3,
        perpendicular: [
          perpendicularTip.x + 0.18,
          perpendicularTip.y,
          Z_BUILD,
        ] as Vec3,
        parallel: [parallelTip.x + 0.2, parallelTip.y + 0.08, Z_BUILD] as Vec3,
        support: [
          contact[0] + sinAlpha * supportLength * 0.5 - 0.24,
          contact[1] + cosAlpha * supportLength * 0.5,
          Z_CONTACT,
        ] as Vec3,
        cleat: [
          cleatContact[0] - cosAlpha * parallelLength - 0.02,
          cleatContact[1] + sinAlpha * parallelLength + 0.08,
          Z_CONTACT,
        ] as Vec3,
        ghost: [
          contact[0] + sinAlpha * weightLength + 0.26,
          contact[1] + cosAlpha * weightLength - 0.08,
          Z_GHOST,
        ] as Vec3,
      },
    };
  }, [cosAlpha, sinAlpha, weightLength, supportLength, parallelLength]);

  useFrame(({ clock }) => {
    const time = reduced ? STATIC_TIME : clock.getElapsedTime() % CYCLE_SECONDS;

    // Rétraction finale : le cycle repart d'un cadre vide.
    const collapse = 1 - easeInCubic(ramp(time, 4.7, CYCLE_SECONDS));

    if (weightArrow.current) {
      weightArrow.current.scale.setScalar(
        easeOutCubic(ramp(time, 0, 0.9)) * collapse,
      );
    }

    // 0,9 → 1,8 s : les deux composantes du poids croissent ensemble.
    const components = easeOutCubic(ramp(time, 0.9, 1.8)) * collapse;
    if (perpendicularArrow.current) {
      perpendicularArrow.current.scale.setScalar(components);
    }
    if (parallelArrow.current) {
      parallelArrow.current.scale.setScalar(components);
    }

    // 1,8 → 2,2 s : le parallélogramme se ferme depuis la pointe du poids.
    const closure = easeOutCubic(ramp(time, 1.8, 2.2)) * collapse;
    if (guideAlong.current) {
      guideAlong.current.scale.y = closure;
    }
    if (guideAcross.current) {
      guideAcross.current.scale.y = closure;
    }

    // 2,2 → 3,1 s : la force de soutien, perpendiculaire au plan d'appui.
    if (supportArrow.current) {
      supportArrow.current.scale.setScalar(
        easeOutCubic(ramp(time, 2.2, 3.1)) * collapse,
      );
    }

    // 3,1 → 3,8 s : le taquet retient la composante parallèle.
    if (cleatArrow.current) {
      cleatArrow.current.scale.setScalar(
        easeOutCubic(ramp(time, 3.1, 3.8)) * collapse,
      );
    }

    // 3,8 → 4,6 s : un fantôme long comme le poids se place à côté de N.
    if (ghostArrow.current) {
      const ghost =
        easeOutCubic(ramp(time, 3.8, 4.15)) -
        easeInCubic(ramp(time, 4.45, 4.6));
      ghostArrow.current.scale.setScalar(Math.max(ghost, 0));
    }

    const nextPhase =
      time < 0.9
        ? 0
        : time < 1.8
          ? 1
          : time < 3
            ? 2
            : time < 3.9
              ? 3
              : time < 4.6
                ? 4
                : time < 4.85
                  ? 5
                  : 6;
    if (nextPhase !== currentPhase.current) {
      currentPhase.current = nextPhase;
      setPhase(nextPhase);
    }
  });

  const inCycle = phase >= 1 && phase <= 5;
  const showComponents = phase >= 2 && phase <= 5;
  const showContact = phase >= 3 && phase <= 5;
  const showGhost = phase === 4;

  return (
    <group>
      {/* Sol de référence et trame : ils donnent l'horizontale. */}
      <mesh rotation-x={FLOOR_ROTATION_X}>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.95}
          transparent
          opacity={0.55}
        />
      </mesh>
      <gridHelper
        args={[3, 12, DIAGRAM_COLORS.guide, DIAGRAM_COLORS.structure]}
        position={[0, 0.004, 0]}
        material-transparent
        material-opacity={0.3}
      />

      {/* Montant de soutènement de l'extrémité haute de la rampe. */}
      <mesh position={[layout.postX, layout.postHeight / 2, 0]}>
        <boxGeometry args={[0.14, layout.postHeight, 0.85]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.structure}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Rampe : une rotation de −α autour de Z fait monter la pente vers −X.
          Elle est translucide pour que le poids reste lisible en la traversant. */}
      <mesh position={[0, layout.rampCenterY, 0]} rotation-z={-alpha}>
        <boxGeometry
          args={[RAMP_HALF_LENGTH * 2, RAMP_HALF_THICKNESS * 2, RAMP_DEPTH]}
        />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.metal}
          roughness={0.5}
          metalness={0.5}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>

      {/* Angle de la pente : arc et horizontale pointillée de référence. */}
      <mesh
        position={[layout.footing[0], layout.footing[1] + 0.01, 0]}
        rotation-z={Math.PI - alpha}
      >
        <torusGeometry args={[0.42, 0.006, 6, 40, alpha]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.guide}
          emissive={DIAGRAM_COLORS.guide}
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>
      {layout.dashes.map((position) => (
        <mesh key={position[0]} position={position}>
          <boxGeometry args={[0.08, 0.006, 0.006]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.guide}
            emissive={DIAGRAM_COLORS.guide}
            emissiveIntensity={0.5}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* Caisse plaquée sur la pente, translucide comme la rampe. */}
      <group position={layout.crateCentre} rotation-z={-alpha}>
        <mesh>
          <boxGeometry args={CRATE_SIZE} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.object}
            roughness={0.7}
            metalness={0.1}
            transparent
            opacity={0.6}
            depthWrite={false}
          />
        </mesh>
        <lineSegments geometry={crateEdges}>
          <lineBasicMaterial
            color={DIAGRAM_COLORS.object}
            transparent
            opacity={0.5}
          />
        </lineSegments>
      </group>

      {/* Taquet qui bloque la caisse en bas de pente. */}
      <mesh position={layout.cleatCentre} rotation-z={-alpha}>
        <boxGeometry args={CLEAT_SIZE} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.applied}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>

      {/* Points d'application : centre de gravité et points de contact. */}
      <mesh position={[layout.crateCentre[0], layout.crateCentre[1], Z_BUILD]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.object}
          emissive={DIAGRAM_COLORS.object}
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[layout.contact[0], layout.contact[1], Z_CONTACT]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial
          color={DIAGRAM_COLORS.object}
          emissive={DIAGRAM_COLORS.object}
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>

      {/* Poids : vertical, quelle que soit l'inclinaison de la rampe. */}
      <group
        ref={weightArrow}
        position={[layout.crateCentre[0], layout.crateCentre[1], Z_BUILD]}
        scale={0}
      >
        <VectorArrow
          origin={ARROW_ORIGIN}
          direction={DOWNWARD}
          length={weightLength}
          color={DIAGRAM_COLORS.weight}
          thickness={0.022}
        />
      </group>

      {/* Composante perpendiculaire au plan : c'est elle que N compense. */}
      <group
        ref={perpendicularArrow}
        position={[layout.crateCentre[0], layout.crateCentre[1], Z_BUILD]}
        scale={0}
      >
        <VectorArrow
          origin={ARROW_ORIGIN}
          direction={layout.intoSlope}
          length={supportLength}
          color={DIAGRAM_COLORS.guide}
          thickness={0.013}
          opacity={0.75}
        />
      </group>

      {/* Composante parallèle au plan : c'est elle que le taquet retient. */}
      <group
        ref={parallelArrow}
        position={[layout.crateCentre[0], layout.crateCentre[1], Z_BUILD]}
        scale={0}
      >
        <VectorArrow
          origin={ARROW_ORIGIN}
          direction={layout.downSlope}
          length={parallelLength}
          color={DIAGRAM_COLORS.guide}
          thickness={0.013}
          opacity={0.75}
        />
      </group>

      {/* Parallélogramme : il referme la décomposition sur la pointe de P. */}
      <group
        ref={guideAlong}
        position={layout.guides[0].start}
        quaternion={layout.guides[0].quaternion}
        scale-y={0}
      >
        <mesh position={[0, layout.guides[0].length / 2, 0]}>
          <cylinderGeometry args={[0.005, 0.005, layout.guides[0].length, 6]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.guide}
            emissive={DIAGRAM_COLORS.guide}
            emissiveIntensity={0.5}
            transparent
            opacity={0.5}
            toneMapped={false}
          />
        </mesh>
      </group>
      <group
        ref={guideAcross}
        position={layout.guides[1].start}
        quaternion={layout.guides[1].quaternion}
        scale-y={0}
      >
        <mesh position={[0, layout.guides[1].length / 2, 0]}>
          <cylinderGeometry args={[0.005, 0.005, layout.guides[1].length, 6]} />
          <meshStandardMaterial
            color={DIAGRAM_COLORS.guide}
            emissive={DIAGRAM_COLORS.guide}
            emissiveIntensity={0.5}
            transparent
            opacity={0.5}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Force de soutien : perpendiculaire au plan, au point de contact. */}
      <group
        ref={supportArrow}
        position={[layout.contact[0], layout.contact[1], Z_CONTACT]}
        scale={0}
      >
        <VectorArrow
          origin={ARROW_ORIGIN}
          direction={layout.normal}
          length={supportLength}
          color={DIAGRAM_COLORS.support}
          thickness={0.022}
        />
      </group>

      {/* Action du taquet : elle remonte la pente. */}
      <group
        ref={cleatArrow}
        position={[layout.cleatContact[0], layout.cleatContact[1], Z_CONTACT]}
        scale={0}
      >
        <VectorArrow
          origin={ARROW_ORIGIN}
          direction={layout.upSlope}
          length={parallelLength}
          color={DIAGRAM_COLORS.applied}
          thickness={0.013}
        />
      </group>

      {/* Fantôme du poids reporté à côté de N : la comparaison est directe. */}
      <group
        ref={ghostArrow}
        position={[layout.contact[0], layout.contact[1], Z_GHOST]}
        scale={0}
      >
        <VectorArrow
          origin={ARROW_ORIGIN}
          direction={layout.normal}
          length={weightLength}
          color={DIAGRAM_COLORS.weight}
          thickness={0.013}
          opacity={0.3}
        />
      </group>

      <DiagramLabel position={layout.labels.angle}>
        α = {formatNumber(angleDeg, 0)}°
      </DiagramLabel>
      <DiagramLabel position={layout.labels.mass}>
        m = {formatNumber(mass, 0)} kg
      </DiagramLabel>

      {inCycle ? (
        <DiagramLabel position={layout.labels.weight} tone="warning">
          P
        </DiagramLabel>
      ) : null}

      {showComponents ? (
        <>
          <DiagramLabel position={layout.labels.perpendicular}>P⟂</DiagramLabel>
          <DiagramLabel position={layout.labels.parallel}>P∥</DiagramLabel>
        </>
      ) : null}

      {showContact ? (
        <>
          <DiagramLabel position={layout.labels.support} tone="info">
            N
          </DiagramLabel>
          <DiagramLabel position={layout.labels.cleat} tone="accent">
            T
          </DiagramLabel>
        </>
      ) : null}

      {showGhost ? (
        <DiagramLabel position={layout.labels.ghost} tone="danger">
          N &lt; P
        </DiagramLabel>
      ) : null}
    </group>
  );
}
