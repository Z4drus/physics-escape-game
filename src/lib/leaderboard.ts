import type { LeaderboardEntry } from "@/types/game";

const STORAGE_KEY = "physics-escape:leaderboard";
const MAX_ENTRIES = 10;
const EMPTY: readonly LeaderboardEntry[] = [];

/** Trie par nombre d'erreurs, puis par temps. */
function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  return a.errors - b.errors || a.timeMs - b.timeMs;
}

function isEntry(value: unknown): value is LeaderboardEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.name === "string" &&
    typeof entry.errors === "number" &&
    typeof entry.timeMs === "number" &&
    typeof entry.date === "string"
  );
}

function readStorage(): readonly LeaderboardEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.filter(isEntry).sort(compareEntries).slice(0, MAX_ENTRIES);
  } catch {
    return EMPTY;
  }
}

/*
 * Classement local, conservé dans le navigateur et exposé comme un magasin
 * externe : l'instantané est mis en cache pour rester stable entre deux
 * lectures, et les abonnés sont prévenus à chaque enregistrement.
 */
let snapshot: readonly LeaderboardEntry[] | null = null;
const listeners = new Set<() => void>();

/** Instantané courant du classement, lu une fois puis mis en cache. */
export function getLeaderboardSnapshot(): readonly LeaderboardEntry[] {
  snapshot ??= readStorage();
  return snapshot;
}

/** Côté serveur, le classement est toujours vide. */
export function getLeaderboardServerSnapshot(): readonly LeaderboardEntry[] {
  return EMPTY;
}

export function subscribeLeaderboard(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Enregistre un score, prévient les abonnés et renvoie la ligne créée. */
export function saveScore(
  entry: Omit<LeaderboardEntry, "date">,
): LeaderboardEntry {
  const created: LeaderboardEntry = {
    ...entry,
    date: new Date().toISOString(),
  };
  snapshot = [...getLeaderboardSnapshot(), created]
    .sort(compareEntries)
    .slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Stockage indisponible : le classement reste en mémoire pour la session.
  }
  for (const listener of listeners) listener();
  return created;
}
