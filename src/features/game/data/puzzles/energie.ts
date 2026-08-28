import type { Puzzle } from "@/types/game";

/**
 * Questions du thème « Énergie » : énergie cinétique, travail et puissance,
 * conservation de l'énergie mécanique. Une question par niveau de difficulté.
 */
export const ENERGIE_PUZZLES: readonly Puzzle[] = [
  {
    id: "energie-cinetique-skateur",
    topic: "energie",
    scenario:
      "Un skateur roule en ligne droite à vitesse constante sur une piste plane du skatepark.",
    question:
      "Le skateur et sa planche ont une masse totale de 60 kg et se déplacent à 5,0 m/s. Quelle est leur énergie cinétique ?",
    answers: [
      { id: "a", label: "1 500 J" },
      { id: "b", label: "750 J" },
      { id: "c", label: "150 J" },
    ],
    correctAnswerId: "b",
    explanation:
      "L'énergie cinétique vaut Ec = ½ · m · v², donc Ec = 0,5 × 60 × 5,0² = 0,5 × 60 × 25 = 750 J. Oublier le facteur ½ donne 1 500 J et oublier d'élever la vitesse au carré donne 150 J : ces deux valeurs sont fausses.",
    formula: "Ec = ½ · m · v²",
    diagram: {
      kind: "skater-kinetic-energy",
      params: { masse_kg: 60, vitesse_m_s: 5, energie_J: 750 },
    },
    difficulty: 1,
  },
  {
    id: "energie-puissance-treuil",
    topic: "energie",
    scenario:
      "Sur un chantier, un treuil hisse verticalement une caisse à vitesse constante jusqu'à une passerelle.",
    question:
      "Le treuil monte une caisse de 80 kg sur une hauteur de 6,0 m en 12 s, à vitesse constante (g = 9,81 m/s²). Quelle puissance moyenne développe-t-il ?",
    answers: [
      { id: "a", label: "4,7 kW" },
      { id: "b", label: "40 W" },
      { id: "c", label: "392 W" },
    ],
    correctAnswerId: "c",
    explanation:
      "Le treuil fournit un travail égal à l'énergie potentielle gagnée : W = m · g · h = 80 × 9,81 × 6,0 = 4 708,8 J. La puissance est ce travail rapporté à la durée : P = W / t = 4 708,8 / 12 = 392 W, soit environ 0,39 kW. Annoncer 4,7 kW revient à confondre le travail (en joules) et la puissance (en watts), et 40 W vient de l'oubli de g.",
    formula: "W = m · g · h  et  P = W / t",
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
    scenario:
      "Une boule suspendue à un fil est écartée puis lâchée sans vitesse initiale, et oscille sans frottement.",
    question:
      "Le fil mesure 1,20 m et, au moment du lâcher, la boule de 0,50 kg se trouve 0,20 m plus haut que sa position la plus basse (g = 9,81 m/s²). Quelle est sa vitesse au passage par le point le plus bas ?",
    answers: [
      { id: "a", label: "2,0 m/s" },
      { id: "b", label: "4,9 m/s" },
      { id: "c", label: "3,9 m/s" },
    ],
    correctAnswerId: "a",
    explanation:
      "Sans frottement, l'énergie potentielle perdue devient énergie cinétique : m · g · h = ½ · m · v², la masse se simplifie et v = √(2 · g · h) = √(2 × 9,81 × 0,20) = √3,92 = 2,0 m/s. La hauteur à utiliser est la dénivellation de 0,20 m, pas la longueur du fil : prendre 1,20 m donnerait 4,9 m/s, et oublier la racine carrée donnerait 3,9 m/s.",
    formula: "m · g · h = ½ · m · v²  ⟹  v = √(2 · g · h)",
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
