import { create } from "zustand";

import {
  INSPECT_CONTENTS_BY_ID,
  INVENTORY_ITEMS,
} from "@/features/game/data/clues";
import { INTERACTABLES_BY_ID } from "@/features/game/data/interactables";
import { PUZZLES_BY_ID, pickPuzzle } from "@/features/game/data/puzzles";
import { STATIONS_BY_ID, TOTAL_SEALS } from "@/features/game/data/stations";
import type { DoorId } from "@/features/game/data/world";
import {
  generateBreakers,
  generateCodeDigits,
  generateSafeRiddle,
  nextBreakerId,
} from "@/features/game/logic/escape";
import { shuffle } from "@/lib/shuffle";
import type {
  Breaker,
  GameStatus,
  Interactable,
  InventoryItemId,
  Modal,
  Puzzle,
  PuzzleAnswer,
  RoomId,
  SafeRiddle,
  Seal,
  Station,
} from "@/types/game";

/** Résultat de la dernière réponse envoyée dans la boîte de dialogue. */
export type AnswerResult = "correct" | "wrong";

/** Issue d'un réarmement de disjoncteur. */
export type BreakerOutcome = "armed" | "tripped" | "complete";

export interface Toast {
  id: number;
  text: string;
}

interface GameState {
  status: GameStatus;
  introStep: number;
  modal: Modal | null;
  /** Objet actuellement visé par le joueur. */
  focusedId: string | null;
  currentRoomId: RoomId;

  // Progression
  /** Postes dont la question a été résolue. */
  solvedStationIds: string[];
  /** Sceaux récupérés, dans l'ordre d'obtention. */
  seals: Seal[];
  /**
   * Question tirée pour chaque poste. Mémorisée pour qu'une mauvaise réponse
   * ne change pas l'énoncé quand le joueur revient sur le même poste.
   */
  assignedPuzzleIds: Record<string, string>;
  /** Ordre d'affichage des propositions, tiré en même temps que la question. */
  answerOrders: Record<string, string[]>;
  selectedAnswerId: string | null;
  answerResult: AnswerResult | null;
  inventory: InventoryItemId[];
  /** Objets inspectés qui portent un indice, dans l'ordre de découverte. */
  discoveredClueIds: string[];
  cabinetUnlocked: boolean;
  safeOpen: boolean;
  powerRestored: boolean;
  uvRevealed: boolean;
  energyCaseUnlocked: boolean;

  // Secrets de la partie, tirés au démarrage
  codeDigits: [number, number, number, number];
  safeRiddle: SafeRiddle;
  breakers: Breaker[];
  armedBreakerIds: string[];

  // Score
  /** Réponses envoyées aux postes, bonnes ou mauvaises. */
  attempts: number;
  /** Mauvaises réponses, codes faux et disjoncteurs mal réarmés. */
  errors: number;
  startedAt: number | null;
  finishedAt: number | null;

  // Interface
  toasts: Toast[];
  carnetOpen: boolean;
  hologramStep: number;
}

interface GameActions {
  /** Écran titre → cartes d'introduction. Tire les secrets de la partie. */
  startIntro: () => void;
  nextIntroStep: () => void;
  /** Démarre ou reprend la partie (appelé quand le pointeur est verrouillé). */
  beginSession: () => void;
  /** Met la partie en pause (pointeur relâché par le joueur). */
  pause: () => void;
  setFocused: (id: string | null) => void;
  setCurrentRoom: (roomId: RoomId) => void;
  /** Touche E sur l'objet visé : aiguille vers la bonne réaction. */
  interact: (id: string) => void;
  selectAnswer: (answerId: string) => void;
  /** Réarme la question après une mauvaise réponse. */
  retryPuzzle: () => void;
  /** Referme la fenêtre ouverte et rend la main au joueur sans passer par la pause. */
  closeModal: () => void;
  /** Cadenas du cabinet. Renvoie `true` si le code est bon. */
  submitCode: (digits: readonly number[]) => boolean;
  /** Coffre-fort. Renvoie `true` si la combinaison est bonne. */
  submitSafe: (value: number) => boolean;
  /** Tableau électrique : réarme un disjoncteur. */
  armBreaker: (breakerId: string) => BreakerOutcome;
  dismissToast: (id: number) => void;
  /** Notification libre, pour les réglages hors partie (son, par exemple). */
  notify: (text: string) => void;
  toggleCarnet: (open?: boolean) => void;
  /** Le joueur monte sur l'estrade : l'hologramme s'active. */
  enterFinale: () => void;
  advanceHologram: () => void;
  /** Fin du dialogue : écran de score. */
  finish: () => void;
  reset: () => void;
}

/** Secrets neutres avant le premier tirage, jamais montrés au joueur. */
const PLACEHOLDER_SECRETS = {
  codeDigits: [0, 0, 0, 0] as [number, number, number, number],
  safeRiddle: { massKg: 2, heightM: 5, answer: 100 },
  breakers: [] as Breaker[],
};

function drawSecrets() {
  return {
    codeDigits: generateCodeDigits(),
    safeRiddle: generateSafeRiddle(),
    breakers: generateBreakers(),
  };
}

const INITIAL_STATE: GameState = {
  status: "idle",
  introStep: 0,
  modal: null,
  focusedId: null,
  currentRoomId: "gallery",
  solvedStationIds: [],
  seals: [],
  assignedPuzzleIds: {},
  answerOrders: {},
  selectedAnswerId: null,
  answerResult: null,
  inventory: [],
  discoveredClueIds: [],
  cabinetUnlocked: false,
  safeOpen: false,
  powerRestored: false,
  uvRevealed: false,
  energyCaseUnlocked: false,
  ...PLACEHOLDER_SECRETS,
  armedBreakerIds: [],
  attempts: 0,
  errors: 0,
  startedAt: null,
  finishedAt: null,
  toasts: [],
  carnetOpen: false,
  hologramStep: 0,
};

let toastCounter = 0;

/** Ajoute une notification éphémère à l'état donné. */
function withToast(state: GameState, text: string): Pick<GameState, "toasts"> {
  toastCounter += 1;
  return { toasts: [...state.toasts, { id: toastCounter, text }] };
}

export const useGameStore = create<GameState & GameActions>()((set, get) => ({
  ...INITIAL_STATE,

  startIntro: () =>
    set((state) =>
      state.status === "idle"
        ? { status: "intro", introStep: 0, ...drawSecrets() }
        : state,
    ),

  nextIntroStep: () => set((state) => ({ introStep: state.introStep + 1 })),

  beginSession: () =>
    set((state) => {
      if (
        state.status !== "intro" &&
        state.status !== "paused" &&
        state.status !== "locking"
      ) {
        return state;
      }
      return {
        status: "playing",
        startedAt: state.startedAt ?? Date.now(),
      };
    }),

  pause: () =>
    set((state) =>
      state.status === "playing" || state.status === "locking"
        ? { status: "paused", carnetOpen: false }
        : state,
    ),

  setFocused: (id) =>
    set((state) => (state.focusedId === id ? state : { focusedId: id })),

  setCurrentRoom: (roomId) =>
    set((state) =>
      state.currentRoomId === roomId ? state : { currentRoomId: roomId },
    ),

  interact: (id) => {
    const state = get();
    if (state.status !== "playing") return;
    const item = INTERACTABLES_BY_ID.get(id);
    if (!item || !isInteractableAvailable(item, state)) return;

    switch (item.kind) {
      case "station":
        set((current) => openStation(current, id));
        return;

      case "inspect": {
        const content = INSPECT_CONTENTS_BY_ID.get(id);
        set((current) => ({
          status: "modal",
          modal: { kind: "inspect", objectId: id },
          discoveredClueIds:
            content?.codeIndex !== undefined &&
            !current.discoveredClueIds.includes(id)
              ? [...current.discoveredClueIds, id]
              : current.discoveredClueIds,
        }));
        return;
      }

      case "pickup":
        set((current) => ({
          inventory: [...current.inventory, "uv-lamp"],
          ...withToast(
            current,
            `${INVENTORY_ITEMS["uv-lamp"].label} ajoutée au carnet.`,
          ),
        }));
        return;

      case "cabinet-door":
        set({ status: "modal", modal: { kind: "codeLock" } });
        return;

      case "final-door": {
        const missing = TOTAL_SEALS - state.seals.length;
        set((current) =>
          withToast(
            current,
            `La porte réclame ${TOTAL_SEALS} sceaux. Il en manque ${missing}.`,
          ),
        );
        return;
      }

      case "safe":
        set({ status: "modal", modal: { kind: "safe" } });
        return;

      case "fuse-box":
        if (!state.inventory.includes("fuse")) {
          set((current) =>
            withToast(
              current,
              "Le fusible principal manque. Il doit être quelque part.",
            ),
          );
          return;
        }
        set({ status: "modal", modal: { kind: "fuseBox" } });
        return;

      case "uv-wall":
        set((current) => ({
          status: "modal",
          modal: { kind: "inspect", objectId: "uv-wall" },
          uvRevealed: true,
          discoveredClueIds: current.discoveredClueIds.includes("uv-wall")
            ? current.discoveredClueIds
            : [...current.discoveredClueIds, "uv-wall"],
        }));
        return;
    }
  },

  selectAnswer: (answerId) => {
    const state = get();
    if (state.status !== "modal" || state.answerResult) return;

    const station = selectActiveStation(state);
    const puzzle = selectActivePuzzle(state);
    if (!station || !puzzle) return;

    const isCorrect = puzzle.correctAnswerId === answerId;

    set((current) => ({
      selectedAnswerId: answerId,
      answerResult: isCorrect ? "correct" : "wrong",
      attempts: current.attempts + 1,
      errors: isCorrect ? current.errors : current.errors + 1,
      solvedStationIds: isCorrect
        ? [...current.solvedStationIds, station.id]
        : current.solvedStationIds,
      seals: isCorrect ? [...current.seals, station.reward] : current.seals,
    }));
  },

  retryPuzzle: () =>
    set((state) =>
      state.answerResult === "wrong"
        ? { selectedAnswerId: null, answerResult: null }
        : state,
    ),

  closeModal: () =>
    set((state) =>
      state.status === "modal"
        ? {
            // On repart directement vers la salle : c'est l'appelant qui
            // redemande le verrouillage dans le même geste utilisateur.
            status: "locking",
            modal: null,
            selectedAnswerId: null,
            answerResult: null,
          }
        : state,
    ),

  submitCode: (digits) => {
    const state = get();
    const correct = state.codeDigits.every(
      (digit, index) => digits[index] === digit,
    );
    set((current) =>
      correct
        ? {
            cabinetUnlocked: true,
            ...withToast(current, "Le cadenas cède. Le cabinet est ouvert."),
          }
        : { errors: current.errors + 1 },
    );
    return correct;
  },

  submitSafe: (value) => {
    const state = get();
    const correct = value === state.safeRiddle.answer;
    set((current) =>
      correct
        ? {
            safeOpen: true,
            inventory: [...current.inventory, "fuse", "case-key"],
            ...withToast(
              current,
              "Le coffre s'ouvre : fusible principal et clé de la vitrine ajoutés au carnet.",
            ),
          }
        : { errors: current.errors + 1 },
    );
    return correct;
  },

  armBreaker: (breakerId) => {
    const state = get();
    if (state.armedBreakerIds.includes(breakerId)) return "armed";

    const expected = nextBreakerId(state.breakers, state.armedBreakerIds);
    if (expected !== breakerId) {
      set((current) => ({ armedBreakerIds: [], errors: current.errors + 1 }));
      return "tripped";
    }

    const armed = [...state.armedBreakerIds, breakerId];
    const complete = armed.length === state.breakers.length;
    set((current) => ({
      armedBreakerIds: armed,
      powerRestored: complete || current.powerRestored,
      ...(complete
        ? withToast(current, "Le courant est rétabli dans la galerie.")
        : {}),
    }));
    return complete ? "complete" : "armed";
  },

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),

  notify: (text) => set((state) => withToast(state, text)),

  toggleCarnet: (open) =>
    set((state) => ({ carnetOpen: open ?? !state.carnetOpen })),

  enterFinale: () =>
    set((state) =>
      state.status === "playing"
        ? {
            status: "finale",
            finishedAt: Date.now(),
            focusedId: null,
            carnetOpen: false,
            hologramStep: 0,
          }
        : state,
    ),

  advanceHologram: () =>
    set((state) => ({ hologramStep: state.hologramStep + 1 })),

  finish: () =>
    set((state) => (state.status === "finale" ? { status: "won" } : state)),

  reset: () => set({ ...INITIAL_STATE, toasts: [] }),
}));

/** Ouvre la question d'un poste, en tirant l'énoncé au premier passage. */
function openStation(state: GameState, stationId: string): Partial<GameState> {
  const station = STATIONS_BY_ID.get(stationId);
  if (!station || state.solvedStationIds.includes(stationId)) return {};

  let unlockCase = false;
  if (station.gate === "power" && !state.powerRestored) {
    return withToast(
      state,
      "Le banc d'Ampère est hors tension. Le tableau électrique doit être réarmé.",
    );
  }
  if (station.gate === "energy-case" && !state.energyCaseUnlocked) {
    if (!state.inventory.includes("case-key")) {
      return withToast(state, "La vitrine est fermée à clé.");
    }
    unlockCase = true;
  }

  const assignedId = state.assignedPuzzleIds[stationId];
  const puzzle = assignedId
    ? PUZZLES_BY_ID.get(assignedId)
    : pickPuzzle(station.topic, Object.values(state.assignedPuzzleIds));
  if (!puzzle) return {};

  return {
    status: "modal",
    modal: { kind: "puzzle", stationId },
    energyCaseUnlocked: state.energyCaseUnlocked || unlockCase,
    assignedPuzzleIds: { ...state.assignedPuzzleIds, [stationId]: puzzle.id },
    answerOrders: state.answerOrders[puzzle.id]
      ? state.answerOrders
      : {
          ...state.answerOrders,
          [puzzle.id]: shuffle(puzzle.answers.map((answer) => answer.id)),
        },
    selectedAnswerId: null,
    answerResult: null,
    ...(unlockCase
      ? withToast(state, "La clé du conservateur ouvre la vitrine.")
      : {}),
  };
}

/**
 * Un objet ne peut être visé que s'il a encore quelque chose à offrir : un
 * poste résolu, une porte déjà ouverte ou un coffre vide s'effacent de la
 * visée pour ne pas encombrer le réticule.
 */
export function isInteractableAvailable(
  item: Interactable,
  state: Pick<
    GameState,
    | "solvedStationIds"
    | "inventory"
    | "cabinetUnlocked"
    | "safeOpen"
    | "powerRestored"
    | "seals"
  >,
): boolean {
  switch (item.kind) {
    case "station":
      return !state.solvedStationIds.includes(item.id);
    case "inspect":
      return true;
    case "pickup":
      return !state.inventory.includes("uv-lamp");
    case "cabinet-door":
      return !state.cabinetUnlocked;
    case "final-door":
      return state.seals.length < TOTAL_SEALS;
    case "safe":
      return !state.safeOpen;
    case "fuse-box":
      return !state.powerRestored;
    case "uv-wall":
      return state.inventory.includes("uv-lamp");
  }
}

/** Poste dont la question est ouverte, `null` hors dialogue. */
export function selectActiveStation(state: GameState): Station | null {
  if (state.modal?.kind !== "puzzle") return null;
  return STATIONS_BY_ID.get(state.modal.stationId) ?? null;
}

/** Question actuellement ouverte, `null` hors dialogue. */
export function selectActivePuzzle(state: GameState): Puzzle | null {
  if (state.modal?.kind !== "puzzle") return null;
  const puzzleId = state.assignedPuzzleIds[state.modal.stationId];
  return puzzleId ? (PUZZLES_BY_ID.get(puzzleId) ?? null) : null;
}

/**
 * Réordonne les propositions d'une question selon l'ordre tiré à l'ouverture
 * du poste. Fonction pure plutôt que sélecteur : elle construit un nouveau
 * tableau, ce qu'un sélecteur zustand ne peut pas faire sans provoquer un
 * re-render à chaque notification du store.
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

/** La porte finale s'ouvre lorsque tous les sceaux ont été réunis. */
export function selectFinalDoorOpen(state: GameState): boolean {
  return state.seals.length >= TOTAL_SEALS;
}

/** Portes franchissables pour l'état courant. Fonction pure, à mémoïser. */
export function openDoorsOf(
  cabinetUnlocked: boolean,
  finalDoorOpen: boolean,
): Set<DoorId> {
  const doors = new Set<DoorId>();
  if (cabinetUnlocked) doors.add("cabinet");
  if (finalDoorOpen) doors.add("final");
  return doors;
}
