"use client";

import { useEffect } from "react";

/**
 * Écran d'erreur du segment racine : la scène 3D peut échouer si le navigateur
 * ne fournit pas de contexte WebGL exploitable.
 */
export default function GameError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="panel-shadow bg-surface w-full max-w-md rounded-[28px] p-2">
        <div className="bg-surface-raised rounded-[20px] p-6">
          <h1 className="text-xl font-semibold">
            La salle n&apos;a pas pu se charger
          </h1>
          <p className="text-muted mt-2 text-sm">
            Une erreur est survenue pendant l&apos;initialisation du jeu.
            Vérifiez que WebGL est activé dans votre navigateur, puis réessayez.
          </p>
          <button
            type="button"
            onClick={reset}
            className="bg-accent text-background mt-6 h-11 w-full cursor-pointer rounded-2xl text-sm font-semibold transition-[scale,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-[var(--accent-strong)] active:scale-[0.96]"
          >
            Réessayer
          </button>
        </div>
      </div>
    </main>
  );
}
