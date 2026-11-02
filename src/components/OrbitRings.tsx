import { useId, type CSSProperties, type ReactNode } from "react";
import type { CompletionKind } from "../domain/habit";
import { habitColor } from "./habitColors";
import {
  DUST,
  getOrbitGeometry,
  getRingFill,
  getTickPaths,
  ORBIT_CENTER,
  TAIL_SEGMENTS,
  TICK_COUNT,
  TICK_MASK,
} from "./orbitGeometry";
import { useEntered } from "./useEntered";

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

const VIEW_BOX = "-8 -8 116 116";
const TRACK = "color-mix(in oklab, var(--color-ink) 7.5%, transparent)";
// Rings are drawn round (0, 0) inside this, so a CSS rotation turns them about
// their centre in every browser, with no transform-origin quirks.
const AT_CENTER = `translate(${String(ORBIT_CENTER)} ${String(ORBIT_CENTER)})`;
const TICK_PATHS = getTickPaths();
/** Widths of the glow bands round a done arc, as multiples of its stroke. */
const GLOW_BANDS = [1.5, 2.1, 2.8];

/**
 * One concentric ring per habit, outermost first, inside a ring of ticks. A done
 * habit's arc runs a whole lap (the minimum version half a lap) as a glowing comet
 * with a white planet at its head; an open habit shows a dot in its colour at the
 * top. Arcs glide to their new length. Decorative; give the surrounding element
 * the accessible progress semantics.
 *
 * Performance: everything that moves is a CSS transition or animation, so React
 * renders once per change rather than every frame, and nothing uses SVG filters
 * (blur is slow to repaint on phones). Glows are wider, fainter strokes instead.
 */
export function OrbitRings({ rings, progress = 0, children }: OrbitRingsProps) {
  const { radius, stroke } = getOrbitGeometry(rings.length);
  const ids = useId();
  const entered = useEntered();
  const halo = `${ids}-halo`;
  const core = `${ids}-core`;

  return (
    <div className="relative mx-auto aspect-square w-80 max-w-full">
      {/* Its own layer, so the slow drift is a GPU rotation with no repainting. */}
      <div aria-hidden="true" className="absolute inset-0 animate-dust">
        <svg viewBox={VIEW_BOX} aria-hidden="true" className="size-full overflow-visible fill-ink">
          {DUST.map(({ x, y, r, opacity }, index) => (
            <circle key={index} cx={x} cy={y} r={r} opacity={opacity} />
          ))}
        </svg>
      </div>

      <svg viewBox={VIEW_BOX} className="relative size-full overflow-visible" aria-hidden="true">
        <defs>
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

        <Ticks progress={entered ? progress : 0} ids={ids} core={`url(#${core})`} />

        <g transform={AT_CENTER}>
          {rings.length === 0 && (
            <circle r={radius(0)} fill="none" strokeWidth={stroke} stroke={TRACK} />
          )}
          {rings.map((ring, index) => (
            <Ring
              key={ring.id}
              {...ring}
              r={radius(index)}
              stroke={stroke}
              halo={`url(#${halo})`}
              entered={entered}
            />
          ))}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/**
 * The glow in the middle and the ticks round the outside, lit clockwise up to
 * `progress`. Each set of ticks is a single path; the lit ones are revealed by a
 * masking arc that glides like the rings, so a change repaints a handful of
 * shapes rather than fading 90 ticks one by one.
 */
function Ticks({ progress, ids, core }: { progress: number; ids: string; core: string }) {
  const lit = `${ids}-lit`;
  // Starts half a tick early, so the 12 o'clock tick lights whole and a tick
  // exactly at the progress (e.g. 3 of 6 done) stays dark, as getTicks has it.
  const lead = 180 / TICK_COUNT;

  return (
    <>
      <circle
        cx={ORBIT_CENTER}
        cy={ORBIT_CENTER}
        r={24}
        fill={core}
        className="orbit-glide"
        style={{ fillOpacity: 0.25 + 0.75 * progress }}
      />
      <g fill="none" strokeLinecap="round" strokeWidth={0.4}>
        <path
          data-ticks={TICK_PATHS.minorCount}
          d={TICK_PATHS.minor}
          stroke="color-mix(in oklab, var(--color-ink) 9%, transparent)"
        />
        <path
          data-ticks={TICK_PATHS.majorCount}
          d={TICK_PATHS.major}
          stroke="color-mix(in oklab, var(--color-ink) 30%, transparent)"
        />
      </g>
      <mask id={lit} maskUnits="userSpaceOnUse" x="-8" y="-8" width="116" height="116">
        <circle
          data-lit={progress}
          cx={ORBIT_CENTER}
          cy={ORBIT_CENTER}
          r={TICK_MASK.radius}
          fill="none"
          stroke="#fff"
          strokeWidth={TICK_MASK.width}
          strokeDasharray={`${String(TICK_MASK.lap)} ${String(TICK_MASK.lap)}`}
          transform={`rotate(${String(-90 - lead)} ${String(ORBIT_CENTER)} ${String(ORBIT_CENTER)})`}
          className="orbit-glide"
          style={{ strokeDashoffset: (1 - progress) * TICK_MASK.lap }}
        />
      </mask>
      {/* Lit ticks: a faint wide stroke for the glow, then the bright tick. */}
      <g mask={`url(#${lit})`} fill="none" strokeLinecap="round" stroke="var(--color-accent-mark)">
        <path d={TICK_PATHS.all} strokeWidth={1.2} strokeOpacity={0.14} />
        <path d={TICK_PATHS.all} strokeWidth={0.55} />
      </g>
    </>
  );
}

type RingProps = OrbitRing & { r: number; stroke: number; halo: string; entered: boolean };

function Ring({ color, kind, r, stroke, halo, entered }: RingProps) {
  const target = getRingFill(kind);
  const fill = entered ? target : 0;
  const { value } = habitColor(color);

  // Every arc ends at the circle's path end, which the rotation below keeps at
  // the head; the dash offset alone sets how far back round the arc reaches.
  const lap = 2 * Math.PI * r;
  const arc = (share: number): CSSProperties => ({ strokeDashoffset: (share - 1) * lap });
  // fill-opacity rather than opacity: it's a plain paint change, where opacity
  // would give each circle its own compositing step.
  const show = (visible: boolean, opacity = 1): CSSProperties => ({
    fillOpacity: visible ? opacity : 0,
  });
  const planet = target > 0;
  const openDot = target === 0 && kind !== "skipped";

  return (
    <g data-ring-fill={target}>
      <circle
        r={r}
        fill="none"
        strokeWidth={stroke}
        stroke={TRACK}
        strokeDasharray={kind === "skipped" ? `${String(stroke)} ${String(stroke)}` : undefined}
      />
      <g className="orbit-glide" style={{ transform: `rotate(${String(fill * 360 - 90)}deg)` }}>
        <g fill="none" stroke={value} strokeDasharray={`${String(lap)} ${String(lap)}`}>
          {/* The glow: the whole comet again in faint, widening bands, which
              stack into a soft edge like a blur. */}
          {GLOW_BANDS.map((width) => (
            <circle
              key={width}
              r={r}
              strokeWidth={stroke * width}
              strokeOpacity={0.045}
              className="orbit-glide"
              style={arc(fill)}
            />
          ))}
          {TAIL_SEGMENTS.map(({ from, opacity }) => (
            <circle
              key={from}
              r={r}
              strokeWidth={stroke}
              strokeOpacity={opacity}
              className="orbit-glide"
              style={arc((1 - from) * fill)}
            />
          ))}
        </g>
        {/* The head, at angle 0 before rotating: a dot in the habit's colour
            with a soft glow, and once done, a white planet with a halo. */}
        <g className="[&>circle]:transition-[fill-opacity] [&>circle]:duration-300">
          <circle cx={r} r={stroke * 0.8} fill={value} style={show(planet || openDot, 0.3)} />
          <circle cx={r} r={stroke / 2} fill={value} style={show(planet || openDot)} />
          <circle cx={r} r={stroke * 2.1} fill={halo} style={show(planet, 0.55)} />
          <circle cx={r} r={stroke * 0.68} fill="#fff" style={show(planet)} />
        </g>
      </g>
    </g>
  );
}
