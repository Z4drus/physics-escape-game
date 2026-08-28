import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Petit libellé de section. Pas de point, pas d'icône et aucun tracking
 * positif : la majuscule conserve le −0,01 em global du système.
 */
export function Eyebrow({
  children,
  className,
  ...props
}: ComponentProps<"p"> & { children: ReactNode }) {
  return (
    <p
      className={cn("text-ink-fade text-xs font-medium uppercase", className)}
      {...props}
    >
      {children}
    </p>
  );
}
