import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildHeatmap } from "../features/history/historyData";
import { makeHabit, makeIndex } from "../test/factories";
import { Heatmap } from "./Heatmap";

describe("Heatmap", () => {
  const habit = makeHabit({
    createdAt: "2025-01-02",
    schedule: { type: "weekly", timesPerWeek: 2 },
  });
  const data = buildHeatmap(
    habit,
    makeIndex(habit, { "2025-01-06": "full", "2025-01-07": "minimum" }),
    "2025-01-08",
  );

  function renderHeatmap() {
    const { container } = render(
      <Heatmap
        weeks={data.weeks}
        monthLabels={data.monthLabels}
        color={habit.color}
        label="Read, last 12 months"
      />,
    );
    return container;
  }

  it("draws only days since the habit started, up to today", () => {
    const container = renderHeatmap();

    // 2 to 8 January.
    expect(container.querySelectorAll("circle")).toHaveLength(7);
    expect(screen.getByRole("img", { name: "Read, last 12 months" })).toBeInTheDocument();
  });

  it("makes done days brighter than minimum days, and leaves empty days neutral", () => {
    const container = renderHeatmap();
    const cell = (date: string) =>
      container.querySelector<SVGCircleElement>(`circle[data-date="${date}"]`);

    expect(cell("2025-01-06")?.style.fillOpacity).toBe("1");
    expect(Number(cell("2025-01-07")?.style.fillOpacity)).toBeLessThan(1);
    expect(cell("2025-01-08")).toHaveClass("fill-ink/6");
  });

  it("shows the day under the pointer in a tooltip", () => {
    renderHeatmap();
    const svg = screen.getByRole("img", { name: "Read, last 12 months" });
    const columns = data.weeks.length;
    // Lay the grid out at one pixel per unit: 6.6 per column, less the last gap.
    svg.getBoundingClientRect = () => new DOMRect(0, 0, columns * 6.6 - 1.4, 7 * 6.6 - 1.4);

    // Monday 6 January is the first day of the last column.
    fireEvent.pointerMove(svg, { clientX: (columns - 1) * 6.6 + 2, clientY: 2 });
    expect(screen.getByTestId("heatmap-tooltip")).toHaveTextContent("Mon 6 JanDone");

    // Friday 3 January: weekly goals have no fixed days.
    fireEvent.pointerMove(svg, { clientX: (columns - 2) * 6.6 + 2, clientY: 4 * 6.6 + 2 });
    expect(screen.getByTestId("heatmap-tooltip")).toHaveTextContent("Fri 3 JanNot logged");

    fireEvent.pointerLeave(svg);
    expect(screen.queryByTestId("heatmap-tooltip")).not.toBeInTheDocument();
  });

  it("labels every other month under the grid", () => {
    const container = renderHeatmap();
    const labels = [...container.querySelectorAll("span")].map((span) => span.textContent);

    // The window runs Feb ... Jan: every other month, but none crowding the current one.
    expect(labels).toEqual(["Feb", "Apr", "Jun", "Aug", "Oct", "Jan"]);
  });

  it("scales to fit rather than scrolling", () => {
    renderHeatmap();
    const svg = screen.getByRole("img", { name: "Read, last 12 months" });

    expect(svg).toHaveClass("w-full");
    expect(svg.getAttribute("viewBox")).toMatch(/^0 0 [\d.]+ [\d.]+$/);
  });
});
