"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { DiagramToolbar } from "@/features/game/components/diagrams/DiagramToolbar";
import {
  DiagramStage,
  ZOOM_LIMITS,
  type DiagramControlsHandle,
} from "@/features/game/components/diagrams/DiagramStage";
import { useWheelZoom } from "@/features/game/components/diagrams/useWheelZoom";
import { useFocusTrap } from "@/features/game/hooks/useFocusTrap";
import { TRANSITION } from "@/lib/motion";
import type { DiagramSpec } from "@/types/game";

/** Identifiant partagé qui fait morpher le cadre entre ses deux tailles. */
const FRAME_LAYOUT_ID = "diagram-frame";

const FRAME_CLASSES =
  "relative overflow-hidden rounded-lg bg-[radial-gradient(120%_100%_at_50%_0%,color-mix(in_srgb,var(--brand-cyan)_12%,transparent),transparent_62%),linear-gradient(to_bottom,rgb(255_255_255/0.04),rgb(255_255_255/0.01))] shadow-[inset_0_0_0_1px_var(--line)]";

/**
 * Schéma 3D animé d'une question, en vue réduite dans la boîte de dialogue et
 * en vue agrandie par-dessus celle-ci.
 *
 * Les deux vues partagent le même identifiant de layout : le cadre grandit
 * d'un seul mouvement au lieu d'apparaître ailleurs, et la scène se révèle une
 * fois le déplacement terminé.
 */
export function DiagramViewer({
  spec,
  caption,
  expanded,
  onExpandedChange,
}: {
  spec: DiagramSpec;
  /** Situation décrite par la question, rappelée en vue agrandie. */
  caption: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const [showLabels, setShowLabels] = useState(true);
  const [zoom, setZoom] = useState(1);
  const controlsRef = useRef<DiagramControlsHandle | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const reducedMotion = useReducedMotion();
  // Le morph du cadre est un déplacement, pas une décoration : on le supprime
  // plutôt que de l'accélérer quand le système demande moins d'animation.
  const morph = reducedMotion ? { duration: 0 } : TRANSITION.base;

  const applyZoom = useCallback((factor: number) => {
    setZoom((current) =>
      Math.min(ZOOM_LIMITS.max, Math.max(ZOOM_LIMITS.min, current * factor)),
    );
  }, []);

  /** Rotation au clavier : le glisser à la souris n'a pas d'équivalent natif. */
  const rotate = useCallback((azimuth: number, polar: number) => {
    const controls = controlsRef.current;
    if (!controls) return;

    controls.setAzimuthalAngle(controls.getAzimuthalAngle() + azimuth);
    controls.setPolarAngle(controls.getPolarAngle() + polar);
    controls.update();
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    controlsRef.current?.reset();
  }, []);

  const collapse = useCallback(() => {
    resetView();
    onExpandedChange(false);
    // Le bouton d'agrandissement vient d'être remonté : on lui rend le focus
    // au lieu de le laisser retomber sur le corps du document.
    requestAnimationFrame(() => expandButtonRef.current?.focus());
  }, [onExpandedChange, resetView]);

  useWheelZoom(stageRef, expanded, applyZoom);

  // `collapse` rend lui-même le focus au bouton d'agrandissement, qui n'est
  // remonté qu'après la fermeture : le piège n'a pas à s'en charger.
  useFocusTrap(overlayRef, expanded, false);

  useEffect(() => {
    if (expanded) overlayRef.current?.focus();
  }, [expanded]);

  // Raccourcis de la vue agrandie. Échap y est traité ici, avant la boîte de
  // dialogue, pour que la première pression referme le schéma et non le poste.
  useEffect(() => {
    if (!expanded) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (key === "escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        collapse();
        return;
      }
      if (key === "+" || key === "=") applyZoom(1.25);
      else if (key === "-") applyZoom(1 / 1.25);
      else if (key === "l") setShowLabels((visible) => !visible);
      else if (key === "r") resetView();
      else if (key.startsWith("arrow")) {
        event.preventDefault();
        if (key === "arrowleft") rotate(-0.12, 0);
        else if (key === "arrowright") rotate(0.12, 0);
        else if (key === "arrowup") rotate(0, -0.08);
        else rotate(0, 0.08);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [applyZoom, collapse, expanded, resetView, rotate]);

  return (
    <>
      <div className="relative aspect-[16/10] w-full">
        {expanded ? (
          <div className="border-line text-ink-mute grid size-full place-items-center rounded-lg border border-dashed text-xs">
            Schéma ouvert en grand
          </div>
        ) : (
          <motion.div
            layoutId={FRAME_LAYOUT_ID}
            transition={morph}
            className={`${FRAME_CLASSES} size-full`}
          >
            <DiagramStage
              spec={spec}
              showLabels={showLabels}
              zoom={zoom}
              controlsRef={controlsRef}
            />

            <button
              ref={expandButtonRef}
              type="button"
              onClick={() => onExpandedChange(true)}
              className="glass rounded-pill text-ink-fade hover:text-ink ease-smooth tap-target absolute top-2.5 right-2.5 flex h-10 cursor-pointer items-center gap-2 pr-3.5 pl-3 text-xs transition-[color,scale] duration-[200ms] active:scale-[0.96]"
            >
              <ExpandGlyph />
              Agrandir
            </button>

            <p className="text-ink-mute pointer-events-none absolute right-3 bottom-2.5 font-mono text-[10px]">
              Glissez pour pivoter
            </p>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {expanded ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITION.micro}
            ref={overlayRef}
            tabIndex={-1}
            className="scrim fixed inset-0 z-30 flex flex-col gap-3 p-4 outline-none sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="Schéma agrandi"
          >
            <motion.div
              layoutId={FRAME_LAYOUT_ID}
              transition={morph}
              ref={stageRef}
              className={`${FRAME_CLASSES} mx-auto min-h-0 w-full max-w-[110rem] flex-1 cursor-grab active:cursor-grabbing`}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ ...TRANSITION.base, delay: 0.12 }}
                className="size-full"
              >
                <DiagramStage
                  spec={spec}
                  showLabels={showLabels}
                  zoom={zoom}
                  controlsRef={controlsRef}
                />
              </motion.div>

              <p className="text-ink-fade pointer-events-none absolute top-3 left-4 max-w-[60%] text-xs">
                {caption}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ ...TRANSITION.base, delay: 0.12 }}
              className="flex shrink-0 flex-col items-center gap-2"
            >
              <DiagramToolbar
                zoom={zoom}
                showLabels={showLabels}
                onZoom={applyZoom}
                onToggleLabels={() => setShowLabels((visible) => !visible)}
                onReset={resetView}
                onCollapse={collapse}
              />
              <p className="text-ink-mute text-[11px]">
                Molette ou +/- pour zoomer, glisser ou flèches pour pivoter,
                Échap pour réduire.
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function ExpandGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4">
      <path
        d="M2.5 6.5v-4h4M13.5 9.5v4h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.5 2.5l4.5 4.5M13.5 13.5L9 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
