import { shuffle } from "@/lib/shuffle";
import type { Breaker, SafeRiddle } from "@/types/game";

/**
 * Logique pure des énigmes d'escape game : tirages aléatoires à l'ouverture
 * d'une partie et vérifications. Aucun effet de bord, aucun accès au store.
 */

/**
 * Tire les quatre chiffres du cadenas, dans l'ordre chronologique des savants
 * (Archimède, Galilée, Newton, Curie). On refuse un code de chiffres tous
 * identiques, trop facile à deviner.
 */
export function generateCodeDigits(): [number, number, number, number] {
  for (;;) {
    const digits = Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 10),
    ) as [number, number, number, number];
    if (new Set(digits).size > 1) return digits;
  }
}

const RIDDLE_MASSES = [2, 3, 4] as const;
const RIDDLE_HEIGHTS = [5, 10, 15, 20] as const;

/**
 * Énigme du coffre : une énergie potentielle Epp = m · g · h avec g = 10.
 * Les valeurs sont choisies pour que le résultat tienne toujours sur trois
 * chiffres (de 100 à 800 J).
 */
export function generateSafeRiddle(): SafeRiddle {
  const massKg =
    RIDDLE_MASSES[Math.floor(Math.random() * RIDDLE_MASSES.length)];
  const heightM =
    RIDDLE_HEIGHTS[Math.floor(Math.random() * RIDDLE_HEIGHTS.length)];
  return { massKg, heightM, answer: massKg * 10 * heightM };
}

/** Appareils du tableau électrique, avec des puissances en W ou en kW. */
const BREAKER_POOL: readonly Breaker[] = [
  {
    id: "emergency",
    label: "Éclairage de secours",
    display: "45 W",
    watts: 45,
  },
  { id: "vitrines", label: "Vitrines", display: "300 W", watts: 300 },
  { id: "alarm", label: "Alarme", display: "0,12 kW", watts: 120 },
  { id: "chandeliers", label: "Lustres", display: "1,2 kW", watts: 1200 },
  { id: "bench", label: "Banc d'Ampère", display: "2 kW", watts: 2000 },
  { id: "heating", label: "Chauffage", display: "3,5 kW", watts: 3500 },
  { id: "projector", label: "Projecteur", display: "0,8 kW", watts: 800 },
  { id: "elevator", label: "Monte-charge", display: "6 kW", watts: 6000 },
];

/** Tire quatre disjoncteurs, dans un ordre d'affichage mélangé. */
export function generateBreakers(): Breaker[] {
  return shuffle([...BREAKER_POOL]).slice(0, 4);
}

/** Disjoncteur à réarmer ensuite : le moins puissant encore désarmé. */
export function nextBreakerId(
  breakers: readonly Breaker[],
  armedIds: readonly string[],
): string | null {
  const remaining = breakers.filter(
    (breaker) => !armedIds.includes(breaker.id),
  );
  if (remaining.length === 0) return null;
  return remaining.reduce((lowest, breaker) =>
    breaker.watts < lowest.watts ? breaker : lowest,
  ).id;
}

/** Formate une durée en millisecondes au format mm:ss. */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
