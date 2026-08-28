import { create } from "zustand";

import { PUZZLES_BY_ID, TOTAL_KEYS } from "@/features/game/data/puzzles";
import type { GameStatus, RoomKey } from "@/types/game";

/** Résultat de la dernière réponse envoyée dans la boîte de dialogue. */
export type AnswerResult = "correct" | "wrong";

interface GameState {
  status: GameStatus;
  /** Identifiants des énigmes déjà résolues. */
  solvedPuzzleIds: string[];
  /** Clés récupérées, dans l'ordre d'obtention. */
  keys: RoomKey[];
  /** Énigme actuellement ouverte, `null` en dehors d'un dialogue. */
  activePuzzleId: string | null;
  selectedAnswerId: string | null;
  answerResult: AnswerResult | null;
  /** Dispositif actuellement visé par le joueur. */
  focusedObjectId: string | null;
  /** Nombre total de réponses envoyées, toutes énigmes confondues. */
  attempts: number;
  startedAt: number | null;
  finishedAt: number | null;
}

interface GameActions {
  /** Démarre ou reprend la partie (appelé quand le pointeur est verrouillé). */
  beginSession: () => void;
  /** Met la partie en pause (pointeur relâché en cours de jeu). */
  pause: () => void;
  setFocusedObject: (objectId: string | null) => void;
  openPuzzle: (puzzleId: string) => void;
  selectAnswer: (answerId: string) => void;
  /** Réarme la question après une mauvaise réponse. */
  retryPuzzle: () => void;
  closePuzzle: () => void;
  /** Franchissement de la porte : fin de partie. */
  escapeRoom: () => void;
  reset: () => void;
}

const INITIAL_STATE: GameState = {
  status: "idle",
  solvedPuzzleIds: [],
  keys: [],
  activePuzzleId: null,
  selectedAnswerId: null,
  answerResult: null,
  focusedObjectId: null,
  attempts: 0,
  startedAt: null,
  finishedAt: null,
};

export const useGameStore = create<GameState & GameActions>()((set, get) => ({
  ...INITIAL_STATE,

  beginSession: () =>
    set((state) => {
      if (state.status === "won" || state.status === "puzzle") return state;
      return {
        status: "playing",
        startedAt: state.startedAt ?? Date.now(),
      };
    }),

  pause: () =>
    set((state) => (state.status === "playing" ? { status: "paused" } : state)),

  setFocusedObject: (objectId) =>
    set((state) =>
      state.focusedObjectId === objectId
        ? state
        : { focusedObjectId: objectId },
    ),

  openPuzzle: (puzzleId) =>
    set((state) => {
      if (state.status !== "playing") return state;
      if (state.solvedPuzzleIds.includes(puzzleId)) return state;
      if (!PUZZLES_BY_ID.has(puzzleId)) return state;
      return {
        status: "puzzle",
        activePuzzleId: puzzleId,
        selectedAnswerId: null,
        answerResult: null,
      };
    }),

  selectAnswer: (answerId) => {
    const { status, activePuzzleId, answerResult } = get();
    if (status !== "puzzle" || !activePuzzleId || answerResult) return;

    const puzzle = PUZZLES_BY_ID.get(activePuzzleId);
    if (!puzzle) return;

    const isCorrect = puzzle.correctAnswerId === answerId;

    set((state) => ({
      selectedAnswerId: answerId,
      answerResult: isCorrect ? "correct" : "wrong",
      attempts: state.attempts + 1,
      solvedPuzzleIds: isCorrect
        ? [...state.solvedPuzzleIds, puzzle.id]
        : state.solvedPuzzleIds,
      keys: isCorrect ? [...state.keys, puzzle.reward] : state.keys,
    }));
  },

  retryPuzzle: () =>
    set((state) =>
      state.answerResult === "wrong"
        ? { selectedAnswerId: null, answerResult: null }
        : state,
    ),

  closePuzzle: () =>
    set((state) =>
      state.status === "puzzle"
        ? {
            status: "paused",
            activePuzzleId: null,
            selectedAnswerId: null,
            answerResult: null,
          }
        : state,
    ),

  escapeRoom: () =>
    set((state) =>
      state.status === "won"
        ? state
        : { status: "won", finishedAt: Date.now(), focusedObjectId: null },
    ),

  reset: () => set({ ...INITIAL_STATE }),
}));

/** La porte s'ouvre lorsque toutes les clés ont été récupérées. */
export function selectDoorOpen(state: GameState): boolean {
  return state.solvedPuzzleIds.length >= TOTAL_KEYS;
}

/** Vrai lorsque le joueur peut se déplacer dans la salle. */
export function selectIsPlaying(state: GameState): boolean {
  return state.status === "playing";
}
