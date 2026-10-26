import { render, screen } from "@testing-library/react";
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
    expect(container.querySelectorAll("rect")).toHaveLength(7);
    expect(screen.getByRole("img", { name: "Read, last 12 months" })).toBeInTheDocument();
  });

  it("makes done days brighter than minimum days, and leaves empty days neutral", () => {
    const container = renderHeatmap();
    const cell = (title: string) =>
      [...container.querySelectorAll("rect")].find((rect) =>
        rect.querySelector("title")?.textContent.startsWith(title),
      );

    expect(cell("Mon 6 Jan")?.style.fillOpacity).toBe("1");
    expect(Number(cell("Tue 7 Jan")?.style.fillOpacity)).toBeLessThan(1);
    expect(cell("Wed 8 Jan")).toHaveClass("fill-ink/8");
  });

  it("describes each day in a tooltip", () => {
    const container = renderHeatmap();
    const titles = [...container.querySelectorAll("title")].map((title) => title.textContent);

    expect(titles).toContain("Mon 6 Jan 2025: Done");
    expect(titles).toContain("Fri 3 Jan 2025: Not logged"); // weekly goals have no fixed days
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
