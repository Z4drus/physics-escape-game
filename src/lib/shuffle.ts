/**
 * Mélange une liste (Fisher-Yates) sans modifier la source.
 *
 * Utilisé pour l'ordre des propositions d'une question : sans lui, la bonne
 * réponse occuperait toujours la même position d'un thème à l'autre, ce qui
 * finirait par se remarquer.
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }

  return result;
}
