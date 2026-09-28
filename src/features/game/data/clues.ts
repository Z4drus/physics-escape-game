import type { InspectContent } from "@/types/game";

/**
 * Structure des textes du jeu : fiches d'inspection, cartes d'introduction,
 * répliques de l'hologramme. Les textes eux-mêmes sont dans les messages,
 * sous `museum`, dans chaque langue.
 */

/**
 * Fiches ouvertes par la touche E sur un objet du décor, textes sous
 * `museum.inspect.<id>`.
 */
export const INSPECT_CONTENTS: readonly InspectContent[] = [
  {
    id: "painting-archimede",
    image: "/images/paintings/archimede.webp",
    codeIndex: 0,
  },
  {
    id: "painting-galilee",
    image: "/images/paintings/galilee.webp",
    codeIndex: 1,
  },
  {
    id: "painting-newton",
    image: "/images/paintings/newton.webp",
    codeIndex: 2,
  },
  {
    id: "painting-curie",
    image: "/images/paintings/curie.webp",
    codeIndex: 3,
  },
  { id: "poster", image: "/images/decor/poster.webp" },
  { id: "plaque-rules" },
  { id: "bust-archimede" },
  { id: "vitrine-armillary" },
  { id: "vitrine-telescope" },
  { id: "desk-note" },
  { id: "chalkboard", image: "/images/decor/chalkboard.webp" },
  { id: "uv-wall" },
];

export const INSPECT_CONTENTS_BY_ID: ReadonlyMap<string, InspectContent> =
  new Map(INSPECT_CONTENTS.map((content) => [content.id, content]));

/** Cartes d'introduction, dans l'ordre, textes sous `museum.intro`. */
export const INTRO_CARD_IDS = ["announcement", "queue", "doors"] as const;

/** Répliques de l'hologramme d'Einstein, dans l'ordre, sous `museum.hologram`. */
export const HOLOGRAM_LINE_IDS = ["greeting", "praise", "farewell"] as const;
