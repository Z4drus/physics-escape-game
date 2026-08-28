"use client";

import { AnimatePresence, MotionConfig } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef } from "react";

import type { PointerLockControlsHandle } from "@/features/game/components/GameCanvas";
import { Crosshair } from "@/features/game/components/ui/Crosshair";
import { Hud } from "@/features/game/components/ui/Hud";
import { InteractionPrompt } from "@/features/game/components/ui/InteractionPrompt";
import { PuzzleDialog } from "@/features/game/components/ui/PuzzleDialog";
import { StartOverlay } from "@/features/game/components/ui/StartOverlay";
import { VictoryOverlay } from "@/features/game/components/ui/VictoryOverlay";
import { STATIONS_BY_ID } from "@/features/game/data/stations";
import { useInteractionHotkey } from "@/features/game/hooks/useInteractionHotkey";
import { usePointerLock } from "@/features/game/hooks/usePointerLock";
import {
  orderAnswers,
  selectActivePuzzle,
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
  const focusedStationId = useGameStore((state) => state.focusedStationId);
  const activeStationId = useGameStore((state) => state.activeStationId);
  const activePuzzle = useGameStore(selectActivePuzzle);
  const answerOrders = useGameStore((state) => state.answerOrders);
  const selectedAnswerId = useGameStore((state) => state.selectedAnswerId);
  const answerResult = useGameStore((state) => state.answerResult);
  const doorOpen = useGameStore(selectDoorOpen);

  const beginSession = useGameStore((state) => state.beginSession);
  const pause = useGameStore((state) => state.pause);
  const selectAnswer = useGameStore((state) => state.selectAnswer);
  const retryPuzzle = useGameStore((state) => state.retryPuzzle);
  const closePuzzle = useGameStore((state) => state.closePuzzle);
  const reset = useGameStore((state) => state.reset);

  const {
    requestLock,
    releaseLock,
    handleUnlockEvent,
    ready: lockReady,
  } = usePointerLock(controlsRef);

  useInteractionHotkey();

  // Une modale est ouverte : on rend la souris au joueur.
  useEffect(() => {
    if (status === "puzzle" || status === "won") {
      releaseLock();
    }
  }, [status, releaseLock]);

  /** Seule une sortie décidée par le joueur met la partie en pause. */
  const handleUnlock = useCallback(() => {
    if (!handleUnlockEvent()) pause();
  }, [handleUnlockEvent, pause]);

  /**
   * Fermeture d'un poste : on enchaîne directement sur le verrouillage, dans
   * le geste utilisateur qui a déclenché la fermeture, pour éviter un détour
   * inutile par l'écran de pause.
   */
  const handleClosePuzzle = useCallback(async () => {
    closePuzzle();
    const locked = await requestLock();
    if (!locked) pause();
  }, [closePuzzle, pause, requestLock]);

  const handleRestart = useCallback(() => {
    reset();
  }, [reset]);

  const activeStation = activeStationId
    ? STATIONS_BY_ID.get(activeStationId)
    : null;

  const activeAnswers = useMemo(
    () => orderAnswers(activePuzzle, answerOrders),
    [activePuzzle, answerOrders],
  );

  const focusedLabel =
    status === "playing" && focusedStationId
      ? (STATIONS_BY_ID.get(focusedStationId)?.label ?? null)
      : null;

  return (
    /*
     * `reducedMotion="user"` étend la préférence système aux animations
     * pilotées par `motion` : la règle CSS de `globals.css` ne couvre que les
     * transitions et les animations déclarées en feuille de style.
     */
    <MotionConfig reducedMotion="user">
      <main className="relative h-dvh w-full overflow-hidden">
        <GameCanvas
          controlsRef={controlsRef}
          onLock={beginSession}
          onUnlock={handleUnlock}
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
              ready={lockReady}
            />
          ) : null}

          {status === "puzzle" && activePuzzle && activeStation ? (
            <PuzzleDialog
              key="puzzle"
              puzzle={activePuzzle}
              answers={activeAnswers}
              stationLabel={activeStation.label}
              reward={activeStation.reward}
              selectedAnswerId={selectedAnswerId}
              answerResult={answerResult}
              onAnswer={selectAnswer}
              onRetry={retryPuzzle}
              onClose={handleClosePuzzle}
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
    </MotionConfig>
  );
}

/** Placeholder affiché pendant le chargement du bundle three.js. */
function CanvasFallback() {
  return (
    <div className="bg-background absolute inset-0 grid place-items-center">
      <p className="text-ink-mute font-display text-xs font-medium uppercase">
        Initialisation du laboratoire…
      </p>
    </div>
  );
}
