"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("ui.errorPage");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh justify-center overflow-y-auto p-6">
      <div className="glass my-auto w-full max-w-md rounded-xl p-2">
        <div className="bg-background-deep rounded-lg p-6">
          <h1 className="text-xl">{t("title")}</h1>
          <p className="text-ink-fade mt-3 text-sm">{t("body")}</p>
          <button
            type="button"
            onClick={reset}
            className="bg-ink text-background ease-smooth mt-6 h-11 w-full cursor-pointer rounded-md text-sm font-medium transition-opacity duration-[200ms] hover:opacity-90"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    </main>
  );
}
