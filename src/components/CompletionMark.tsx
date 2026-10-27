import clsx from "clsx";
import { useId } from "react";
import type { CompletionKind } from "../domain/habit";
import { habitColor, tint } from "./habitColors";

const SIZES = {
  md: "size-7.5",
  sm: "size-5",
} as const;

// Drawn in a 36 x 36 box: a ring with its outer edge on the box.
const STROKE = 2;
const R = 18 - STROKE / 2;
const LEFT_HALF = `M18 ${String(18 - R)} A${String(R)} ${String(R)} 0 0 0 18 ${String(18 + R)} Z`;

type CompletionMarkProps = {
  kind: CompletionKind | undefined;
  color: string;
  size?: keyof typeof SIZES;
};

/**
 * The check circle on a habit: a faint empty ring; a glossy disc in the habit's
 * colour with a dark check (done); the left half filled (minimum version); or a
 * dashed ring with a bar (skipped). Pops in when it changes. Decorative; callers
 * describe the state in text.
 */
export function CompletionMark({ kind, color, size = "md" }: CompletionMarkProps) {
  const sheenId = useId();
  const { value } = habitColor(color);
  let tone = value;
  if (kind === undefined) tone = "color-mix(in oklab, var(--color-ink) 30%, transparent)";
  else if (kind === "skipped") tone = "var(--color-muted)";

  let filter: string | undefined;
  if (kind === "full") filter = `drop-shadow(0 0 9px ${tint(value, 0.55)})`;
  else if (kind === "minimum") filter = `drop-shadow(0 0 6px ${tint(value, 0.35)})`;

  return (
    <svg
      // A new element for each state, so the pop plays on every change.
      key={kind ?? "none"}
      aria-hidden="true"
      viewBox="0 0 36 36"
      className={clsx("block shrink-0 overflow-visible", SIZES[size], kind && "animate-pop")}
      style={{ color: tone, filter }}
    >
      {kind === "full" ? (
        <>
          <defs>
            <radialGradient id={sheenId} cx="35%" cy="30%" r="75%">
              <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="18" cy="18" r="18" fill="currentColor" />
          <circle cx="18" cy="18" r="18" fill={`url(#${sheenId})`} />
          <path
            d="M24.5 13.2 15.6 22.1 11.5 18"
            fill="none"
            strokeWidth="2.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-on-habit"
          />
        </>
      ) : (
        <circle
          cx="18"
          cy="18"
          r={R}
          fill={
            kind === undefined ? "color-mix(in oklab, var(--color-ink) 2%, transparent)" : "none"
          }
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeDasharray={kind === "skipped" ? "4 3.4" : undefined}
        />
      )}
      {kind === "minimum" && <path d={LEFT_HALF} fill="currentColor" />}
      {kind === "skipped" && (
        <path d="M12.4 18h11.3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      )}
    </svg>
  );
}
