"use client";

import { motion } from "motion/react";
import Image from "next/image";

import { Button } from "@/components/ui/Button";
import { CloseButton, ModalShell } from "@/components/ui/ModalShell";
import { revealAt } from "@/lib/motion";
import type { InspectContent, SafeRiddle } from "@/types/game";

/**
 * Fiche d'inspection d'un objet du décor : image, cartel, description et,
 * pour les tableaux, le chiffre trouvé au dos du cadre. La fiche prend de la
 * hauteur : une œuvre se regarde en grand.
 */
export function InspectDialog({
  content,
  digit,
  safeRiddle,
  onClose,
}: {
  content: InspectContent;
  /** Chiffre du code porté par ce tableau, s'il en cache un. */
  digit: number | null;
  safeRiddle: SafeRiddle;
  onClose: () => void | Promise<void>;
}) {
  const body = content.body
    .replace("{mass}", String(safeRiddle.massKg))
    .replace("{height}", String(safeRiddle.heightM));
  const withImage = Boolean(content.image);

  return (
    <ModalShell
      labelledBy="inspect-title"
      onClose={onClose}
      maxWidth={withImage ? "max-w-5xl" : "max-w-2xl"}
      minHeight={
        withImage ? "min-h-[min(80dvh,52rem)]" : "min-h-[min(56dvh,34rem)]"
      }
    >
      <div className="border-line flex items-center justify-between gap-4 border-b px-6 py-3">
        <p className="text-ink-mute text-xs">Inspection</p>
        <CloseButton onClick={onClose} label="Refermer la fiche" />
      </div>

      <div
        className={
          withImage
            ? "grid min-h-0 flex-1 lg:grid-cols-[1.05fr_1fr]"
            : "flex min-h-0 flex-1 flex-col"
        }
      >
        {content.image ? (
          <motion.figure
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={revealAt(0, 0.05)}
            className="border-line relative min-h-72 lg:min-h-0 lg:border-r"
          >
            <Image
              src={content.image}
              alt={content.imageAlt ?? ""}
              fill
              sizes="(min-width: 1024px) 45vw, 90vw"
              className="object-cover outline-1 -outline-offset-1 outline-white/10"
              priority
            />
          </motion.figure>
        ) : null}

        <div className="parchment flex min-h-0 flex-1 flex-col">
          <div className="my-auto py-2">
            <motion.header
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealAt(1, 0.05)}
              className="px-8 pt-9"
            >
              <h2 id="inspect-title" className="text-4xl sm:text-5xl">
                {content.title}
              </h2>
              {content.caption ? (
                <p className="mt-2.5 text-sm opacity-70">{content.caption}</p>
              ) : null}
            </motion.header>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={revealAt(2, 0.05)}
              className="px-8 pt-6 pb-6 text-base leading-relaxed sm:text-lg"
            >
              {body}
            </motion.p>

            {digit !== null ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={revealAt(3, 0.05)}
                className="mx-8 mb-6 flex items-center justify-between gap-5 rounded-md border border-[rgb(43_29_18/0.2)] bg-[rgb(43_29_18/0.06)] px-5 py-4"
              >
                <p className="text-base">
                  Au dos du cadre, un chiffre tracé à la craie. Noté dans le
                  carnet.
                </p>
                <span
                  className="font-display text-6xl tabular-nums"
                  aria-label={`Chiffre ${digit}`}
                >
                  {digit}
                </span>
              </motion.div>
            ) : null}
          </div>

          <div className="border-t border-[rgb(43_29_18/0.14)] px-8 py-5">
            <Button onClick={onClose} withArrow>
              Reprendre l&apos;exploration
            </Button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
