import { describe, expect, it } from "vitest";
import {
  DUST,
  getArcEnd,
  getArcPath,
  getOrbitGeometry,
  getRingFill,
  getTicks,
  TICK_COUNT,
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

describe("getArcEnd", () => {
  it("ends a full lap and an empty arc at 12 o'clock, and half a lap at 6", () => {
    for (const fill of [0, 1]) {
      const end = getArcEnd(40, fill);
      expect(end.x).toBeCloseTo(50);
      expect(end.y).toBeCloseTo(10);
    }
    const half = getArcEnd(40, 0.5);
    expect(half.x).toBeCloseTo(50);
    expect(half.y).toBeCloseTo(90);
  });

  it("runs clockwise", () => {
    const quarter = getArcEnd(40, 0.25);
    expect(quarter.x).toBeCloseTo(90);
    expect(quarter.y).toBeCloseTo(50);
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

describe("getArcPath", () => {
  it("draws a short arc as one clockwise segment from 12 o'clock", () => {
    expect(getArcPath(40, 0, Math.PI / 2)).toBe("M50.000 10.000 A40 40 0 0 1 90.000 50.000");
  });

  it("splits an arc of more than half a lap in two", () => {
    const path = getArcPath(40, 0, 2 * Math.PI);
    expect(path.match(/A/g)).toHaveLength(2);
    expect(path).toContain("A40 40 0 0 1 50.000 90.000");
    expect(path.endsWith("50.000 10.000")).toBe(true);
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
