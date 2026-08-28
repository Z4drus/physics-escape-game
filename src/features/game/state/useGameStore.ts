import { create } from "zustand";

import { PUZZLES_BY_ID, pickPuzzle } from "@/features/game/data/puzzles";
import { STATIONS_BY_ID, TOTAL_KEYS } from "@/features/game/data/stations";
import { shuffle } from "@/lib/shuffle";
import type { GameStatus, Puzzle, PuzzleAnswer, RoomKey } from "@/types/game";

/** Résultat de la dernière réponse envoyée dans la boîte de dialogue. */
export type AnswerResult = "correct" | "wrong";

interface GameState {
  status: GameStatus;
  /** Stations dont la question a été résolue. */
  solvedStationIds: string[];
  /** Clés récupérées, dans l'ordre d'obtention. */
  keys: RoomKey[];
  /**
   * Question tirée pour chaque station. Mémorisée pour qu'une mauvaise réponse
   * ne change pas l'énoncé quand le joueur revient sur le même poste.
   */
  assignedPuzzleIds: Record<string, string>;
  /**
   * Ordre d'affichage des propositions, tiré en même temps que la question :
   * la bonne réponse ne tombe donc jamais deux fois de suite à la même place.
   */
  answerOrders: Record<string, string[]>;
  /** Station dont la question est ouverte, `null` hors dialogue. */
  activeStationId: string | null;
  selectedAnswerId: string | null;
  answerResult: AnswerResult | null;
  /** Station actuellement visée par le joueur. */
  focusedStationId: string | null;
  /** Nombre total de réponses envoyées, toutes stations confondues. */
  attempts: number;
  startedAt: number | null;
  finishedAt: number | null;
}

interface GameActions {
  /** Démarre ou reprend la partie (appelé quand le pointeur est verrouillé). */
  beginSession: () => void;
  /** Met la partie en pause (pointeur relâché par le joueur). */
  pause: () => void;
  setFocusedStation: (stationId: string | null) => void;
  /** Ouvre la question d'une station, en tirant l'énoncé au premier passage. */
  openStation: (stationId: string) => void;
  selectAnswer: (answerId: string) => void;
  /** Réarme la question après une mauvaise réponse. */
  retryPuzzle: () => void;
  /** Referme le poste et rend la main au joueur sans passer par la pause. */
  closePuzzle: () => void;
  /** Franchissement de la porte : fin de partie. */
  escapeRoom: () => void;
  reset: () => void;
}

const INITIAL_STATE: GameState = {
  status: "idle",
  solvedStationIds: [],
  keys: [],
  assignedPuzzleIds: {},
  answerOrders: {},
  activeStationId: null,
  selectedAnswerId: null,
  answerResult: null,
  focusedStationId: null,
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
    set((state) =>
      state.status === "playing" || state.status === "locking"
        ? { status: "paused" }
        : state,
    ),

  setFocusedStation: (stationId) =>
    set((state) =>
      state.focusedStationId === stationId
        ? state
        : { focusedStationId: stationId },
    ),

  openStation: (stationId) =>
    set((state) => {
      if (state.status !== "playing") return state;
      if (state.solvedStationIds.includes(stationId)) return state;

      const station = STATIONS_BY_ID.get(stationId);
      if (!station) return state;

      const assignedId = state.assignedPuzzleIds[stationId];
      const puzzle = assignedId
        ? PUZZLES_BY_ID.get(assignedId)
        : pickPuzzle(station.topic, Object.values(state.assignedPuzzleIds));

      if (!puzzle) return state;

      return {
        status: "puzzle",
        activeStationId: stationId,
        assignedPuzzleIds: {
          ...state.assignedPuzzleIds,
          [stationId]: puzzle.id,
        },
        answerOrders: state.answerOrders[puzzle.id]
          ? state.answerOrders
          : {
              ...state.answerOrders,
              [puzzle.id]: shuffle(puzzle.answers.map((answer) => answer.id)),
            },
        selectedAnswerId: null,
        answerResult: null,
      };
    }),

  selectAnswer: (answerId) => {
    const state = get();
    if (state.status !== "puzzle" || state.answerResult) return;

    const station = state.activeStationId
      ? STATIONS_BY_ID.get(state.activeStationId)
      : null;
    const puzzle = selectActivePuzzle(state);
    if (!station || !puzzle) return;

    const isCorrect = puzzle.correctAnswerId === answerId;

    set((current) => ({
      selectedAnswerId: answerId,
      answerResult: isCorrect ? "correct" : "wrong",
      attempts: current.attempts + 1,
      solvedStationIds: isCorrect
        ? [...current.solvedStationIds, station.id]
        : current.solvedStationIds,
      keys: isCorrect ? [...current.keys, station.reward] : current.keys,
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
            // On repart directement vers la salle : c'est l'appelant qui
            // redemande le verrouillage dans le même geste utilisateur.
            status: "locking",
            activeStationId: null,
            selectedAnswerId: null,
            answerResult: null,
          }
        : state,
    ),

  escapeRoom: () =>
    set((state) =>
      state.status === "won"
        ? state
        : { status: "won", finishedAt: Date.now(), focusedStationId: null },
    ),

  reset: () => set({ ...INITIAL_STATE }),
}));

/** Question actuellement ouverte, `null` hors dialogue. */
export function selectActivePuzzle(state: GameState): Puzzle | null {
  if (!state.activeStationId) return null;
  const puzzleId = state.assignedPuzzleIds[state.activeStationId];
  return puzzleId ? (PUZZLES_BY_ID.get(puzzleId) ?? null) : null;
}

/**
 * Réordonne les propositions d'une question selon l'ordre tiré à l'ouverture
 * du poste.
 *
 * Fonction pure plutôt que sélecteur : elle construit un nouveau tableau, ce
 * qu'un sélecteur zustand ne peut pas faire sans provoquer un re-render à
 * chaque notification du store.
 */
export function orderAnswers(
  puzzle: Puzzle | null,
  answerOrders: Readonly<Record<string, string[]>>,
): readonly PuzzleAnswer[] {
  if (!puzzle) return [];

  const order = answerOrders[puzzle.id];
  if (!order) return puzzle.answers;

  return order
    .map((id) => puzzle.answers.find((answer) => answer.id === id))
    .filter((answer): answer is PuzzleAnswer => answer !== undefined);
}

/** La porte s'ouvre lorsque toutes les clés ont été récupérées. */
export function selectDoorOpen(state: GameState): boolean {
  return state.solvedStationIds.length >= TOTAL_KEYS;
}
