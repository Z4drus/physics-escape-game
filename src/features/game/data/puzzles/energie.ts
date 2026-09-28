import type { Puzzle } from "@/types/game";

/**
 * Questions du thème « Énergie » : énergie cinétique, travail et puissance,
 * conservation de l'énergie mécanique. Une question par niveau de difficulté.
 * Leurs textes sont dans les messages, sous `puzzles.<id>`, dans
 * `i18n/messages/<langue>/energie.json`.
 */
export const ENERGIE_PUZZLES: readonly Puzzle[] = [
  {
    id: "energie-cinetique-skateur",
    topic: "energie",
    correctAnswerId: "b",
    diagram: {
      kind: "skater-kinetic-energy",
      params: { masse_kg: 60, vitesse_m_s: 5, energie_J: 750 },
    },
    difficulty: 1,
  },
  {
    id: "energie-puissance-treuil",
    topic: "energie",
    correctAnswerId: "c",
    diagram: {
      kind: "winch-lift-power",
      params: {
        masse_kg: 80,
        hauteur_m: 6,
        duree_s: 12,
        g_m_s2: 9.81,
        travail_J: 4708.8,
        puissance_W: 392,
      },
    },
    difficulty: 2,
  },
  {
    id: "energie-conservation-pendule",
    topic: "energie",
    correctAnswerId: "a",
    diagram: {
      kind: "pendulum-energy-exchange",
      params: {
        longueur_fil_m: 1.2,
        masse_kg: 0.5,
        denivellation_m: 0.2,
        g_m_s2: 9.81,
        vitesse_m_s: 2,
      },
    },
    difficulty: 3,
  },
];
