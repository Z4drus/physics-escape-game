"use client";

import { useSyncExternalStore } from "react";

import {
  getLeaderboardServerSnapshot,
  getLeaderboardSnapshot,
  subscribeLeaderboard,
} from "@/lib/leaderboard";
import type { LeaderboardEntry } from "@/types/game";

/**
 * Classement local, vide au rendu serveur et lu depuis le navigateur après
 * l'hydratation, sans écart entre les deux.
 */
export function useLeaderboard(): readonly LeaderboardEntry[] {
  return useSyncExternalStore(
    subscribeLeaderboard,
    getLeaderboardSnapshot,
    getLeaderboardServerSnapshot,
  );
}
