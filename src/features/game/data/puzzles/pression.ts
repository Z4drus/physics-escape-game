import type { Puzzle } from "@/types/game";

/**
 * Questions du thème « Pression » : définition p = F/S, pression
 * hydrostatique et principe de Pascal. Une question par niveau de difficulté.
 */
export const PRESSION_PUZZLES: readonly Puzzle[] = [
  {
    id: "pression-caisse-au-sol",
    topic: "pression",
    scenario:
      "Une caisse métallique pesant 600 N repose à plat sur le sol de la salle des machines, sa face d'appui mesurant 0,50 m sur 0,40 m.",
    question:
      "Quelle pression la caisse exerce-t-elle sur le sol au niveau de sa face d'appui ?",
    answers: [
      { id: "a", label: "120 Pa" },
      { id: "b", label: "1 200 Pa" },
      { id: "c", label: "3 000 Pa (3,0 kPa)" },
    ],
    correctAnswerId: "c",
    explanation:
      "La pression est le rapport de la force pressante à la surface de contact : S = 0,50 × 0,40 = 0,20 m². On obtient p = 600 / 0,20 = 3 000 Pa, soit 3,0 kPa. Multiplier par la surface donne 120 Pa et diviser par un seul côté (0,50 m) donne 1 200 Pa : deux erreurs classiques.",
    formula: "p = F / S",
    diagram: {
      kind: "pressure-box-on-ground",
      params: {
        forceN: 600,
        contactWidthM: 0.5,
        contactDepthM: 0.4,
        boxHeightM: 0.35,
        contactAreaM2: 0.2,
        forceLabel: "F = 600 N",
        areaLabel: "S = 0,50 m × 0,40 m",
      },
    },
    difficulty: 1,
  },
  {
    id: "pression-fond-du-bassin",
    topic: "pression",
    scenario:
      "Un bassin de rétention large de 1,20 m sur 0,80 m est rempli d'eau sur 2,50 m de hauteur, et un capteur de pression est posé au fond.",
    question:
      "Quelle pression l'eau seule exerce-t-elle sur le capteur, pression atmosphérique non comprise ? On prend ρ = 1000 kg/m³ et g = 9,81 m/s².",
    answers: [
      { id: "a", label: "24 525 Pa (≈ 24,5 kPa)" },
      { id: "b", label: "2 500 Pa (2,5 kPa)" },
      { id: "c", label: "125 850 Pa (≈ 125,9 kPa)" },
    ],
    correctAnswerId: "a",
    explanation:
      "La pression hydrostatique ne dépend que de la profondeur et de la masse volumique, jamais de la largeur du bassin ni du volume d'eau : p = 1000 × 9,81 × 2,50 = 24 525 Pa ≈ 24,5 kPa. Oublier le facteur g donne 2 500 Pa ; ajouter la pression atmosphérique (101 325 Pa) donnerait la pression absolue 125 850 Pa, que l'énoncé exclut explicitement.",
    formula: "p = ρ · g · h",
    diagram: {
      kind: "hydrostatic-column",
      params: {
        densityKgPerM3: 1000,
        gravityMPerS2: 9.81,
        depthM: 2.5,
        tankWidthM: 1.2,
        tankDepthM: 0.8,
        liquidLabel: "eau, ρ = 1000 kg/m³",
        depthLabel: "h = 2,50 m",
      },
    },
    difficulty: 2,
  },
  {
    id: "pression-presse-hydraulique",
    topic: "pression",
    scenario:
      "Sur la presse hydraulique de l'atelier, un petit piston de 4,0 cm de diamètre et un grand piston de 20 cm de diamètre communiquent par le même circuit d'huile.",
    question:
      "Le technicien appuie avec une force de 150 N sur le petit piston : quelle force le grand piston exerce-t-il alors sur la charge ?",
    answers: [
      { id: "a", label: "750 N" },
      { id: "b", label: "3 750 N" },
      { id: "c", label: "30 N" },
    ],
    correctAnswerId: "b",
    explanation:
      "Le principe de Pascal impose la même pression dans les deux cylindres, donc F₂ = F₁ · S₂/S₁. Les surfaces varient comme le carré du diamètre : S₂/S₁ = (20 / 4,0)² = 25, d'où F₂ = 150 × 25 = 3 750 N. Le piège classique est d'utiliser le simple rapport des diamètres (× 5 → 750 N) ou de l'inverser (150 / 5 → 30 N).",
    formula: "F₂ = F₁ · (S₂ / S₁) = F₁ · (d₂ / d₁)²",
    diagram: {
      kind: "hydraulic-press",
      params: {
        smallPistonDiameterM: 0.04,
        largePistonDiameterM: 0.2,
        inputForceN: 150,
        areaRatio: 25,
        smallPistonLabel: "d₁ = 4,0 cm",
        largePistonLabel: "d₂ = 20 cm",
        inputForceLabel: "F₁ = 150 N",
      },
    },
    difficulty: 3,
  },
];
