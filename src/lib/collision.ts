/** Boîte englobante alignée sur les axes, projetée au sol (plan XZ). */
export interface Box2 {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Point du plan XZ (la hauteur du joueur est constante dans ce prototype). */
export interface Point2 {
  x: number;
  z: number;
}

/**
 * Construit une boîte à partir de son centre et de ses dimensions au sol.
 */
export function boxFromCenter(
  centerX: number,
  centerZ: number,
  width: number,
  depth: number,
): Box2 {
  return {
    minX: centerX - width / 2,
    maxX: centerX + width / 2,
    minZ: centerZ - depth / 2,
    maxZ: centerZ + depth / 2,
  };
}

/**
 * Teste si un disque de rayon `radius` centré en (x, z) chevauche une boîte.
 * L'approximation « boîte dilatée » suffit pour un déplacement à la première
 * personne et reste beaucoup moins coûteuse qu'un moteur physique complet.
 */
function overlaps(box: Box2, x: number, z: number, radius: number): boolean {
  return (
    x > box.minX - radius &&
    x < box.maxX + radius &&
    z > box.minZ - radius &&
    z < box.maxZ + radius
  );
}

/**
 * Déplace le joueur de `from` vers `to` en glissant le long des obstacles.
 * Chaque axe est résolu séparément : bloquer X n'empêche pas d'avancer en Z,
 * ce qui évite l'effet « collé au mur » quand on avance en diagonale.
 */
export function resolveMovement(
  from: Point2,
  to: Point2,
  radius: number,
  boxes: readonly Box2[],
): Point2 {
  let { x, z } = from;

  if (!boxes.some((box) => overlaps(box, to.x, z, radius))) {
    x = to.x;
  }

  if (!boxes.some((box) => overlaps(box, x, to.z, radius))) {
    z = to.z;
  }

  return { x, z };
}
