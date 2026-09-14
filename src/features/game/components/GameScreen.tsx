"use client";

import { AnimatePresence, MotionConfig } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { Carnet } from "@/features/game/components/ui/Carnet";
import { CodeLockDialog } from "@/features/game/components/ui/CodeLockDialog";
import { Crosshair } from "@/features/game/components/ui/Crosshair";
import { FuseBoxDialog } from "@/features/game/components/ui/FuseBoxDialog";
import { HologramDialog } from "@/features/game/components/ui/HologramDialog";
import { Hud } from "@/features/game/components/ui/Hud";
import { InspectDialog } from "@/features/game/components/ui/InspectDialog";
import { InteractionPrompt } from "@/features/game/components/ui/InteractionPrompt";
import { IntroOverlay } from "@/features/game/components/ui/IntroOverlay";
import { PauseOverlay } from "@/features/game/components/ui/PauseOverlay";
import { PuzzleDialog } from "@/features/game/components/ui/PuzzleDialog";
import { SafeDialog } from "@/features/game/components/ui/SafeDialog";
import { TitleOverlay } from "@/features/game/components/ui/TitleOverlay";
import { Toasts } from "@/features/game/components/ui/Toasts";
import { VictoryOverlay } from "@/features/game/components/ui/VictoryOverlay";
import { INSPECT_CONTENTS_BY_ID } from "@/features/game/data/clues";
import { INTERACTABLES_BY_ID } from "@/features/game/data/interactables";
import { useGameAudio } from "@/features/game/hooks/useGameAudio";
import { useGameHotkeys } from "@/features/game/hooks/useGameHotkeys";
import {
  usePointerLock,
  type PointerLockControlsHandle,
} from "@/features/game/hooks/usePointerLock";
import { describeObjective } from "@/features/game/logic/objective";
import {
  orderAnswers,
  selectActivePuzzle,
  selectActiveStation,
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
 * Écran de jeu : assemble la scène 3D, le HUD, le carnet, les notifications et
 * les fenêtres, et synchronise le verrouillage du pointeur avec l'état de la
 * partie.
 */
export function GameScreen() {
  const controlsRef = useRef<PointerLockControlsHandle | null>(null);

  const status = useGameStore((state) => state.status);
  const introStep = useGameStore((state) => state.introStep);
  const modal = useGameStore((state) => state.modal);
  const focusedId = useGameStore((state) => state.focusedId);
  const currentRoomId = useGameStore((state) => state.currentRoomId);
  const seals = useGameStore((state) => state.seals);
  const errors = useGameStore((state) => state.errors);
  const attempts = useGameStore((state) => state.attempts);
  const startedAt = useGameStore((state) => state.startedAt);
  const finishedAt = useGameStore((state) => state.finishedAt);
  const toasts = useGameStore((state) => state.toasts);
  const carnetOpen = useGameStore((state) => state.carnetOpen);
  const hologramStep = useGameStore((state) => state.hologramStep);
  const inventory = useGameStore((state) => state.inventory);
  const discoveredClueIds = useGameStore((state) => state.discoveredClueIds);
  const codeDigits = useGameStore((state) => state.codeDigits);
  const safeRiddle = useGameStore((state) => state.safeRiddle);
  const breakers = useGameStore((state) => state.breakers);
  const armedBreakerIds = useGameStore((state) => state.armedBreakerIds);
  const cabinetUnlocked = useGameStore((state) => state.cabinetUnlocked);
  const safeOpen = useGameStore((state) => state.safeOpen);
  const powerRestored = useGameStore((state) => state.powerRestored);
  const uvRevealed = useGameStore((state) => state.uvRevealed);
  const activePuzzle = useGameStore(selectActivePuzzle);
  const activeStation = useGameStore(selectActiveStation);
  const answerOrders = useGameStore((state) => state.answerOrders);
  const selectedAnswerId = useGameStore((state) => state.selectedAnswerId);
  const answerResult = useGameStore((state) => state.answerResult);

  const startIntro = useGameStore((state) => state.startIntro);
  const nextIntroStep = useGameStore((state) => state.nextIntroStep);
  const beginSession = useGameStore((state) => state.beginSession);
  const pause = useGameStore((state) => state.pause);
  const selectAnswer = useGameStore((state) => state.selectAnswer);
  const retryPuzzle = useGameStore((state) => state.retryPuzzle);
  const closeModal = useGameStore((state) => state.closeModal);
  const submitCode = useGameStore((state) => state.submitCode);
  const submitSafe = useGameStore((state) => state.submitSafe);
  const armBreaker = useGameStore((state) => state.armBreaker);
  const dismissToast = useGameStore((state) => state.dismissToast);
  const advanceHologram = useGameStore((state) => state.advanceHologram);
  const finish = useGameStore((state) => state.finish);
  const reset = useGameStore((state) => state.reset);

  const {
    requestLock,
    releaseLock,
    handleUnlockEvent,
    ready: lockReady,
  } = usePointerLock(controlsRef);

  useGameHotkeys();
  useGameAudio();

  // Une fenêtre est ouverte : on rend la souris au joueur.
  useEffect(() => {
    if (status === "modal" || status === "finale" || status === "won") {
      releaseLock();
    }
  }, [status, releaseLock]);

  /** Seule une sortie décidée par le joueur met la partie en pause. */
  const handleUnlock = useCallback(() => {
    if (!handleUnlockEvent()) pause();
  }, [handleUnlockEvent, pause]);

  /**
   * Fermeture d'une fenêtre : on enchaîne directement sur le verrouillage,
   * dans le geste utilisateur qui a déclenché la fermeture, pour éviter un
   * détour inutile par l'écran de pause.
   */
  const handleCloseModal = useCallback(async () => {
    closeModal();
    const locked = await requestLock();
    if (!locked) pause();
  }, [closeModal, pause, requestLock]);

  const activeAnswers = useMemo(
    () => orderAnswers(activePuzzle, answerOrders),
    [activePuzzle, answerOrders],
  );

  const objective = useMemo(
    () =>
      describeObjective({
        seals,
        inventory,
        cabinetUnlocked,
        uvRevealed,
        safeOpen,
        powerRestored,
      }),
    [seals, inventory, cabinetUnlocked, uvRevealed, safeOpen, powerRestored],
  );

  const focused =
    status === "playing" && focusedId
      ? INTERACTABLES_BY_ID.get(focusedId)
      : null;
  const prompt = focused ? { verb: focused.verb, label: focused.label } : null;
  const inspected =
    modal?.kind === "inspect"
      ? INSPECT_CONTENTS_BY_ID.get(modal.objectId)
      : null;
  const showHud = status !== "idle" && status !== "intro";

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

        {showHud ? (
          <Hud
            roomId={currentRoomId}
            seals={seals}
            errors={errors}
            objective={objective}
            startedAt={startedAt}
            finishedAt={finishedAt}
          />
        ) : null}
        <Crosshair active={Boolean(prompt)} />
        <InteractionPrompt prompt={prompt} />
        <Toasts toasts={toasts} onDismiss={dismissToast} />

        <AnimatePresence initial={false}>
          {carnetOpen && status === "playing" ? (
            <Carnet
              key="carnet"
              seals={seals}
              discoveredClueIds={discoveredClueIds}
              codeDigits={codeDigits}
              safeRiddle={safeRiddle}
              uvRevealed={uvRevealed}
              inventory={inventory}
            />
          ) : null}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {status === "idle" ? (
            <TitleOverlay key="title" onStart={startIntro} />
          ) : null}

          {status === "intro" ? (
            <IntroOverlay
              key="intro"
              step={introStep}
              onNext={nextIntroStep}
              onEnter={requestLock}
              ready={lockReady}
            />
          ) : null}

          {status === "paused" ? (
            <PauseOverlay
              key="pause"
              onResume={requestLock}
              ready={lockReady}
            />
          ) : null}

          {status === "modal" &&
          modal?.kind === "puzzle" &&
          activePuzzle &&
          activeStation ? (
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
              onClose={handleCloseModal}
            />
          ) : null}

          {status === "modal" && inspected ? (
            <InspectDialog
              key={`inspect-${inspected.id}`}
              content={inspected}
              digit={
                inspected.codeIndex !== undefined
                  ? codeDigits[inspected.codeIndex]
                  : null
              }
              safeRiddle={safeRiddle}
              onClose={handleCloseModal}
            />
          ) : null}

          {status === "modal" && modal?.kind === "codeLock" ? (
            <CodeLockDialog
              key="code-lock"
              onSubmit={submitCode}
              onClose={handleCloseModal}
            />
          ) : null}

          {status === "modal" && modal?.kind === "safe" ? (
            <SafeDialog
              key="safe"
              hintRevealed={uvRevealed}
              onSubmit={submitSafe}
              onClose={handleCloseModal}
            />
          ) : null}

          {status === "modal" && modal?.kind === "fuseBox" ? (
            <FuseBoxDialog
              key="fuse-box"
              breakers={breakers}
              armedIds={armedBreakerIds}
              powered={powerRestored}
              onArm={armBreaker}
              onClose={handleCloseModal}
            />
          ) : null}

          {status === "finale" ? (
            <HologramDialog
              key="hologram"
              step={hologramStep}
              onNext={advanceHologram}
              onFinish={finish}
            />
          ) : null}

          {status === "won" ? (
            <VictoryOverlay
              key="victory"
              durationMs={startedAt && finishedAt ? finishedAt - startedAt : 0}
              errors={errors}
              attempts={attempts}
              onRestart={reset}
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
      <p className="text-ink-mute font-display text-sm">Ouverture du musée…</p>
    </div>
  );
}
