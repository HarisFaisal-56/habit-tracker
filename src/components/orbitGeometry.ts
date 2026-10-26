import type { CompletionKind } from "../domain/habit";

/** The rings are drawn in a 100 x 100 box centred on (50, 50). */
export const ORBIT_CENTER = 50;
// Measured from design/today.png: five rings, 15px apart, 6.5px thick, in a 264px box.
const OUTER_RADIUS = 48.1;
const MAX_STEP = 5.7;
const STROKE_PER_STEP = 0.43;
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

/** Where an arc that starts at 12 o'clock and runs clockwise for `fill` of a lap ends. */
export function getArcEnd(radius: number, fill: number): { x: number; y: number } {
  const angle = fill * 2 * Math.PI;
  return {
    x: ORBIT_CENTER + radius * Math.sin(angle),
    y: ORBIT_CENTER - radius * Math.cos(angle),
  };
}
