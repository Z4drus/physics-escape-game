import type {
  InspectContent,
  InventoryItem,
  InventoryItemId,
} from "@/types/game";

/**
 * Textes du jeu : fiches d'inspection, cartes d'introduction, répliques de
 * l'hologramme, objets du carnet. Tout ce qui se lit est ici.
 */

/** Fiches ouvertes par la touche E sur un objet du décor. */
export const INSPECT_CONTENTS: readonly InspectContent[] = [
  {
    id: "painting-archimede",
    title: "Archimède de Syracuse",
    caption:
      "Vers 287 av. J.-C. – 212 av. J.-C. · Huile sur toile, école italienne",
    image: "/images/paintings/archimede.webp",
    imageAlt:
      "Portrait peint d'Archimède, vieil homme barbu traçant des figures au compas.",
    body: "Le savant de Syracuse trace des cercles dans le sable. C'est à lui que l'on doit le principe de la poussée exercée par un fluide sur un corps immergé, et le cri « Eurêka ! » que le musée aime rappeler.",
    codeIndex: 0,
  },
  {
    id: "painting-galilee",
    title: "Galileo Galilei",
    caption: "1564 – 1642 · Huile sur toile, école florentine",
    image: "/images/paintings/galilee.webp",
    imageAlt:
      "Portrait peint de Galilée tenant une lunette, un globe céleste à ses côtés.",
    body: "Lunette en main, Galilée regarde le visiteur. Il a montré qu'en l'absence de frottements, tous les corps tombent de la même façon, et que le mouvement uniforme ne réclame aucune force pour se maintenir.",
    codeIndex: 1,
  },
  {
    id: "painting-newton",
    title: "Isaac Newton",
    caption: "1643 – 1727 · Huile sur toile, école anglaise",
    image: "/images/paintings/newton.webp",
    imageAlt:
      "Portrait peint de Newton tenant un prisme qui décompose un rayon de lumière.",
    body: "Un prisme, un rayon, sept couleurs. Newton a écrit les trois lois du mouvement et la loi de la gravitation, mais il a aussi montré que la lumière blanche est un mélange.",
    codeIndex: 2,
  },
  {
    id: "painting-curie",
    title: "Marie Curie",
    caption: "1867 – 1934 · Huile sur toile, école française",
    image: "/images/paintings/curie.webp",
    imageAlt:
      "Portrait peint de Marie Curie dans son laboratoire, près de fioles luminescentes.",
    body: "Deux prix Nobel, physique puis chimie. Les fioles qui luisent à côté d'elle rappellent le radium, isolé dans un hangar de la rue Lhomond après des tonnes de minerai traitées à la main.",
    codeIndex: 3,
  },
  {
    id: "poster",
    title: "Physique : les lois du monde",
    caption: "Affiche de l'exposition · Lithographie, 1926",
    image: "/images/decor/poster.webp",
    imageAlt:
      "Affiche Art déco : pendule stylisé, orbites d'atome et prisme décomposant la lumière.",
    body: "Un pendule, un atome et un prisme. L'affiche annonce l'exposition permanente du musée. Rien n'est caché dedans, mais elle est belle.",
  },
  {
    id: "plaque-rules",
    title: "Note du conservateur",
    caption: "Plaque gravée, près de la porte du cabinet",
    body: "« Le cadenas du cabinet s'ouvre dans l'ordre du temps : du plus ancien au plus récent. Les cartels des tableaux vous diront qui a vécu avant qui. Chaque cadre garde un chiffre au dos. »",
  },
  {
    id: "bust-archimede",
    title: "Buste d'Archimède",
    caption: "Marbre de Carrare, copie du XIXe siècle",
    body: "Sous le socle, une inscription au crayon : « Les tableaux ne mentent pas, regardez derrière. » Quelqu'un a déjà cherché ici avant vous.",
  },
  {
    id: "vitrine-armillary",
    title: "Sphère armillaire",
    caption: "Laiton et acajou, atelier parisien, vers 1780",
    body: "Les anneaux gradués représentent l'équateur, l'écliptique et les tropiques. On y lisait la position des astres bien avant les télescopes de poche.",
  },
  {
    id: "vitrine-telescope",
    title: "Lunette astronomique",
    caption: "Laiton et cuir sur trépied, vers 1850",
    body: "Une lunette de Galilée grossit peu mais montre déjà les satellites de Jupiter. Celle-ci a servi aux visiteurs du musée jusqu'en 1962.",
  },
  {
    id: "desk-note",
    title: "Bureau du conservateur",
    caption: "Chêne, cuir vert, encrier sec",
    body: "Sous le sous-main, un mot à l'encre violette : « Ce que l'œil ne voit pas, la lumière noire le révèle. Regardez le mur. » Le tiroir, lui, est vide.",
  },
  {
    id: "chalkboard",
    title: "Tableau noir du conservateur",
    caption: "Formules du programme, craie blanche",
    image: "/images/decor/chalkboard.webp",
    imageAlt:
      "Tableau noir couvert de formules de physique : F = m·a, p = F/S, E = mc², Q = m·c·ΔT, U = R·I.",
    body: "Les relations que les postes du musée mettent en jeu. Utile pour vérifier une formule avant de répondre, ou pour retrouver celle de l'énergie potentielle.",
  },
  {
    id: "uv-wall",
    title: "Message révélé",
    caption: "Encre invisible, lisible sous lumière ultraviolette",
    body: "« Le coffre s'ouvre sur l'énergie potentielle de pesanteur, en joules, d'une masse de {mass} kg posée à {height} m de hauteur. Prenez g = 10 m/s². Trois chiffres, rien de plus. »",
  },
];

export const INSPECT_CONTENTS_BY_ID: ReadonlyMap<string, InspectContent> =
  new Map(INSPECT_CONTENTS.map((content) => [content.id, content]));

/** Objets que le joueur peut ramasser. */
export const INVENTORY_ITEMS: Readonly<Record<InventoryItemId, InventoryItem>> =
  {
    "uv-lamp": {
      id: "uv-lamp",
      label: "Lampe UV",
      description:
        "Révèle les encres invisibles. Trouvée dans le tiroir du surveillant.",
    },
    fuse: {
      id: "fuse",
      label: "Fusible principal",
      description: "Le fusible du tableau électrique de la galerie.",
    },
    "case-key": {
      id: "case-key",
      label: "Clé de la vitrine",
      description: "Ouvre la vitrine de la piste de Joule.",
    },
  };

/** Cartes d'introduction, dans l'ordre. */
export const INTRO_CARDS: readonly {
  eyebrow: string;
  title: string;
  body: string;
}[] = [
  {
    eyebrow: "L'annonce",
    title: "Une soirée au musée",
    body: "Le Musée de Physique organise ce soir un escape game. Ceux qui en sortiront rencontreront Albert Einstein, présent sous la forme d'un hologramme. Le classement récompense le temps le plus court et le moins d'erreurs.",
  },
  {
    eyebrow: "La file d'attente",
    title: "Seul, mais préparé",
    body: "Tes amis ont décliné : un escape game de physique, très peu pour eux. Tu as révisé tes cours toute la nuit. Devant l'entrée, la file est longue. Le surveillant ricane : « Seul ? Bonne chance. Beaucoup abandonnent. »",
  },
  {
    eyebrow: "Les portes se referment",
    title: "Six sceaux pour sortir",
    body: "Les portes de la galerie se referment derrière toi. Chaque poste résolu donne un sceau, et la salle de l'hologramme en réclame six. Fouille, lis, cherche : tout n'est pas de la physique. Le chronomètre démarre maintenant.",
  },
];

/** Répliques de l'hologramme d'Einstein, dans l'ordre. */
export const HOLOGRAM_LINES: readonly string[] = [
  "Ah, te voilà. Tu es venu seul ? Rares sont ceux qui vont jusqu'au bout, et plus rares encore ceux qui le font sans équipe.",
  "J'ai regardé ta partie. Tu as répondu, mais tu as aussi cherché, lu, et osé te tromper. C'est exactement ainsi que la physique avance.",
  "L'imagination est plus importante que le savoir. Ce soir, tu as montré que tu avais les deux. Voyons ce que cela vaut au classement.",
];
