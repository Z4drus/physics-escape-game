import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

/**
 * Génère un damier procédural : évite de charger un fichier image tout en
 * donnant au sol une échelle lisible pendant les déplacements.
 *
 * À n'appeler que côté client (dépend de l'API Canvas du navigateur).
 */
export function createCheckerTexture({
  colorA,
  colorB,
  cells = 8,
  resolution = 512,
  repeat = 1,
}: {
  colorA: string;
  colorB: string;
  cells?: number;
  resolution?: number;
  repeat?: number;
}): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = resolution;
  canvas.height = resolution;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error(
      "Contexte 2D indisponible : impossible de générer la texture",
    );
  }

  const cellSize = resolution / cells;
  for (let row = 0; row < cells; row += 1) {
    for (let column = 0; column < cells; column += 1) {
      context.fillStyle = (row + column) % 2 === 0 ? colorA : colorB;
      context.fillRect(column * cellSize, row * cellSize, cellSize, cellSize);
    }
  }

  // Joints légèrement plus sombres pour marquer le carrelage.
  context.strokeStyle = "rgba(0, 0, 0, 0.22)";
  context.lineWidth = Math.max(1, resolution / 256);
  for (let index = 0; index <= cells; index += 1) {
    const offset = index * cellSize;
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset, resolution);
    context.moveTo(0, offset);
    context.lineTo(resolution, offset);
    context.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 4;
  return texture;
}
