import clsx from "clsx";
import { Check, Minus } from "lucide-react";
import type { CompletionKind } from "../domain/habit";
import { habitColor } from "./habitColors";

const SIZES = {
  md: { mark: "size-9", check: "size-5", minus: "size-4" },
  sm: { mark: "size-5", check: "size-3", minus: "size-3" },
} as const;

type CompletionMarkProps = {
  kind: CompletionKind | undefined;
  color: string;
  size?: keyof typeof SIZES;
};

/**
 * The check circle on a habit: empty, filled (done), half-filled (minimum
 * version) or dashed (skipped). Decorative; callers describe the state in text.
 */
export function CompletionMark({ kind, color, size = "md" }: CompletionMarkProps) {
  const sizes = SIZES[size];
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "relative inline-flex shrink-0 items-center justify-center",
        sizes.mark,
        kind === "skipped" ? "text-stone-400 dark:text-stone-500" : habitColor(color).accent,
      )}
    >
      <svg viewBox="0 0 36 36" className="absolute inset-0 size-full">
        {kind === "full" ? (
          <circle cx="18" cy="18" r="17" fill="currentColor" />
        ) : (
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={kind === "skipped" ? "4 3.4" : undefined}
          />
        )}
        {kind === "minimum" && <path d="M18 2 A16 16 0 0 0 18 34 Z" fill="currentColor" />}
      </svg>
      {kind === "full" && (
        <Check className={clsx("relative text-white", sizes.check)} strokeWidth={3} />
      )}
      {kind === "skipped" && <Minus className={clsx("relative", sizes.minus)} strokeWidth={3} />}
    </span>
  );
}
