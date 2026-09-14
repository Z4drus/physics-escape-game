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

/**
 * Objectif affiché dans le HUD : la prochaine chose utile à faire, déduite de
 * la progression. Il ne donne jamais la solution, seulement la direction.
 */
export function describeObjective(state: ObjectiveInput): string {
  if (state.seals.length >= TOTAL_SEALS) {
    return "Tous les sceaux sont réunis : la salle de l'hologramme est ouverte.";
  }
  if (!state.cabinetUnlocked) {
    return "Réunissez les sceaux. Le cabinet du conservateur est fermé par un code à quatre chiffres.";
  }
  if (!state.safeOpen) {
    if (state.uvRevealed)
      return "Calculez la combinaison du coffre du conservateur.";
    if (state.inventory.includes("uv-lamp")) {
      return "Le conservateur cache quelque chose dans son cabinet. La lampe UV pourrait aider.";
    }
    return "Le cabinet est ouvert. Fouillez-le, et n'oubliez pas le bureau du surveillant.";
  }
  if (!state.powerRestored) {
    return "Remettez le fusible dans le tableau électrique de la galerie et réarmez-le.";
  }
  const missing = TOTAL_SEALS - state.seals.length;
  return `Encore ${missing} sceau${missing > 1 ? "x" : ""} à obtenir aux postes.`;
}
