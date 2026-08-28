"use client";

import { Html } from "@react-three/drei";
import type { ReactNode } from "react";

import { useDiagramDisplay } from "@/features/game/components/diagrams/DiagramDisplayContext";
import { DIAGRAM_COLORS } from "@/features/game/components/diagrams/palette";
import { cn } from "@/lib/cn";
import type { Vec3 } from "@/types/game";

/** Rôle de l'étiquette, qui fixe sa couleur. */
export type LabelTone = "neutral" | "accent" | "warning" | "danger" | "info";

/**
 * Les teintes reprennent celles des objets 3D correspondants : une étiquette
 * de poids porte la couleur de la flèche de poids, ce qui évite au lecteur de
 * chercher à quoi elle se rapporte.
 */
const TONE_COLORS: Readonly<Record<LabelTone, string>> = {
  neutral: "var(--ink)",
  accent: DIAGRAM_COLORS.support,
  warning: DIAGRAM_COLORS.weight,
  danger: DIAGRAM_COLORS.hot,
  info: DIAGRAM_COLORS.cold,
};

/**
 * Étiquette ancrée à un point de la scène, rendue en HTML plutôt qu'en texte
 * 3D : la typographie reste nette à toutes les distances, hérite du design
 * system et n'exige aucun chargement de police pour three.js.
 */
export function DiagramLabel({
  position,
  children,
  tone = "neutral",
  align = "center",
}: {
  position: Vec3;
  children: ReactNode;
  tone?: LabelTone;
  align?: "center" | "left" | "right";
}) {
  const { showLabels } = useDiagramDisplay();
  if (!showLabels) return null;

  return (
    <Html
      position={position}
      center={align === "center"}
      zIndexRange={[10, 0]}
      className="pointer-events-none select-none"
      // Les étiquettes doivent rester lisibles même derrière un objet.
      occlude={false}
    >
      <span
        style={{ color: TONE_COLORS[tone] }}
        className={cn(
          "block rounded-sm px-2 py-1 font-mono text-[11px] whitespace-nowrap tabular-nums",
          "bg-[color-mix(in_srgb,var(--background-deep)_78%,transparent)] backdrop-blur-sm",
          "shadow-[0_0_0_1px_var(--line-strong),0_2px_8px_-2px_rgb(0_7_13/0.7)]",
          align === "left" && "-translate-x-1",
          align === "right" && "translate-x-1",
        )}
      >
        {children}
      </span>
    </Html>
  );
}
