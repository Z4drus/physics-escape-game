"use client";

import { AnimatePresence } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";

import type { PointerLockControlsHandle } from "@/features/game/components/GameCanvas";
import { Crosshair } from "@/features/game/components/ui/Crosshair";
import { Hud } from "@/features/game/components/ui/Hud";
import { InteractionPrompt } from "@/features/game/components/ui/InteractionPrompt";
import { PuzzleDialog } from "@/features/game/components/ui/PuzzleDialog";
import { StartOverlay } from "@/features/game/components/ui/StartOverlay";
import { VictoryOverlay } from "@/features/game/components/ui/VictoryOverlay";
import { PUZZLES_BY_ID } from "@/features/game/data/puzzles";
import { INTERACTIVE_OBJECTS } from "@/features/game/data/room";
import { useInteractionHotkey } from "@/features/game/hooks/useInteractionHotkey";
import {
  selectDoorOpen,
  useGameStore,
} from "@/features/game/state/useGameStore";

/** Le rendu WebGL ne peut pas être pré-rendu côté serveur. */
const GameCanvas = dynamic(
  () =>
    import("@/features/game/components/GameCanvas").then(
      (mod) => mod.GameCanvas,
    ),
  { ssr: false, loading: () => <CanvasFallback /> },
);

const LABELS_BY_ID = new Map(
  INTERACTIVE_OBJECTS.map((object) => [object.id, object.label]),
);

/**
 * Écran de jeu : assemble la scène 3D, le HUD et les fenêtres modales, et
 * synchronise le verrouillage du pointeur avec l'état de la partie.
 */
export function GameScreen() {
  const controlsRef = useRef<PointerLockControlsHandle | null>(null);

  const status = useGameStore((state) => state.status);
  const keys = useGameStore((state) => state.keys);
  const startedAt = useGameStore((state) => state.startedAt);
  const finishedAt = useGameStore((state) => state.finishedAt);
  const attempts = useGameStore((state) => state.attempts);
  const focusedObjectId = useGameStore((state) => state.focusedObjectId);
  const activePuzzleId = useGameStore((state) => state.activePuzzleId);
  const selectedAnswerId = useGameStore((state) => state.selectedAnswerId);
  const answerResult = useGameStore((state) => state.answerResult);
  const doorOpen = useGameStore(selectDoorOpen);

  const beginSession = useGameStore((state) => state.beginSession);
  const pause = useGameStore((state) => state.pause);
  const selectAnswer = useGameStore((state) => state.selectAnswer);
  const retryPuzzle = useGameStore((state) => state.retryPuzzle);
  const closePuzzle = useGameStore((state) => state.closePuzzle);
  const reset = useGameStore((state) => state.reset);

  useInteractionHotkey();

  // Une modale est ouverte : on rend la souris au joueur.
  useEffect(() => {
    if (status === "puzzle" || status === "won") {
      controlsRef.current?.unlock();
    }
  }, [status]);

  const requestLock = useCallback(() => {
    controlsRef.current?.lock();
  }, []);

  const handleRestart = useCallback(() => {
    reset();
  }, [reset]);

  const activePuzzle = activePuzzleId
    ? PUZZLES_BY_ID.get(activePuzzleId)
    : null;
  const focusedLabel =
    status === "playing" && focusedObjectId
      ? (LABELS_BY_ID.get(focusedObjectId) ?? null)
      : null;

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <GameCanvas
        controlsRef={controlsRef}
        onLock={beginSession}
        onUnlock={pause}
      />

      <Hud
        keys={keys}
        startedAt={startedAt}
        finishedAt={finishedAt}
        doorOpen={doorOpen}
      />
      <Crosshair active={Boolean(focusedLabel)} />
      <InteractionPrompt label={focusedLabel} />

      <AnimatePresence mode="wait">
        {status === "idle" || status === "paused" ? (
          <StartOverlay
            key="start"
            variant={status === "idle" ? "idle" : "paused"}
            onEnter={requestLock}
          />
        ) : null}

        {status === "puzzle" && activePuzzle ? (
          <PuzzleDialog
            key="puzzle"
            puzzle={activePuzzle}
            selectedAnswerId={selectedAnswerId}
            answerResult={answerResult}
            onAnswer={selectAnswer}
            onRetry={retryPuzzle}
            onClose={closePuzzle}
          />
        ) : null}

        {status === "won" ? (
          <VictoryOverlay
            key="victory"
            durationMs={startedAt && finishedAt ? finishedAt - startedAt : 0}
            attempts={attempts}
            onRestart={handleRestart}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

/** Placeholder affiché pendant le chargement du bundle three.js. */
function CanvasFallback() {
  return (
    <div className="bg-background absolute inset-0 grid place-items-center">
      <p className="text-muted font-display text-[11px] tracking-[0.24em] uppercase">
        Initialisation du laboratoire…
      </p>
    </div>
  );
}
