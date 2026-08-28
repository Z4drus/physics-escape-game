"use client";

import { cn } from "@/lib/cn";

/**
 * Réticule central : il s'ouvre légèrement et se colore lorsqu'un dispositif
 * est à portée d'interaction.
 */
export function Crosshair({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 grid place-items-center"
    >
      <div
        className={cn(
          "relative size-6 rounded-full transition-[scale,opacity] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
          active ? "scale-100 opacity-100" : "scale-75 opacity-60",
        )}
      >
        <div
          className={cn(
            "size-full rounded-full border transition-colors duration-200",
            active ? "border-accent/80" : "border-white/35",
          )}
        />
        <div
          className={cn(
            "absolute top-1/2 left-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-200",
            active ? "bg-accent" : "bg-white/70",
          )}
        />
      </div>
    </div>
  );
}
