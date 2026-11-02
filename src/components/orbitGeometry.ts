import type { CompletionKind } from "../domain/habit";

/** The rings are drawn in a 100 x 100 box centred on (50, 50), with room around it for the ticks. */
export const ORBIT_CENTER = 50;
// From design/orbit-upgrade/OrbitApp2.dc.html (ringsSvg): five rings 5.7 apart in a 320px box.
const OUTER_RADIUS = 47.5;
const MAX_STEP = 5.7;
const STROKE_PER_STEP = 0.46;
/** Rings stop shrinking inwards here, leaving room for the count in the middle. */
const MIN_INNER_RADIUS = 24;
const MIN_STEP = 1.6;

export type OrbitGeometry = {
  /** Radius of ring `index`, outermost (0) first. */
  radius: (index: number) => number;
  stroke: number;
};

/** Evenly spaced concentric rings; the spacing (and stroke) tightens as habits are added. */
export function getOrbitGeometry(count: number): OrbitGeometry {
  const fit = count > 1 ? (OUTER_RADIUS - MIN_INNER_RADIUS) / (count - 1) : MAX_STEP;
  const step = Math.max(MIN_STEP, Math.min(MAX_STEP, fit));
  return {
    radius: (index) => OUTER_RADIUS - index * step,
    stroke: step * STROKE_PER_STEP,
  };
}

/** How much of a habit's ring is drawn: full is a whole lap, the minimum version half. */
export function getRingFill(kind: CompletionKind | undefined): number {
  if (kind === "full") return 1;
  if (kind === "minimum") return 0.5;
  return 0;
}

type Point = { x: number; y: number };

/** The point `angle` radians clockwise from 12 o'clock on a circle of `radius`. */
function pointAt(radius: number, angle: number): Point {
  return {
    x: ORBIT_CENTER + radius * Math.sin(angle),
    y: ORBIT_CENTER - radius * Math.cos(angle),
  };
}

/**
 * A done ring is drawn as overlapping arcs that all end at the head, each starting
 * further round: a comet's tail, brightest at the head. `from` is a share of the arc.
 */
export const TAIL_SEGMENTS: readonly { from: number; opacity: number }[] = [
  { from: 0, opacity: 0.3 },
  { from: 0.25, opacity: 0.2 },
  { from: 0.5, opacity: 0.2 },
  { from: 0.7, opacity: 0.25 },
  { from: 0.85, opacity: 0.35 },
];

export const TICK_COUNT = 90;

export type Tick = Record<"x1" | "y1" | "x2" | "y2", number> & {
  /** Every 15th tick is longer, like the hours on a watch. */
  major: boolean;
  /** Lit ticks show how much of the day is done. */
  lit: boolean;
};

/** The ring of ticks around the outside, lit clockwise from 12 o'clock up to `progress` (0 to 1). */
export function getTicks(progress: number): Tick[] {
  return Array.from({ length: TICK_COUNT }, (_, index) => {
    const angle = (index / TICK_COUNT) * 2 * Math.PI;
    const major = index % 15 === 0;
    const inner = pointAt(major ? 50.6 : 51.8, angle);
    const outer = pointAt(53.2, angle);
    return {
      x1: inner.x,
      y1: inner.y,
      x2: outer.x,
      y2: outer.y,
      major,
      lit: index / TICK_COUNT < progress - 0.0001,
    };
  });
}

export type TickPaths = {
  /** Every tick, for the lit layer. */
  all: string;
  major: string;
  minor: string;
  majorCount: number;
  minorCount: number;
};

/** The ticks as SVG path data, one `M…L…` segment per tick: all of them, and split by size. */
export function getTickPaths(): TickPaths {
  const all: string[] = [];
  const major: string[] = [];
  const minor: string[] = [];
  for (const tick of getTicks(0)) {
    const segment = `M${tick.x1.toFixed(3)} ${tick.y1.toFixed(3)}L${tick.x2.toFixed(3)} ${tick.y2.toFixed(3)}`;
    all.push(segment);
    (tick.major ? major : minor).push(segment);
  }
  return {
    all: all.join(""),
    major: major.join(""),
    minor: minor.join(""),
    majorCount: major.length,
    minorCount: minor.length,
  };
}

/**
 * The band lit ticks are revealed through: centred on the ticks and wide enough
 * for a major tick plus its glow (radius 50.6 to 53.2, and 0.75 more each side).
 */
export const TICK_MASK = { radius: 51.9, width: 5, lap: 2 * Math.PI * 51.9 } as const;

/** A repeatable pseudo-random number from 0 to 1, so the dust is the same on every render. */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Specks of dust drifting slowly around the middle of the rings. */
export const DUST: readonly (Point & { r: number; opacity: number })[] = Array.from(
  { length: 28 },
  (_, index) => ({
    ...pointAt(20 + noise(index * 3.1) * 30, noise(index * 7.7) * Math.PI * 2),
    r: 0.15 + noise(index * 1.9) * 0.35,
    opacity: 0.15 + noise(index * 5.3) * 0.4,
  }),
);
