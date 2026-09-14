/**
 * Direction artistique 3D du musée.
 *
 * Un musée français du début du XXe siècle, en fin de journée : noyer, laiton,
 * enduit crème, parquet, lumière chaude à l'intérieur et crépuscule bleu aux
 * fenêtres. Un matériau three.js ne peut pas lire les variables CSS : ces
 * valeurs sont la source de vérité côté 3D et doivent rester alignées avec
 * `src/app/globals.css`.
 */
export const MUSEUM = {
  /** Corps de mobilier, bâtis, socles : noyer sombre. */
  frame: "#2d1f16",
  /** Plateaux, panneaux, tablettes : chêne foncé. */
  panel: "#4a3423",
  /** Pièces métalliques polies : laiton. */
  metal: "#c9a45c",
  /** Métal sombre : bronze, fonte. */
  metalDark: "#5a4632",
  /** Verre et vitrines. */
  glass: "#dfe9ee",
  /** Accent lumineux principal : laiton éclairé. */
  accent: "#e3b96a",
  /** Accent lumineux clair : blanc chaud des lampes. */
  accentLight: "#fff1cf",
  /** Signalétique, pièces d'alerte, éléments rouges : sang-de-bœuf. */
  warning: "#b8452f",
  /** Liquides et fluides : ils restent bleutés pour rester lisibles. */
  fluid: "#2e8ea3",
  /** Poste résolu : vert sauge. */
  solved: "#8fd3a0",

  /** Enduit des murs. */
  wall: "#e6d8bf",
  /** Murs de la salle de l'hologramme : vert profond de cabinet sombre. */
  darkWall: "#4a5a4c",
  /** Plafond, plus clair que les murs. */
  ceiling: "#f0e7d8",
  /** Soubassement et boiseries. */
  wainscot: "#3a2718",
  /** Moulures, corniches, encadrements. */
  moulding: "#efe5d2",
  /** Sol de la salle de l'hologramme : marbre sombre. */
  darkFloor: "#1b1713",
  /** Velours des vitrines et des banquettes. */
  velvet: "#3f5a48",
  /** Cuir du bureau. */
  leather: "#2f4a3a",

  /** Hologramme et éléments de la finale. */
  hologram: "#6fe3ff",

  /** Lumière d'ambiance chaude. */
  lightAmbient: "#f0d8b0",
  /** Lampes et lustres. */
  lightWarm: "#ffcf8a",
  /** Crépuscule aux fenêtres : le bleu pâle du ciel des panoramas. */
  lightDusk: "#a7bdd2",
  /** Lumière du couloir de sortie. */
  lightKey: "#fff0d0",
} as const;
