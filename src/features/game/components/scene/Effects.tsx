"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

/**
 * Post-traitement de la salle : un léger bloom pour les lampes, les fenêtres
 * et l'hologramme, et un vignettage qui concentre le regard. `multisampling`
 * vient du palier de qualité : 0 coupe l'anticrénelage sur les machines
 * modestes.
 */
export function Effects({ multisampling }: { multisampling: number }) {
  return (
    <EffectComposer multisampling={multisampling}>
      <Bloom
        mipmapBlur
        luminanceThreshold={1.0}
        luminanceSmoothing={0.3}
        intensity={0.45}
        radius={0.5}
      />
      <Vignette eskil={false} offset={0.22} darkness={0.55} />
    </EffectComposer>
  );
}
