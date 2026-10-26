import type { ReactNode } from "react";
import type { CompletionKind } from "../domain/habit";
import { habitColor } from "./habitColors";
import { getArcEnd, getOrbitGeometry, getRingFill, ORBIT_CENTER } from "./orbitGeometry";

export type OrbitRing = {
  id: string;
  /** A habit colour key. */
  color: string;
  /** Today's completion for the habit, if any. */
  kind: CompletionKind | undefined;
};

type OrbitRingsProps = {
  rings: readonly OrbitRing[];
  /** Shown in the middle of the rings. */
  children?: ReactNode;
};

const center = { cx: ORBIT_CENTER, cy: ORBIT_CENTER };

/**
 * One concentric ring per habit, outermost first. A done habit's arc runs a whole
 * lap (the minimum version half a lap) with a white "planet" where it ends; an open
 * habit shows a dot in its colour at the top. Decorative; give the surrounding
 * element the accessible progress semantics.
 */
export function OrbitRings({ rings, children }: OrbitRingsProps) {
  const { radius, stroke } = getOrbitGeometry(rings.length);

  return (
    <div className="relative mx-auto aspect-square w-66 max-w-full">
      <svg viewBox="0 0 100 100" className="size-full" aria-hidden="true">
        {rings.length === 0 && (
          <circle
            {...center}
            r={radius(0)}
            fill="none"
            strokeWidth={stroke}
            className="stroke-ink/10"
          />
        )}
        {rings.map(({ id, color, kind }, index) => {
          const r = radius(index);
          const circumference = 2 * Math.PI * r;
          const fill = getRingFill(kind);
          const { value } = habitColor(color);
          const end = getArcEnd(r, fill);
          return (
            <g key={id}>
              <circle
                {...center}
                r={r}
                fill="none"
                strokeWidth={stroke}
                strokeDasharray={
                  kind === "skipped" ? `${String(stroke)} ${String(stroke)}` : undefined
                }
                className="stroke-ink/10"
              />
              {fill > 0 ? (
                <>
                  <circle
                    data-ring-fill={fill}
                    {...center}
                    r={r}
                    fill="none"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - fill)}
                    transform={`rotate(-90 ${String(ORBIT_CENTER)} ${String(ORBIT_CENTER)})`}
                    style={{ stroke: value }}
                    className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500"
                  />
                  <circle cx={end.x} cy={end.y} r={stroke * 0.7} className="fill-white" />
                </>
              ) : (
                kind !== "skipped" && (
                  <circle cx={end.x} cy={end.y} r={stroke / 2} style={{ fill: value }} />
                )
              )}
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
