import type { ReactNode } from "react";

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type ProgressRingProps = {
  /** 0 to 1; values outside are clamped. */
  value: number;
  /** Shown in the middle of the ring. */
  children?: ReactNode;
};

/** A decorative ring; give the surrounding element the accessible progress semantics. */
export function ProgressRing({ value, children }: ProgressRingProps) {
  const progress = Math.min(1, Math.max(0, value));
  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth="10"
          className="stroke-stone-200 dark:stroke-stone-800"
        />
        {progress > 0 && (
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            className="stroke-emerald-600 motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500 dark:stroke-emerald-500"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
