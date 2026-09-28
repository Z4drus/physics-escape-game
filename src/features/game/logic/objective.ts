import { TOTAL_SEALS } from "@/features/game/data/stations";
import type { InventoryItemId, Seal } from "@/types/game";

/** Sous-ensemble de l'état nécessaire pour formuler l'objectif courant. */
export interface ObjectiveInput {
  seals: readonly Seal[];
  inventory: readonly InventoryItemId[];
  cabinetUnlocked: boolean;
  uvRevealed: boolean;
  safeOpen: boolean;
  powerRestored: boolean;
}

/** Objectif courant, formulé sous `ui.objectives.<key>`. */
export type Objective =
  | {
      key:
        | "allSeals"
        | "cabinetLocked"
        | "solveSafe"
        | "useUvLamp"
        | "searchCabinet"
        | "restorePower";
    }
  | { key: "sealsLeft"; count: number };

/**
 * Objectif affiché dans le HUD : la prochaine chose utile à faire, déduite de
 * la progression. Il ne donne jamais la solution, seulement la direction.
 */
export function describeObjective(state: ObjectiveInput): Objective {
  if (state.seals.length >= TOTAL_SEALS) return { key: "allSeals" };
  if (!state.cabinetUnlocked) return { key: "cabinetLocked" };
  if (!state.safeOpen) {
    if (state.uvRevealed) return { key: "solveSafe" };
    if (state.inventory.includes("uv-lamp")) return { key: "useUvLamp" };
    return { key: "searchCabinet" };
  }
  if (!state.powerRestored) return { key: "restorePower" };
  return { key: "sealsLeft", count: TOTAL_SEALS - state.seals.length };
}
