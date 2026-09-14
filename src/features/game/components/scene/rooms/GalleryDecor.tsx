"use client";

import { GuardDesk } from "@/features/game/components/scene/decor/Desks";
import { FuseBox } from "@/features/game/components/scene/decor/Devices";
import {
  Bench,
  Chandelier,
  Rope,
  Stanchion,
} from "@/features/game/components/scene/decor/Fixtures";
import { MODELS } from "@/features/game/components/scene/decor/GltfProp";
import { Painting } from "@/features/game/components/scene/decor/Painting";
import { Showcase } from "@/features/game/components/scene/decor/Showcase";
import {
  FramedPoster,
  Plaque,
} from "@/features/game/components/scene/decor/WallPieces";
import { CHANDELIER_POSITIONS } from "@/features/game/components/scene/Lights";
import { useGameStore } from "@/features/game/state/useGameStore";

const PAINTINGS: readonly {
  image: string;
  caption: string;
  position: [number, number, number];
  rotationY: number;
}[] = [
  {
    image: "/images/paintings/archimede.webp",
    caption: "Archimède",
    position: [-8, 2.05, -1.3],
    rotationY: Math.PI / 2,
  },
  {
    image: "/images/paintings/galilee.webp",
    caption: "Galilée",
    position: [-4.8, 2.05, -6],
    rotationY: 0,
  },
  {
    image: "/images/paintings/newton.webp",
    caption: "Isaac Newton",
    position: [8, 2.05, -0.6],
    rotationY: -Math.PI / 2,
  },
  {
    image: "/images/paintings/curie.webp",
    caption: "Marie Curie",
    position: [-2.8, 2.05, 8],
    rotationY: Math.PI,
  },
];

/**
 * Décor de la galerie des instruments : tableaux, pièces exposées, bureau du
 * surveillant, tableau électrique, lustres et banquette. Les postes sont
 * rendus à part par `StationProp`.
 */
export function GalleryDecor() {
  const powered = useGameStore((state) => state.powerRestored);
  const drawerOpen = useGameStore((state) =>
    state.inventory.includes("uv-lamp"),
  );

  return (
    <group>
      {PAINTINGS.map((painting) => (
        <Painting key={painting.image} {...painting} />
      ))}
      <FramedPoster
        position={[2.8, 2.05, 8]}
        rotationY={Math.PI}
        image="/images/decor/poster.webp"
      />
      <Plaque
        position={[8, 1.5, 3.4]}
        rotationY={-Math.PI / 2}
        lines={[
          "Le cadenas s'ouvre",
          "dans l'ordre du temps,",
          "du plus ancien",
          "au plus récent.",
        ]}
        width={0.8}
        height={0.42}
      />

      <Showcase
        position={[-2.3, 0, -0.6]}
        rotationY={0.4}
        model={MODELS.bustArchimede}
        modelHeight={0.78}
        pedestalHeight={1.05}
        caption="Archimède"
      />
      <Showcase
        position={[2.3, 0, -0.6]}
        rotationY={-0.3}
        model={MODELS.armillary}
        modelHeight={0.62}
        pedestalHeight={0.95}
        glass
        glassHeight={0.86}
        caption="Sphère armillaire"
      />
      <Showcase
        position={[-6.2, 0, 1.0]}
        rotationY={0.9}
        model={MODELS.telescope}
        modelHeight={1.55}
        pedestalHeight={0.18}
        pedestalSize={1.0}
        caption="Lunette astronomique"
      />
      {/* Instruments d'électricité du XIXe siècle (Smithsonian, CC0) */}
      <Showcase
        position={[-6.8, 0, -5.0]}
        rotationY={0.6}
        model={MODELS.galvanometer}
        modelHeight={0.5}
        pedestalHeight={0.95}
        glass
        glassHeight={0.72}
        caption="Galvanomètre, 1870"
      />
      <Showcase
        position={[6.8, 0, -5.0]}
        rotationY={-0.6}
        model={MODELS.inductionCoil}
        modelHeight={0.42}
        pedestalHeight={0.95}
        glass
        glassHeight={0.66}
        caption="Bobine d'induction"
      />

      <GuardDesk
        position={[3.6, 0, 6.9]}
        rotationY={Math.PI}
        drawerOpen={drawerOpen}
      />
      <FuseBox
        position={[7.9, 1.5, 6.5]}
        rotationY={-Math.PI / 2}
        powered={powered}
      />

      {CHANDELIER_POSITIONS.map((position) => (
        <Chandelier
          key={position.join(":")}
          position={position}
          lit={powered}
        />
      ))}

      <Bench position={[0, 0, 2.2]} />

      {/* Poteaux à corde de part et d'autre des portes */}
      <Stanchion position={[-1.9, 0, -5.2]} />
      <Stanchion position={[-3.4, 0, -5.2]} />
      <Rope from={[-1.9, 0, -5.2]} to={[-3.4, 0, -5.2]} />
      <Stanchion position={[1.9, 0, -5.2]} />
      <Stanchion position={[3.4, 0, -5.2]} />
      <Rope from={[1.9, 0, -5.2]} to={[3.4, 0, -5.2]} />
      <Stanchion position={[-1.9, 0, 7.2]} />
      <Stanchion position={[-0.4, 0, 7.2]} />
      <Rope from={[-1.9, 0, 7.2]} to={[-0.4, 0, 7.2]} />
    </group>
  );
}
