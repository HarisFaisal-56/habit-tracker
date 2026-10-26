import clsx from "clsx";
import { Check, Minus } from "lucide-react";
import type { CompletionKind } from "../domain/habit";
import { habitColor } from "./habitColors";

const SIZES = {
  md: { mark: "size-6.5", check: "size-3.5", minus: "size-3.5" },
  sm: { mark: "size-5", check: "size-3", minus: "size-3" },
} as const;

// Drawn in a 36 x 36 box: a ring with its outer edge on the box.
const STROKE = 2.2;
const R = 18 - STROKE / 2;
const LEFT_HALF = `M18 ${String(18 - R)} A${String(R)} ${String(R)} 0 0 0 18 ${String(18 + R)} Z`;

type CompletionMarkProps = {
  kind: CompletionKind | undefined;
  color: string;
  size?: keyof typeof SIZES;
};

/**
 * The check circle on a habit: a dim empty ring, filled in the habit's colour
 * with a dark check (done), left half filled (minimum version) or dashed
 * (skipped). Decorative; callers describe the state in text.
 */
export function CompletionMark({ kind, color, size = "md" }: CompletionMarkProps) {
  const sizes = SIZES[size];
  let tone: string = habitColor(color).accent;
  if (kind === undefined) tone = "text-ink/35";
  else if (kind === "skipped") tone = "text-muted";

  return (
    <span
      aria-hidden="true"
      className={clsx(
        "relative inline-flex shrink-0 items-center justify-center",
        sizes.mark,
        tone,
      )}
    >
      <svg viewBox="0 0 36 36" className="absolute inset-0 size-full">
        {kind === "full" ? (
          <circle cx="18" cy="18" r="18" fill="currentColor" />
        ) : (
          <circle
            cx="18"
            cy="18"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            strokeDasharray={kind === "skipped" ? "4 3.4" : undefined}
          />
        )}
        {kind === "minimum" && <path d={LEFT_HALF} fill="currentColor" />}
      </svg>
      {kind === "full" && (
        <Check className={clsx("relative text-on-habit", sizes.check)} strokeWidth={3.5} />
      )}
      {kind === "skipped" && <Minus className={clsx("relative", sizes.minus)} strokeWidth={3} />}
    </span>
  );
}
