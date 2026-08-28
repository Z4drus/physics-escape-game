"use client";

import { useEffect, useState } from "react";

/** Formate une durée en millisecondes au format mm:ss. */
function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Chronomètre de la partie. Il se rafraîchit une fois par seconde plutôt
 * qu'à chaque frame, et utilise des chiffres tabulaires pour éviter que le
 * HUD ne tressaute à chaque changement de chiffre.
 */
export function SessionTimer({
  startedAt,
  finishedAt,
}: {
  startedAt: number | null;
  finishedAt: number | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt || finishedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startedAt, finishedAt]);

  const elapsed = startedAt ? (finishedAt ?? now) - startedAt : 0;

  return (
    <span className="font-mono text-sm tabular-nums">
      {formatDuration(elapsed)}
    </span>
  );
}
