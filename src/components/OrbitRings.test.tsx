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
  it("draws a ring per habit, filled a lap for done and half for the minimum version", () => {
    const { container } = render(<OrbitRings rings={rings} />);

    const drawn = [...container.querySelectorAll("g[data-ring-fill]")];
    expect(drawn.map((ring) => ring.getAttribute("data-ring-fill"))).toEqual([
      "0.5",
      "1",
      "0",
      "0",
    ]);
  });

  it("dashes the track of a skipped habit", () => {
    const { container } = render(<OrbitRings rings={rings} />);

    const skipped = container.querySelectorAll("g[data-ring-fill]")[3];
    expect(skipped?.querySelector("circle")).toHaveAttribute("stroke-dasharray");
  });

  it("draws a ring of ticks round the outside", () => {
    const { container } = render(<OrbitRings rings={rings} progress={0.5} />);

    expect(container.querySelectorAll("line")).toHaveLength(90);
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

    expect(container.querySelectorAll("g[data-ring-fill]")).toHaveLength(0);
    expect(container.querySelector('circle[fill="none"]')).toBeInTheDocument();
  });
});
