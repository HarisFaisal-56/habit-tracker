import { describe, expect, it } from "vitest";
import {
  DUST,
  getOrbitGeometry,
  getRingFill,
  getTickPaths,
  getTicks,
  TICK_COUNT,
  TICK_MASK,
} from "./orbitGeometry";

describe("getOrbitGeometry", () => {
  it("steps rings inwards, outermost first", () => {
    const { radius } = getOrbitGeometry(3);
    expect(radius(0)).toBeGreaterThan(radius(1));
    expect(radius(1)).toBeGreaterThan(radius(2));
  });

  it("keeps the same spacing for a handful of rings", () => {
    const five = getOrbitGeometry(5);
    const three = getOrbitGeometry(3);
    expect(five.radius(0) - five.radius(1)).toBeCloseTo(three.radius(0) - three.radius(1));
  });

  it("tightens the spacing but leaves room in the middle when there are many rings", () => {
    const { radius, stroke } = getOrbitGeometry(14);
    expect(radius(13)).toBeGreaterThanOrEqual(16);
    expect(radius(0) - radius(1)).toBeGreaterThan(stroke);
  });
});

describe("getRingFill", () => {
  it("draws a full lap, half a lap or nothing", () => {
    expect(getRingFill("full")).toBe(1);
    expect(getRingFill("minimum")).toBe(0.5);
    expect(getRingFill("skipped")).toBe(0);
    expect(getRingFill(undefined)).toBe(0);
  });
});

describe("getTickPaths", () => {
  const segments = (path: string) => path.match(/M/g)?.length ?? 0;

  it("draws every tick once, split into 6 major and 84 minor", () => {
    const paths = getTickPaths();
    expect(segments(paths.all)).toBe(TICK_COUNT);
    expect([segments(paths.major), paths.majorCount]).toEqual([6, 6]);
    expect([segments(paths.minor), paths.minorCount]).toEqual([84, 84]);
  });

  it("starts with the 12 o'clock tick, drawn from the inside out", () => {
    expect(getTickPaths().all.startsWith("M50.000 -0.600L50.000 -3.200")).toBe(true);
  });
});

describe("TICK_MASK", () => {
  it("covers every tick and its glow", () => {
    const inner = TICK_MASK.radius - TICK_MASK.width / 2;
    const outer = TICK_MASK.radius + TICK_MASK.width / 2;
    expect(inner).toBeLessThanOrEqual(50.6 - 0.75);
    expect(outer).toBeGreaterThanOrEqual(53.2 + 0.75);
    expect(TICK_MASK.lap).toBeCloseTo(2 * Math.PI * TICK_MASK.radius);
  });
});

describe("getTicks", () => {
  it("lights ticks clockwise up to the progress", () => {
    expect(getTicks(0).filter((tick) => tick.lit)).toHaveLength(0);
    expect(getTicks(0.5).filter((tick) => tick.lit)).toHaveLength(TICK_COUNT / 2);
    expect(getTicks(1).every((tick) => tick.lit)).toBe(true);
  });

  it("makes every 15th tick a longer major tick", () => {
    const ticks = getTicks(0);
    expect(ticks.filter((tick) => tick.major)).toHaveLength(6);
    const [first] = ticks;
    expect(first?.major).toBe(true);
    expect(first?.y1).toBeGreaterThan(first?.y2 ?? 0);
  });
});

describe("DUST", () => {
  it("is the same every time and stays inside the rings", () => {
    expect(DUST).toHaveLength(28);
    for (const { x, y } of DUST) {
      expect(Math.hypot(x - 50, y - 50)).toBeLessThanOrEqual(50);
    }
  });
});
