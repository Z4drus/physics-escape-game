/** Position dans la scène 3D, au format attendu par three.js. */
export type Vec3 = [x: number, y: number, z: number];

/**
 * État global de la partie.
 *
 * `locking` couvre le court instant entre la fermeture d'une modale et la
 * reprise effective du pointeur : il évite de faire clignoter l'écran de pause
 * alors que le joueur retourne directement dans la salle.
 */
export type GameStatus =
  "idle" | "playing" | "paused" | "puzzle" | "locking" | "won";

/** Les six thèmes de physique couverts par le jeu. */
export type PhysicsTopic =
  "pression" | "chaleur" | "energie" | "electricite" | "forces" | "cinematique";

/** Identifiant d'un schéma 3D du registre `components/diagrams/registry`. */
export type DiagramKind = string;

/**
 * Schéma 3D animé illustrant la situation décrite par une question.
 * Les paramètres sont les grandeurs de l'énoncé : la scène les affiche
 * (étiquettes) et les utilise pour dimensionner ses objets.
 */
export interface DiagramSpec {
  kind: DiagramKind;
  params?: Readonly<Record<string, number | string>>;
}

export interface PuzzleAnswer {
  id: string;
  label: string;
}

/** Question de physique posée par une station. */
export interface Puzzle {
  id: string;
  topic: PhysicsTopic;
  /** Mise en situation en une phrase, affichée au-dessus du schéma. */
  scenario: string;
  question: string;
  answers: readonly PuzzleAnswer[];
  correctAnswerId: string;
  /** Correction : le raisonnement et le calcul, en deux ou trois phrases. */
  explanation: string;
  /** Relation mise en jeu, affichée en évidence dans la correction. */
  formula: string;
  diagram: DiagramSpec;
  /** 1 = application directe, 2 = raisonnement, 3 = piège classique. */
  difficulty: 1 | 2 | 3;
}

/** Clé remise au joueur lorsqu'il résout la question d'une station. */
export interface RoomKey {
  id: string;
  label: string;
  /** Couleur hexadécimale utilisée dans le HUD et sur le socle de la station. */
  color: string;
}

/** Familles de modèles 3D posés dans la salle. */
export type StationKind =
  | "pressure-bench"
  | "calorimeter"
  | "energy-track"
  | "circuit-bench"
  | "force-table"
  | "air-rail";

/** Poste de travail de la salle : un thème, un modèle 3D, une clé. */
export interface Station {
  id: string;
  topic: PhysicsTopic;
  kind: StationKind;
  /** Nom affiché dans l'invite d'interaction. */
  label: string;
  position: Vec3;
  /** Rotation autour de l'axe Y, en radians. */
  rotationY: number;
  /** Empreinte au sol [largeur, profondeur] utilisée pour les collisions. */
  footprint: [width: number, depth: number];
  reward: RoomKey;
}
