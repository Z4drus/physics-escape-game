"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

interface DiagramDisplay {
  /** Les étiquettes de légende sont-elles visibles ? */
  showLabels: boolean;
}

const DiagramDisplayContext = createContext<DiagramDisplay>({
  showLabels: true,
});

/**
 * Options d'affichage partagées par toutes les scènes de schéma.
 *
 * Le fournisseur est monté **à l'intérieur** du `<Canvas>` : les contextes
 * React ne traversent pas la frontière du moteur de rendu three.js, une valeur
 * fournie côté DOM serait donc invisible pour les scènes.
 */
export function DiagramDisplayProvider({
  showLabels,
  children,
}: {
  showLabels: boolean;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ showLabels }), [showLabels]);

  return (
    <DiagramDisplayContext value={value}>{children}</DiagramDisplayContext>
  );
}

export function useDiagramDisplay(): DiagramDisplay {
  return useContext(DiagramDisplayContext);
}
