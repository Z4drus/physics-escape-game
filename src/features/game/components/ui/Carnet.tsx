"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { INSPECT_CONTENTS_BY_ID } from "@/features/game/data/clues";
import { STATIONS } from "@/features/game/data/stations";
import { useMuseumCopy } from "@/features/game/i18n/useMuseumCopy";
import { TRANSITION, revealAt } from "@/lib/motion";
import type {
  InspectContent,
  InventoryItemId,
  SafeRiddle,
  Seal,
} from "@/types/game";

/**
 * Carnet du joueur, ouvert par Tab sans relâcher la souris : sceaux, indices
 * découverts, énigme du coffre et objets ramassés. Purement informatif, il ne
 * contient aucun contrôle.
 */
export function Carnet({
  seals,
  discoveredClueIds,
  codeDigits,
  safeRiddle,
  uvRevealed,
  inventory,
}: {
  seals: readonly Seal[];
  discoveredClueIds: readonly string[];
  codeDigits: readonly number[];
  safeRiddle: SafeRiddle;
  uvRevealed: boolean;
  inventory: readonly InventoryItemId[];
}) {
  const t = useTranslations("ui.carnet");
  const museum = useMuseumCopy();
  const collected = new Set(seals.map((seal) => seal.id));
  const clues = discoveredClueIds
    .map((id) => INSPECT_CONTENTS_BY_ID.get(id))
    .filter(
      (content): content is InspectContent =>
        content !== undefined && content.codeIndex !== undefined,
    );

  return (
    <motion.aside
      role="complementary"
      aria-label={t("label")}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={TRANSITION.base}
      className="glass pointer-events-none fixed top-20 right-4 bottom-24 z-10 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl p-2 sm:right-6"
    >
      <div className="parchment flex h-full flex-col overflow-y-auto rounded-lg">
        <header className="border-b border-[rgb(43_29_18/0.14)] px-5 py-4">
          <p className="text-xs font-medium uppercase opacity-70">
            {t("eyebrow")}
          </p>
          <h2 className="mt-1 text-2xl">{t("title")}</h2>
        </header>

        <Section title={t("seals")} index={0}>
          <ul className="flex flex-col gap-1.5">
            {STATIONS.map((station) => {
              const has = collected.has(station.reward.id);
              return (
                <li
                  key={station.id}
                  className="flex items-center gap-2.5 text-sm"
                >
                  <span
                    aria-hidden
                    className="rounded-pill size-2.5 shrink-0"
                    style={{
                      backgroundColor: has
                        ? station.reward.color
                        : "transparent",
                      boxShadow: has
                        ? `0 0 8px ${station.reward.color}`
                        : "inset 0 0 0 1px rgb(43 29 18 / 0.35)",
                    }}
                  />
                  <span className={has ? "" : "opacity-55"}>
                    {museum.station(station.id)}
                  </span>
                  <span className="sr-only">
                    {has ? t("sealObtained") : t("sealPending")}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title={t("clues")} index={1}>
          {clues.length === 0 && !uvRevealed ? (
            <p className="text-sm opacity-60">{t("noClues")}</p>
          ) : null}
          {clues.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {clues.map((clue) => {
                const copy = museum.inspect(clue, safeRiddle);
                return (
                  <li
                    key={clue.id}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span>
                      {copy.title}
                      <span className="block text-xs opacity-60">
                        {copy.caption.split(" · ")[0]}
                      </span>
                    </span>
                    <span className="font-display text-xl tabular-nums">
                      {codeDigits[clue.codeIndex ?? 0]}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {uvRevealed ? (
            <p className="mt-3 border-t border-[rgb(43_29_18/0.14)] pt-3 text-sm">
              {t("safeHint", {
                mass: safeRiddle.massKg,
                height: safeRiddle.heightM,
              })}
            </p>
          ) : null}
        </Section>

        <Section title={t("items")} index={2}>
          {inventory.length === 0 ? (
            <p className="text-sm opacity-60">{t("noItems")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {inventory.map((id) => (
                <li key={id} className="text-sm">
                  <span className="font-medium">{museum.item(id).name}</span>
                  <span className="block text-xs opacity-70">
                    {museum.item(id).description}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <p className="mt-auto px-5 py-3 text-xs opacity-60">{t("closeHint")}</p>
      </div>
    </motion.aside>
  );
}

function Section({
  title,
  index,
  children,
}: {
  title: string;
  index: number;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={revealAt(index, 0.05)}
      className="border-b border-[rgb(43_29_18/0.14)] px-5 py-4"
    >
      <Eyebrow className="text-[#2b1d12]/70">{title}</Eyebrow>
      <div className="mt-2">{children}</div>
    </motion.section>
  );
}
