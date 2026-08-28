"use client";

import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Bouton du design system, avec ses trois micro-interactions simultanées
 * (450 ms, easing unique) :
 *
 * 1. le fond se rétracte de 2 px vers l'intérieur — l'effet « press-in » ;
 * 2. le libellé roule vers le haut, son clone étant obtenu par `text-shadow`
 *    plutôt que par un second nœud dans le DOM ;
 * 3. la flèche part en diagonale pendant qu'une seconde la remplace.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  withArrow = false,
  className,
  ...props
}: ComponentProps<"button"> & {
  children: ReactNode;
  variant?: "primary" | "glass";
  size?: "md" | "sm";
  /** Ajoute la flèche diagonale à relais typique des appels à l'action. */
  withArrow?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "group relative isolate inline-flex cursor-pointer items-center justify-center",
        "ease-smooth font-medium whitespace-nowrap transition-[opacity] duration-[200ms]",
        "disabled:pointer-events-none disabled:opacity-45",
        size === "md" && "h-11 rounded-md px-[18px] text-base",
        size === "sm" && "h-8 rounded-sm px-3 text-sm",
        variant === "primary" && "text-background",
        variant === "glass" && "text-ink",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "ease-smooth absolute inset-0 rounded-[inherit] transition-[inset] duration-[450ms]",
          "group-hover:inset-[2px] group-active:inset-[3px]",
          variant === "primary" && "bg-ink",
          variant === "glass" &&
            "bg-surface-raised outline-line-strong outline-1 outline-offset-[-1px]",
        )}
      />

      <span className="relative flex items-center gap-2.5">
        <span
          className="block h-[1.4em] overflow-hidden"
          style={{ textShadow: "0 1.4em currentColor" }}
        >
          <span className="ease-smooth block transition-transform duration-[450ms] group-hover:-translate-y-full">
            {children}
          </span>
        </span>

        {withArrow ? <RelayArrow /> : null}
      </span>
    </button>
  );
}

/**
 * Flèche diagonale « à relais » : la première sort par le coin supérieur
 * droit tandis que la seconde entre par le coin inférieur gauche.
 */
function RelayArrow() {
  return (
    <span className="relative block size-[1.15em] overflow-hidden">
      <ArrowGlyph className="ease-smooth absolute inset-0 transition-transform duration-[450ms] group-hover:translate-x-full group-hover:-translate-y-full" />
      <ArrowGlyph className="ease-smooth absolute inset-0 -translate-x-full translate-y-full transition-transform duration-[450ms] group-hover:translate-none" />
    </span>
  );
}

function ArrowGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={cn("size-full", className)}
    >
      <path
        d="M4 12L12 4M12 4H5.5M12 4V10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
