import { describe, expect, it } from "vitest";
import { getArcEnd, getOrbitGeometry, getRingFill } from "./orbitGeometry";

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
