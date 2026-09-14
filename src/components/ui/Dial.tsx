"use client";

import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/cn";
import { TRANSITION } from "@/lib/motion";

/**
 * Molette à chiffre d'un cadenas ou d'un coffre : deux flèches encadrent le
 * chiffre, qui glisse verticalement quand il change. Les flèches du clavier
 * agissent quand la molette a le focus.
 */
export function Dial({
  value,
  onChange,
  label,
  disabled = false,
  tone = "brass",
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  disabled?: boolean;
  tone?: "brass" | "iron";
}) {
  const step = (delta: number) => onChange((value + delta + 10) % 10);

  return (
    <div className="flex flex-col items-center gap-1">
      <ArrowButton
        direction="up"
        onClick={() => step(1)}
        disabled={disabled}
        label={`${label} : chiffre suivant`}
      />
      <div
        role="spinbutton"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={9}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "ArrowUp") {
            event.preventDefault();
            step(1);
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            step(-1);
          } else if (/^[0-9]$/.test(event.key)) {
            event.preventDefault();
            onChange(Number(event.key));
          }
        }}
        className={cn(
          "font-display relative grid h-20 w-14 place-items-center overflow-hidden rounded-sm text-4xl tabular-nums outline-none",
          "outline-line-strong outline-1 outline-offset-[-1px]",
          "focus-visible:outline-accent-soft focus-visible:outline-2",
          tone === "brass" &&
            "text-accent-soft bg-[linear-gradient(180deg,rgb(255_240_220/0.1),rgb(255_240_220/0.02))]",
          tone === "iron" &&
            "text-ink bg-[linear-gradient(180deg,rgb(255_255_255/0.06),rgb(0_0_0/0.3))]",
        )}
      >
        <span
          aria-hidden
          className="bg-line-strong absolute inset-x-2 top-1/2 h-px -translate-y-[1.35rem]"
        />
        <span
          aria-hidden
          className="bg-line-strong absolute inset-x-2 top-1/2 h-px translate-y-[1.35rem]"
        />
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: 18, opacity: 0, filter: "blur(3px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: -18, opacity: 0, filter: "blur(3px)" }}
            transition={TRANSITION.micro}
            className="block"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <ArrowButton
        direction="down"
        onClick={() => step(-1)}
        disabled={disabled}
        label={`${label} : chiffre précédent`}
      />
    </div>
  );
}

function ArrowButton({
  direction,
  onClick,
  disabled,
  label,
}: {
  direction: "up" | "down";
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="text-ink-mute hover:text-ink hover:bg-surface-raised ease-smooth tap-target grid size-10 cursor-pointer place-items-center rounded-sm transition-[color,background-color,scale] duration-[200ms] active:scale-[0.96] disabled:pointer-events-none disabled:opacity-40"
    >
      <svg
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
        className={cn("size-4", direction === "down" && "rotate-180")}
      >
        <path
          d="M4 10L8 6L12 10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
