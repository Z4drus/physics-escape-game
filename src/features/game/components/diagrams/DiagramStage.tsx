"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { Suspense, useRef, type ComponentRef, type ReactNode } from "react";
import { Vector3, type Group } from "three";

import { DiagramDisplayProvider } from "@/features/game/components/diagrams/DiagramDisplayContext";
import { DIAGRAM_SCENES } from "@/features/game/components/diagrams/registry";
import type { DiagramSpec, Vec3 } from "@/types/game";

/** Cadrage de référence, commun à toutes les scènes. */
export const DIAGRAM_CAMERA = {
  position: [3.6, 2.6, 4.8] as Vec3,
  target: [0, 0.55, 0] as Vec3,
  fov: 34,
} as const;

/** Distance caméra-cible au repos, dont dérivent tous les niveaux de zoom. */
const BASE_DISTANCE = new Vector3(...DIAGRAM_CAMERA.position).distanceTo(
  new Vector3(...DIAGRAM_CAMERA.target),
);

export const ZOOM_LIMITS = { min: 0.65, max: 3.2 } as const;

export type DiagramControlsHandle = ComponentRef<typeof OrbitControls>;

/**
 * Rendu three.js d'un schéma. Le composant est volontairement piloté de
 * l'extérieur (zoom, légendes) : la vue réduite et la vue agrandie partagent
 * ainsi exactement la même scène.
 */
export function DiagramStage({
  spec,
  showLabels,
  zoom,
  controlsRef,
}: {
  spec: DiagramSpec;
  showLabels: boolean;
  zoom: number;
  controlsRef?: React.RefObject<DiagramControlsHandle | null>;
}) {
  const Scene = DIAGRAM_SCENES[spec.kind];

  if (!Scene) {
    return (
      <div className="text-ink-mute grid size-full place-items-center text-xs">
        Schéma indisponible
      </div>
    );
  }

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      // `offsetSize` mesure la boîte réelle plutôt que son rectangle à
      // l'écran : sans cela, le canvas créé pendant l'agrandissement adopte la
      // taille transformée du cadre et reste figé dessus, décalé dans un coin.
      resize={{ offsetSize: true }}
      camera={{
        fov: DIAGRAM_CAMERA.fov,
        position: DIAGRAM_CAMERA.position,
        near: 0.1,
        far: 40,
      }}
    >
      <DiagramLights />

      <DiagramDisplayProvider showLabels={showLabels}>
        <Suspense fallback={null}>
          <Sway>
            <Scene params={spec.params ?? {}} />
          </Sway>
        </Suspense>
      </DiagramDisplayProvider>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        // Le zoom est piloté par `ZoomRig` pour rester synchronisé avec les
        // boutons de la barre d'outils et la molette du conteneur.
        enableZoom={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.05}
        minAzimuthAngle={-Math.PI / 3}
        maxAzimuthAngle={Math.PI / 3}
        target={DIAGRAM_CAMERA.target}
      />
      <ZoomRig zoom={zoom} />
    </Canvas>
  );
}

// Vecteurs de travail réutilisés d'une frame à l'autre.
const target = new Vector3(...DIAGRAM_CAMERA.target);
const offset = new Vector3();

/**
 * Rapproche ou éloigne la caméra de la cible selon le facteur de zoom.
 *
 * On agit sur la distance plutôt que sur le champ de vision : la perspective
 * reste identique, seul le cadrage change, ce qui évite de déformer les
 * proportions dont dépend la lecture des schémas.
 */
function ZoomRig({ zoom }: { zoom: number }) {
  const camera = useThree((state) => state.camera);

  useFrame((_, delta) => {
    offset.copy(camera.position).sub(target);
    const desired = BASE_DISTANCE / zoom;
    const smoothing = 1 - Math.exp(-10 * Math.min(delta, 0.05));
    const distance = offset.length() + (desired - offset.length()) * smoothing;

    camera.position.copy(offset.setLength(distance).add(target));
  });

  return null;
}

/**
 * Balancement lent du schéma : il donne du volume à la scène sans jamais la
 * faire tourner. Une rotation complète fausserait la lecture des schémas où
 * les distances comptent, comme les chronophotographies de cinématique.
 */
function Sway({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);
  const reducedMotion = useReducedMotion();

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = reducedMotion
      ? 0
      : Math.sin(clock.elapsedTime * 0.28) * 0.16;
  });

  return <group ref={group}>{children}</group>;
}

/** Éclairage commun à tous les schémas : lisible, sans zone bouchée. */
function DiagramLights() {
  return (
    <>
      <ambientLight intensity={1.1} color="#c9d6ef" />
      <directionalLight position={[4, 6, 4]} intensity={2.4} color="#ffffff" />
      <directionalLight
        position={[-5, 3, -2]}
        intensity={0.9}
        color="#7db4ff"
      />
      <pointLight
        position={[0, -2, 3]}
        intensity={6}
        distance={12}
        color="#4ee1c1"
      />
    </>
  );
}
