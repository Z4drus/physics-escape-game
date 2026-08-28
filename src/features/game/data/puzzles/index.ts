import { CHALEUR_PUZZLES } from "@/features/game/data/puzzles/chaleur";
import { CINEMATIQUE_PUZZLES } from "@/features/game/data/puzzles/cinematique";
import { ELECTRICITE_PUZZLES } from "@/features/game/data/puzzles/electricite";
import { ENERGIE_PUZZLES } from "@/features/game/data/puzzles/energie";
import { FORCES_PUZZLES } from "@/features/game/data/puzzles/forces";
import { PRESSION_PUZZLES } from "@/features/game/data/puzzles/pression";
import type { PhysicsTopic, Puzzle } from "@/types/game";

/** Intitulé affiché de chaque thème. */
export const TOPIC_LABELS: Readonly<Record<PhysicsTopic, string>> = {
  pression: "Pression",
  chaleur: "Chaleur",
  energie: "Énergie",
  electricite: "Électricité",
  forces: "Forces",
  cinematique: "MRU / MRUA",
};

/** Banque de questions, regroupée par thème. */
export const PUZZLES_BY_TOPIC: Readonly<
  Record<PhysicsTopic, readonly Puzzle[]>
> = {
  pression: PRESSION_PUZZLES,
  chaleur: CHALEUR_PUZZLES,
  energie: ENERGIE_PUZZLES,
  electricite: ELECTRICITE_PUZZLES,
  forces: FORCES_PUZZLES,
  cinematique: CINEMATIQUE_PUZZLES,
};

/** Toutes les questions, tous thèmes confondus. */
const PUZZLES: readonly Puzzle[] =
  Object.values(PUZZLES_BY_TOPIC).flat();

/** Accès direct à une question par son identifiant. */
export const PUZZLES_BY_ID: ReadonlyMap<string, Puzzle> = new Map(
  PUZZLES.map((puzzle) => [puzzle.id, puzzle]),
);

/**
 * Tire une question du thème demandé, en écartant celles déjà posées dans la
 * partie en cours. Le tirage n'a lieu qu'au moment où le joueur ouvre une
 * station : il reste donc côté client, sans risque de divergence d'hydratation.
 */
export function pickPuzzle(
  topic: PhysicsTopic,
  excludedIds: readonly string[],
): Puzzle {
  const pool = PUZZLES_BY_TOPIC[topic];
  const remaining = pool.filter((puzzle) => !excludedIds.includes(puzzle.id));
  const candidates = remaining.length > 0 ? remaining : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
