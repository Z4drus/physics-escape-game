/**
 * Couleurs sémantiques des schémas 3D.
 *
 * Elles prolongent la palette de marque (nuit → pétrole → cyan, plus l'ambre)
 * avec les teintes supplémentaires qu'exige la lecture d'un diagramme : deux
 * forces ne doivent jamais se confondre. Un matériau three.js ne pouvant pas
 * lire une variable CSS, ces valeurs sont la source de vérité côté 3D et
 * doivent rester alignées avec `src/app/globals.css`.
 */
export const DIAGRAM_COLORS = {
  /** Poids / force de pesanteur. */
  weight: "#e68c2b",
  /** Force de soutien (réaction normale). */
  support: "#9de5ff",
  /** Frottements. */
  friction: "#ffd24a",
  /** Poussée d'Archimède. */
  buoyancy: "#4ee1c1",
  /** Force appliquée / motrice. */
  applied: "#b48cff",
  /** Vitesse. */
  velocity: "#1695c4",
  /** Chaud. */
  hot: "#ff7a5c",
  /** Froid. */
  cold: "#6aa8ff",
  /** Courant électrique. */
  current: "#ffd24a",
  /** Fluide / liquide. */
  fluid: "#1695c4",
  /** Matériel de laboratoire (métal). */
  metal: "#8fa3bb",
  /** Structure secondaire (supports, socles, bâtis). */
  structure: "#1d3550",
  /** Repères, graduations, constructions géométriques, traces. */
  guide: "#6c7891",
  /** Objet neutre mis en scène (caisse, bloc, mobile). */
  object: "#c7d3e6",
} as const;

export type DiagramColor = keyof typeof DIAGRAM_COLORS;
