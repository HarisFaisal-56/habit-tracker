import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrbitRings, type OrbitRing } from "./OrbitRings";

const rings: OrbitRing[] = [
  { id: "a", color: "orange", kind: "minimum" },
  { id: "b", color: "violet", kind: "full" },
  { id: "c", color: "sky", kind: undefined },
  { id: "d", color: "teal", kind: "skipped" },
];

describe("OrbitRings", () => {
  it("draws a track per habit and an arc only for done ones", () => {
    const { container } = render(<OrbitRings rings={rings} />);

    expect(container.querySelectorAll("g")).toHaveLength(4);
    const arcs = [...container.querySelectorAll("circle[data-ring-fill]")];
    expect(arcs.map((arc) => arc.getAttribute("data-ring-fill"))).toEqual(["0.5", "1"]);
  });

  it("leaves half of the minimum version's ring undrawn", () => {
    const { container } = render(<OrbitRings rings={[rings[0] as OrbitRing]} />);

    const arc = container.querySelector("circle[data-ring-fill]");
    const circumference = Number(arc?.getAttribute("stroke-dasharray"));
    expect(Number(arc?.getAttribute("stroke-dashoffset"))).toBeCloseTo(circumference / 2);
  });

  it("shows its children in the middle and hides the drawing from screen readers", () => {
    const { container, getByText } = render(
      <OrbitRings rings={rings}>
        <span>1/4</span>
      </OrbitRings>,
    );

    expect(getByText("1/4")).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("still draws an empty orbit when nothing is due", () => {
    const { container } = render(<OrbitRings rings={[]} />);

    expect(container.querySelectorAll("circle")).toHaveLength(1);
  });
});
