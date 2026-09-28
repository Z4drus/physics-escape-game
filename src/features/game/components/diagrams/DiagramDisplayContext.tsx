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
 * Le fournisseur est monté à l'intérieur du `<Canvas>`, au plus près des
 * scènes. Le contexte doit être lu hors des `<Html>` de drei : leurs enfants
 * sont rendus dans une racine React à part, qu'aucun contexte ne traverse.
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
