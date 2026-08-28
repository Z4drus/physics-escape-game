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
    <main className="flex min-h-dvh justify-center overflow-y-auto p-6">
      <div className="glass my-auto w-full max-w-md rounded-xl p-2">
        <div className="bg-background-deep rounded-lg p-6">
          <h1 className="text-xl">Le laboratoire n&apos;a pas pu se charger</h1>
          <p className="text-ink-fade mt-3 text-sm">
            Une erreur est survenue pendant l&apos;initialisation du jeu.
            Vérifiez que WebGL est activé dans votre navigateur, puis réessayez.
          </p>
          <button
            type="button"
            onClick={reset}
            className="bg-ink text-background ease-smooth mt-6 h-11 w-full cursor-pointer rounded-md text-sm font-medium transition-opacity duration-[200ms] hover:opacity-90"
          >
            Réessayer
          </button>
        </div>
      </div>
    </main>
  );
}
