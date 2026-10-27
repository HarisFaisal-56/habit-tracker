import { useId, type ReactNode } from "react";
import type { CompletionKind } from "../domain/habit";
import { habitColor } from "./habitColors";
import {
  DUST,
  getArcEnd,
  getArcPath,
  getOrbitGeometry,
  getRingFill,
  getTicks,
  ORBIT_CENTER,
  TAIL_SEGMENTS,
} from "./orbitGeometry";
import { useReducedMotion } from "./useReducedMotion";
import { useTween } from "./useTween";

export type OrbitRing = {
  id: string;
  /** A habit colour key. */
  color: string;
  /** Today's completion for the habit, if any. */
  kind: CompletionKind | undefined;
};

type OrbitRingsProps = {
  rings: readonly OrbitRing[];
  /** How much of the day is done, 0 to 1: lights the ticks round the outside. */
  progress?: number;
  /** Shown in the middle of the rings. */
  children?: ReactNode;
};

const center = { cx: ORBIT_CENTER, cy: ORBIT_CENTER };
const TRACK = "color-mix(in oklab, var(--color-ink) 7.5%, transparent)";
const ORBIT_ORIGIN = `${String(ORBIT_CENTER)} ${String(ORBIT_CENTER)}`;

/**
 * One concentric ring per habit, outermost first, inside a ring of ticks. A done
 * habit's arc runs a whole lap (the minimum version half a lap) as a glowing comet
 * with a white planet at its head; an open habit shows a dot in its colour at the
 * top. Arcs glide to their new length. Decorative; give the surrounding element
 * the accessible progress semantics.
 */
export function OrbitRings({ rings, progress = 0, children }: OrbitRingsProps) {
  const { radius, stroke } = getOrbitGeometry(rings.length);
  const ids = useId();
  const reduced = useReducedMotion();
  const shownProgress = useTween(progress, 0);
  const glow = `${ids}-glow`;
  const halo = `${ids}-halo`;
  const core = `${ids}-core`;

  return (
    <div className="relative mx-auto aspect-square w-80 max-w-full">
      <svg viewBox="-8 -8 116 116" className="size-full overflow-visible" aria-hidden="true">
        <defs>
          <filter id={glow} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id={core}>
            <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={halo}>
            <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="0.35" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle {...center} r={24} fill={`url(#${core})`} opacity={0.25 + 0.75 * shownProgress} />

        {getTicks(shownProgress).map(({ major, lit, ...line }, index) => (
          <line
            key={index}
            {...line}
            strokeWidth={lit ? 0.55 : 0.4}
            strokeLinecap="round"
            stroke={
              lit
                ? "var(--color-accent-mark)"
                : `color-mix(in oklab, var(--color-ink) ${major ? "30%" : "9%"}, transparent)`
            }
            filter={lit ? `url(#${glow})` : undefined}
          />
        ))}

        <g className="fill-ink">
          {DUST.map(({ x, y, r, opacity }, index) => (
            <circle key={index} cx={x} cy={y} r={r} opacity={opacity} />
          ))}
          {!reduced && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${ORBIT_ORIGIN}`}
              to={`360 ${ORBIT_ORIGIN}`}
              dur="140s"
              repeatCount="indefinite"
            />
          )}
        </g>

        {rings.length === 0 && (
          <circle {...center} r={radius(0)} fill="none" strokeWidth={stroke} stroke={TRACK} />
        )}
        {rings.map((ring, index) => (
          <Ring
            key={ring.id}
            {...ring}
            r={radius(index)}
            stroke={stroke}
            glow={`url(#${glow})`}
            halo={`url(#${halo})`}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

type RingProps = OrbitRing & { r: number; stroke: number; glow: string; halo: string };

function Ring({ color, kind, r, stroke, glow, halo }: RingProps) {
  const target = getRingFill(kind);
  const fill = useTween(target, 0);
  const { value } = habitColor(color);
  const total = fill * 2 * Math.PI;
  const head = getArcEnd(r, fill);

  return (
    <g data-ring-fill={target}>
      <circle
        {...center}
        r={r}
        fill="none"
        strokeWidth={stroke}
        stroke={TRACK}
        strokeDasharray={kind === "skipped" ? `${String(stroke)} ${String(stroke)}` : undefined}
      />
      {fill > 0.004 ? (
        <>
          <g filter={glow}>
            {TAIL_SEGMENTS.map(({ from, opacity }) => (
              <path
                key={from}
                d={getArcPath(r, from * total, total)}
                fill="none"
                stroke={value}
                strokeWidth={stroke}
                strokeOpacity={opacity}
              />
            ))}
            <circle cx={head.x} cy={head.y} r={stroke / 2} fill={value} />
          </g>
          <circle cx={head.x} cy={head.y} r={stroke * 2.1} fill={halo} opacity={0.55} />
          <circle cx={head.x} cy={head.y} r={stroke * 0.68} fill="#fff" />
        </>
      ) : (
        kind !== "skipped" && (
          <circle cx={head.x} cy={head.y} r={stroke / 2} fill={value} filter={glow} />
        )
      )}
    </g>
  );
}
