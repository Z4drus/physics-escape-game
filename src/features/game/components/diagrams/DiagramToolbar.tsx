"use client";

import { cn } from "@/lib/cn";

/**
 * Barre d'outils de la vue agrandie : zoom, légendes, remise à plat de la vue.
 * Chaque commande a un raccourci clavier, rappelé dans son infobulle.
 */
export function DiagramToolbar({
  zoom,
  showLabels,
  onZoom,
  onToggleLabels,
  onReset,
  onCollapse,
}: {
  zoom: number;
  showLabels: boolean;
  onZoom: (factor: number) => void;
  onToggleLabels: () => void;
  onReset: () => void;
  onCollapse: () => void;
}) {
  return (
    <div className="glass rounded-pill flex items-center gap-1 p-1.5">
      <ToolButton label="Dézoomer (touche -)" onClick={() => onZoom(1 / 1.25)}>
        <MinusGlyph />
      </ToolButton>

      <span className="text-ink-fade w-12 text-center font-mono text-xs tabular-nums">
        {Math.round(zoom * 100)} %
      </span>

      <ToolButton label="Zoomer (touche +)" onClick={() => onZoom(1.25)}>
        <PlusGlyph />
      </ToolButton>

      <Separator />

      <ToolButton
        label={
          showLabels
            ? "Masquer les légendes (touche L)"
            : "Afficher les légendes (touche L)"
        }
        onClick={onToggleLabels}
        active={showLabels}
      >
        {showLabels ? <EyeGlyph /> : <EyeOffGlyph />}
      </ToolButton>

      <ToolButton label="Recadrer la vue (touche R)" onClick={onReset}>
        <ResetGlyph />
      </ToolButton>

      <Separator />

      <ToolButton label="Réduire le schéma (Échap)" onClick={onCollapse}>
        <CollapseGlyph />
      </ToolButton>
    </div>
  );
}

function Separator() {
  return <span aria-hidden className="bg-line-strong mx-1 h-5 w-px" />;
}

function ToolButton({
  label,
  onClick,
  children,
  active = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "tap-target rounded-pill grid size-10 cursor-pointer place-items-center",
        "ease-smooth transition-[background-color,color,scale] duration-[200ms]",
        "hover:bg-surface-strong active:scale-[0.96]",
        active ? "text-accent-soft" : "text-ink-fade hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function PlusGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4">
      <path d="M8 3.5v9M3.5 8h9" {...STROKE} />
    </svg>
  );
}

function MinusGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4">
      <path d="M3.5 8h9" {...STROKE} />
    </svg>
  );
}

function EyeGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4">
      <path
        d="M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4-6.5-4-6.5-4Z"
        {...STROKE}
      />
      <circle cx="8" cy="8" r="1.75" {...STROKE} />
    </svg>
  );
}

function EyeOffGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4">
      <path
        d="M3 3l10 10M6.3 6.4A2 2 0 0 0 8 10a2 2 0 0 0 1.7-1M4.2 4.9C2.6 6 1.5 8 1.5 8s2.4 4 6.5 4c1 0 1.9-.2 2.7-.6M11.7 11.1"
        {...STROKE}
      />
      <path
        d="M6.6 4.2A6.6 6.6 0 0 1 8 4c4.1 0 6.5 4 6.5 4a12 12 0 0 1-1.9 2.3"
        {...STROKE}
      />
    </svg>
  );
}

function ResetGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4">
      <path d="M13 8a5 5 0 1 1-1.6-3.7" {...STROKE} />
      <path d="M13 2.5V5h-2.5" {...STROKE} />
    </svg>
  );
}

function CollapseGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4">
      <path d="M6.5 2.5v4h-4M9.5 13.5v-4h4" {...STROKE} />
      <path d="M6.5 6.5L2.5 2.5M9.5 9.5l4 4" {...STROKE} />
    </svg>
  );
}
