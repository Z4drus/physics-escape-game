/** Position dans la scène 3D, au format attendu par three.js. */
export type Vec3 = [x: number, y: number, z: number];

/** Familles de dispositifs modélisés dans la salle. */
export type PropKind = "pendulum" | "incline" | "circuit" | "spring" | "lever";

/** État global de la partie. */
export type GameStatus = "idle" | "playing" | "paused" | "puzzle" | "won";

export interface PuzzleAnswer {
  id: string;
  label: string;
}

/** Clé remise au joueur lorsqu'il résout une énigme. */
export interface RoomKey {
  id: string;
  label: string;
  /** Couleur hexadécimale utilisée dans le HUD et sur le socle du dispositif. */
  color: string;
}

export interface Puzzle {
  id: string;
  /** Thème abordé, affiché en surtitre dans la boîte de dialogue. */
  topic: string;
  question: string;
  answers: PuzzleAnswer[];
  correctAnswerId: string;
  /** Justification affichée après la réponse, correcte ou non. */
  explanation: string;
  reward: RoomKey;
}

/** Dispositif posé dans la salle avec lequel le joueur peut interagir. */
export interface InteractiveObject {
  id: string;
  puzzleId: string;
  kind: PropKind;
  /** Nom affiché dans l'invite d'interaction. */
  label: string;
  position: Vec3;
  /** Rotation autour de l'axe Y, en radians. */
  rotationY: number;
  /** Empreinte au sol [largeur, profondeur] utilisée pour les collisions. */
  footprint: [width: number, depth: number];
}
