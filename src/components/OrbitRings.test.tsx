import { render, waitFor } from "@testing-library/react";
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

    const counts = [...container.querySelectorAll("path[data-ticks]")].map((path) =>
      Number(path.getAttribute("data-ticks")),
    );
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(90);
  });

  it("lights the ticks up to the progress once it has appeared", async () => {
    const { container, rerender } = render(<OrbitRings rings={rings} progress={0.5} />);
    const reveal = () => container.querySelector("mask circle[data-lit]");

    // Starts dark so the ticks sweep on.
    expect(reveal()).toHaveAttribute("data-lit", "0");
    await waitFor(() => {
      expect(reveal()).toHaveAttribute("data-lit", "0.5");
    });

    rerender(<OrbitRings rings={rings} progress={0.25} />);
    expect(reveal()).toHaveAttribute("data-lit", "0.25");
    expect(container.querySelector("g[mask]")).toHaveAttribute(
      "mask",
      `url(#${String(reveal()?.closest("mask")?.id)})`,
    );
  });

  it("glides arcs to their length with CSS, starting empty", async () => {
    const { container } = render(<OrbitRings rings={rings} />);
    const done = container.querySelectorAll("g[data-ring-fill]")[1];
    const head = () => done?.querySelector<SVGGElement>("g.orbit-glide")?.style.transform;

    expect(head()).toBe("rotate(-90deg)");
    await waitFor(() => {
      expect(head()).toBe("rotate(270deg)");
    });
  });

  it("uses no SVG filters, which are slow to repaint on phones", () => {
    const { container } = render(<OrbitRings rings={rings} progress={1} />);

    expect(container.querySelector("filter, [filter]")).toBeNull();
  });

  it("shows its children in the middle and hides the drawing from screen readers", () => {
    const { container, getByText } = render(
      <OrbitRings rings={rings}>
        <span>1/4</span>
      </OrbitRings>,
    );

    expect(getByText("1/4")).toBeInTheDocument();
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("still draws an empty orbit when nothing is due", () => {
    const { container } = render(<OrbitRings rings={[]} />);

    expect(container.querySelectorAll("g[data-ring-fill]")).toHaveLength(0);
    expect(container.querySelector('circle[fill="none"]')).toBeInTheDocument();
  });
});
