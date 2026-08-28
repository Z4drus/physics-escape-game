"use client";

import { cn } from "@/lib/cn";

/**
 * Réticule central : il s'ouvre et se colore lorsqu'un poste est à portée
 * d'analyse.
 */
export function Crosshair({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 grid place-items-center"
    >
      <div
        className={cn(
          "ease-smooth relative size-5 transition-[scale,opacity] duration-[450ms]",
          active ? "scale-100 opacity-100" : "scale-75 opacity-55",
        )}
      >
        <div
          className={cn(
            "rounded-pill ease-smooth size-full border transition-colors duration-[450ms]",
            active ? "border-accent-soft" : "border-white/30",
          )}
        />
        <div
          className={cn(
            "rounded-pill ease-smooth absolute top-1/2 left-1/2 size-1 -translate-x-1/2 -translate-y-1/2 transition-colors duration-[450ms]",
            active ? "bg-accent-soft" : "bg-white/60",
          )}
        />
      </div>
    </div>
  );
}
