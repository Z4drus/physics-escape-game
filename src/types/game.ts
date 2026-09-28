/** Position dans la scène 3D, au format attendu par three.js. */
export type Vec3 = [x: number, y: number, z: number];

/** Les trois espaces du musée. */
export type RoomId = "gallery" | "cabinet" | "hologram";

/**
 * État global de la partie.
 *
 * `locking` couvre le court instant entre la fermeture d'une fenêtre et la
 * reprise effective du pointeur : il évite de faire clignoter l'écran de pause
 * alors que le joueur retourne directement dans la salle. `finale` est le
 * dialogue avec l'hologramme, une fois la salle atteinte.
 */
export type GameStatus =
  | "idle"
  | "intro"
  | "playing"
  | "paused"
  | "modal"
  | "locking"
  | "finale"
  | "won";

/** Fenêtre ouverte par-dessus la salle, une seule à la fois. */
export type Modal =
  | { kind: "puzzle"; stationId: string }
  | { kind: "inspect"; objectId: string }
  | { kind: "codeLock" }
  | { kind: "safe" }
  | { kind: "fuseBox" };

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
  params?: Readonly<Record<string, number>>;
}

/** Chaque question propose trois réponses, numérotées 1, 2 et 3 à l'écran. */
export type AnswerId = "a" | "b" | "c";

/**
 * Question de physique posée par un poste. Ses textes (mise en situation,
 * énoncé, propositions, correction, relation) sont dans les messages, sous
 * `puzzles.<id>`, dans le fichier du thème.
 */
export interface Puzzle {
  id: string;
  topic: PhysicsTopic;
  correctAnswerId: AnswerId;
  diagram: DiagramSpec;
  /** 1 = application directe, 2 = raisonnement, 3 = piège classique. */
  difficulty: 1 | 2 | 3;
}

/** Sceau remis au joueur lorsqu'il résout la question d'un poste. */
export interface Seal {
  /** Clé de son nom dans les messages, sous `museum.seals`. */
  id: string;
  /** Couleur hexadécimale utilisée dans le HUD et sur le socle du poste. */
  color: string;
}

/** Familles de modèles 3D posés dans le musée. */
export type StationKind =
  | "pressure-bench"
  | "calorimeter"
  | "energy-track"
  | "circuit-bench"
  | "force-table"
  | "air-rail";

/**
 * Condition d'accès à un poste : `power` exige le courant rétabli,
 * `energy-case` exige la clé de la vitrine.
 */
export type StationGate = "power" | "energy-case";

/** Poste du musée : un thème, un modèle 3D, un sceau. */
export interface Station {
  /** Clé de son nom dans les messages, sous `museum.stations`. */
  id: string;
  topic: PhysicsTopic;
  kind: StationKind;
  roomId: RoomId;
  position: Vec3;
  /** Rotation autour de l'axe Y, en radians. */
  rotationY: number;
  /** Empreinte au sol [largeur, profondeur] utilisée pour les collisions. */
  footprint: [width: number, depth: number];
  reward: Seal;
  gate?: StationGate;
}

/** Objets que le joueur peut ramasser et garder dans son carnet. */
export type InventoryItemId = "uv-lamp" | "fuse" | "case-key";

/** Ce que le joueur peut viser et activer avec la touche E. */
export type InteractableKind =
  | "station"
  | "inspect"
  | "pickup"
  | "cabinet-door"
  | "final-door"
  | "safe"
  | "fuse-box"
  | "uv-wall";

/** Verbe de l'invite d'interaction, traduit sous `museum.verbs`. */
export type InteractionVerb =
  "analyze" | "inspect" | "read" | "search" | "open" | "unlock" | "uvLight";

/**
 * Objet visable. Son nom est dans les messages : sous `museum.stations` pour
 * un poste, sous `museum.objects` pour le reste.
 */
export interface Interactable {
  id: string;
  kind: InteractableKind;
  roomId: RoomId;
  verb: InteractionVerb;
  position: Vec3;
  /** Rayon de l'objet, ajouté à la portée du joueur. */
  radius: number;
}

/**
 * Fiche d'inspection (tableau, buste, plaque…). Ses textes sont dans les
 * messages, sous `museum.inspect.<id>` : titre, cartel, description et, pour
 * une fiche illustrée, texte alternatif de l'image.
 */
export interface InspectContent {
  id: string;
  /** Image affichée en grand, chemin public. */
  image?: string;
  /**
   * Rang chronologique du savant représenté : le tableau cache alors le
   * chiffre correspondant du code du cabinet.
   */
  codeIndex?: 0 | 1 | 2 | 3;
}

/** Disjoncteur du tableau électrique, nommé sous `museum.breakers`. */
export interface Breaker {
  id: string;
  watts: number;
  /** Unité d'affichage : le joueur doit comparer des W et des kW mélangés. */
  unit: "W" | "kW";
}

/** Énigme du coffre, révélée par la lampe UV. */
export interface SafeRiddle {
  massKg: number;
  heightM: number;
  /** Énergie potentielle en joules, avec g = 10 m/s². */
  answer: number;
}
