import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Surface de verre du design system : filet interne à 6 %, glow intérieur,
 * aucune ombre portée. Le rayon extérieur et le padding sont pensés pour que
 * l'enfant direct respecte la règle `intérieur = extérieur − padding`.
 */
export function Panel({
  children,
  className,
  ...props
}: ComponentProps<"div"> & { children: ReactNode }) {
  return (
    <div className={cn("glass rounded-xl", className)} {...props}>
      {children}
    </div>
  );
}

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

/** Filet horizontal fondu sur les bords. */
export function Hairline({ className }: { className?: string }) {
  return <div aria-hidden className={cn("hairline-fade w-full", className)} />;
}
