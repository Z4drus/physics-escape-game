"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

export interface TextTextureOptions {
  lines: readonly string[];
  width?: number;
  height?: number;
  /** Taille de police en pixels de canvas. */
  fontSize?: number;
  /** `heading` utilise la police d'affichage du site, `body` la police courante. */
  family?: "heading" | "body" | "mono";
  weight?: number;
  color?: string;
  background?: string;
  align?: CanvasTextAlign;
  /** Interligne, en multiple de la taille de police. */
  lineHeight?: number;
  /** Marge intérieure, en pixels de canvas. */
  padding?: number;
}

/** Police déclarée par `next/font`, lue depuis la variable CSS correspondante. */
function resolveFamily(
  kind: NonNullable<TextTextureOptions["family"]>,
): string {
  const variable =
    kind === "heading"
      ? "--font-heading"
      : kind === "mono"
        ? "--font-code"
        : "--font-body";
  const fallback =
    kind === "heading"
      ? "Georgia, serif"
      : kind === "mono"
        ? "monospace"
        : "sans-serif";
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  return value ? `${value}, ${fallback}` : fallback;
}

function draw(
  canvas: HTMLCanvasElement,
  options: Required<TextTextureOptions>,
) {
  const context = canvas.getContext("2d");
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  if (options.background !== "transparent") {
    context.fillStyle = options.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.font = `${options.weight} ${options.fontSize}px ${resolveFamily(options.family)}`;
  context.fillStyle = options.color;
  context.textAlign = options.align;
  context.textBaseline = "middle";

  const step = options.fontSize * options.lineHeight;
  const total = step * options.lines.length;
  const startY = canvas.height / 2 - total / 2 + step / 2;
  const x =
    options.align === "left"
      ? options.padding
      : options.align === "right"
        ? canvas.width - options.padding
        : canvas.width / 2;

  options.lines.forEach((line, index) => {
    context.fillText(
      line,
      x,
      startY + index * step,
      canvas.width - options.padding * 2,
    );
  });
}

/**
 * Texte dessiné dans une texture : plaques, cartels, message révélé. Le
 * navigateur fournit les polices, three.js n'a rien à charger. Le dessin est
 * refait une fois les polices web disponibles.
 */
export function useTextTexture(options: TextTextureOptions): CanvasTexture {
  const resolved: Required<TextTextureOptions> = {
    width: 512,
    height: 256,
    fontSize: 40,
    family: "heading",
    weight: 600,
    color: "#f3e9d7",
    background: "transparent",
    align: "center",
    lineHeight: 1.25,
    padding: 24,
    ...options,
  };
  const linesKey = resolved.lines.join("\n");

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = resolved.width;
    canvas.height = resolved.height;
    draw(canvas, { ...resolved, lines: linesKey.split("\n") });
    const created = new CanvasTexture(canvas);
    created.colorSpace = SRGBColorSpace;
    created.anisotropy = 8;
    return created;
    // Les options scalaires sont recomposées ci-dessous : la clé de lignes
    // suffit à détecter un changement de contenu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    linesKey,
    resolved.width,
    resolved.height,
    resolved.fontSize,
    resolved.family,
    resolved.weight,
    resolved.color,
    resolved.background,
    resolved.align,
    resolved.lineHeight,
    resolved.padding,
  ]);

  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      draw(texture.image as HTMLCanvasElement, {
        ...resolved,
        lines: linesKey.split("\n"),
      });
      texture.needsUpdate = true;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texture]);

  useEffect(() => () => texture.dispose(), [texture]);

  return texture;
}
