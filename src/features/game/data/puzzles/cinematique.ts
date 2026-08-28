import type { Puzzle } from "@/types/game";

/**
 * Questions du thème « Cinématique — MRU / MRUA ».
 * Une question par niveau de difficulté : lecture d'un graphique x(t) en
 * mouvement rectiligne uniforme, chute libre, puis distance de freinage.
 */
export const CINEMATIQUE_PUZZLES: readonly Puzzle[] = [
  {
    id: "cinematique-mru-graphique-vitesse",
    topic: "cinematique",
    scenario:
      "Sur le rail à coussin d'air gradué, un mobile autoporteur glisse en laissant une marque toutes les secondes, toutes espacées de la même distance.",
    question:
      "Le mobile est à x = 0,80 m à l'instant t = 1,0 s et à x = 3,20 m à l'instant t = 5,0 s. Le graphique x(t) est une droite : quelle est la vitesse du mobile ?",
    answers: [
      { id: "a", label: "0,48 m/s" },
      { id: "b", label: "0,60 m/s" },
      { id: "c", label: "0,64 m/s" },
    ],
    correctAnswerId: "b",
    explanation:
      "Le mouvement est rectiligne uniforme : la vitesse est la pente de la droite x(t), donc le rapport de la variation de position sur la durée écoulée. Δx = 3,20 − 0,80 = 2,40 m et Δt = 5,0 − 1,0 = 4,0 s, d'où v = 2,40 / 4,0 = 0,60 m/s. Diviser par 5,0 s (en oubliant que le chronomètre affiche déjà 1,0 s au premier point) donnerait 0,48 m/s, et diviser 3,20 m par 5,0 s donnerait 0,64 m/s : les deux oublient qu'il faut une variation, pas une valeur.",
    formula: "v = Δx / Δt = (x₂ − x₁) / (t₂ − t₁)",
    diagram: {
      kind: "uniform-motion-rail",
      params: {
        x1: 0.8,
        t1: 1,
        x2: 3.2,
        t2: 5,
        v: 0.6,
        railLength: 3.6,
        markerInterval: 1,
      },
    },
    difficulty: 1,
  },
  {
    id: "cinematique-chute-libre-profondeur",
    topic: "cinematique",
    scenario:
      "Une bille d'acier est lâchée sans vitesse initiale au bord d'un puits et l'on entend l'impact au fond 1,5 s plus tard.",
    question:
      "En négligeant les frottements de l'air et le temps de propagation du son, quelle est la profondeur du puits ? (g = 9,81 m/s²)",
    answers: [
      { id: "a", label: "7,4 m" },
      { id: "b", label: "22,1 m" },
      { id: "c", label: "11,0 m" },
    ],
    correctAnswerId: "c",
    explanation:
      "La chute libre sans vitesse initiale est un MRUA d'accélération g : la distance parcourue vaut h = ½ · g · t². Ici h = 0,5 × 9,81 × 1,5² = 0,5 × 9,81 × 2,25 = 11,0 m. Oublier le facteur ½ (ou multiplier la vitesse finale v = g·t = 14,7 m/s par la durée, ce qui revient au même) donne 22,1 m, et écrire ½ · g · t au lieu de ½ · g · t² donne 7,4 m.",
    formula: "h = ½ · g · t²",
    diagram: {
      kind: "free-fall-well",
      params: {
        g: 9.81,
        t: 1.5,
        h: 11.04,
        vFinale: 14.7,
        markerInterval: 0.25,
      },
    },
    difficulty: 2,
  },
  {
    id: "cinematique-distance-freinage",
    topic: "cinematique",
    scenario:
      "Sur la piste d'essai, une voiture lancée à vitesse constante freine d'un coup jusqu'à l'arrêt complet et laisse une trace de pneus sur l'asphalte.",
    question:
      "La voiture roule à 72 km/h et freine avec une décélération constante de 5,0 m/s² jusqu'à l'arrêt. Quelle distance parcourt-elle pendant le freinage ?",
    answers: [
      { id: "a", label: "40 m" },
      { id: "b", label: "80 m" },
      { id: "c", label: "518 m" },
    ],
    correctAnswerId: "a",
    explanation:
      "Il faut d'abord convertir : 72 km/h = 72 / 3,6 = 20 m/s. La relation sans le temps donne 0 = v₀² − 2 · a · Δx, soit Δx = v₀² / (2·a) = 20² / (2 × 5,0) = 400 / 10 = 40 m. Oublier le facteur 2 donne 80 m, et garder les 72 km/h sans convertir donne 72² / 10 = 518 m, une distance de freinage impossible pour une voiture de série.",
    formula: "v² = v₀² + 2 · a · Δx  ⟹  Δx = v₀² / (2 · a)",
    diagram: {
      kind: "braking-distance-track",
      params: {
        v0KmH: 72,
        v0: 20,
        a: -5,
        distance: 40,
        duree: 4,
        markerInterval: 0.5,
      },
    },
    difficulty: 3,
  },
];
