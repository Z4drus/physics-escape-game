/**
 * Direction artistique 3D du laboratoire.
 *
 * Les teintes reprennent le dégradé de marque (bleu-nuit → pétrole → cyan) du
 * design system, transposé en matériaux : un matériau three.js ne peut pas
 * lire les variables CSS, ces valeurs sont donc la source de vérité côté 3D et
 * doivent rester alignées avec `src/app/globals.css`.
 */
export const LAB = {
  /** Corps de mobilier, bâtis, socles. */
  frame: "#16283a",
  /** Plateaux de paillasse, panneaux. */
  panel: "#1d3550",
  /** Pièces métalliques polies (potences, rails, tiges). */
  metal: "#8fa3bb",
  /** Métal sombre (visserie, pieds). */
  metalDark: "#54637a",
  /** Verre et plexiglas. */
  glass: "#9de5ff",
  /** Accent lumineux principal. */
  accent: "#1695c4",
  /** Accent lumineux clair (halos, arêtes). */
  accentLight: "#9de5ff",
  /** Signalétique et pièces d'alerte. */
  warning: "#e68c2b",
  /** Liquides et fluides. */
  fluid: "#1695c4",
  /** Station résolue. */
  solved: "#4ee1c1",

  /** Salle — carrelage, deux tons proches pour un damier discret. */
  floorLight: "#132234",
  floorDark: "#0d1826",
  /** Murs. */
  wall: "#16283a",
  /** Plafond, plus sombre que les murs. */
  ceiling: "#0b1522",
  /** Sol du couloir de sortie. */
  corridorFloor: "#080f18",
  /** Caisses et décor. */
  crate: "#33475e",

  /** Lumière d'ambiance froide de la salle. */
  lightAmbient: "#7f9ec4",
  /** Lumière des néons de plafond. */
  lightNeon: "#eaf7ff",
  /** Lumière directionnelle principale. */
  lightKey: "#eaf6ff",
} as const;
