/**
 * Réglages de rendu ajustés à la machine. Le moniteur de performance de la
 * scène fait varier un facteur entre 0 (machine en difficulté) et 1 (pleine
 * qualité) ; ce module le traduit en réglages concrets.
 */

/** Facteur de départ : pleine qualité, revue à la baisse si la cadence chute. */
export const INITIAL_PERFORMANCE_FACTOR = 1;

export interface RenderQuality {
  /** Densité de pixels maximale du canvas, bornée en plus par celle de l'écran. */
  maxDpr: number;
  /** Échantillons d'anticrénelage du post-traitement, 0 pour aucun. */
  multisampling: number;
}

/**
 * Réglages de rendu pour un facteur de performance. La résolution baisse
 * d'abord, par paliers d'un quart de densité ; l'anticrénelage, coûteux sur
 * les processeurs graphiques intégrés, saute sous la moitié du facteur.
 */
export function renderQualityOf(factor: number): RenderQuality {
  const clamped = Math.min(1, Math.max(0, factor));
  return {
    maxDpr: Math.round((1 + 0.75 * clamped) * 4) / 4,
    multisampling: clamped > 0.4 ? 4 : 0,
  };
}
