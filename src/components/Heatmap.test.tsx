import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildHeatmap } from "../features/history/historyData";
import { makeHabit, makeIndex } from "../test/factories";
import { Heatmap, HeatmapLegend } from "./Heatmap";

describe("Heatmap", () => {
  const habit = makeHabit({
    createdAt: "2025-01-02",
    schedule: { type: "weekly", timesPerWeek: 2 },
  });
  const data = buildHeatmap(habit, makeIndex(habit, { "2025-01-06": "full" }), "2025-01-08");

  function renderHeatmap() {
    const { container } = render(
      <Heatmap
        weeks={data.weeks}
        monthLabels={data.monthLabels}
        color={habit.color}
        schedule={habit.schedule}
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

  it("describes each day in a tooltip", () => {
    const container = renderHeatmap();
    const titles = [...container.querySelectorAll("title")].map((title) => title.textContent);

    expect(titles).toContain("Mon 6 Jan 2025: Done");
    expect(titles).toContain("Tue 7 Jan 2025: Not logged"); // weekly goals have no fixed days
  });

  it("labels months and weekdays", () => {
    const container = renderHeatmap();
    const labels = [...container.querySelectorAll("text")].map((text) => text.textContent);

    expect(labels).toEqual(expect.arrayContaining(["Jan", "Feb", "Mon", "Wed", "Fri"]));
  });

  it("is keyboard scrollable", () => {
    renderHeatmap();
    expect(screen.getByRole("group", { name: "Last 12 months" })).toHaveAttribute("tabindex", "0");
  });
});

describe("HeatmapLegend", () => {
  it("names every kind of day", () => {
    render(<HeatmapLegend />);
    const items = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(items).toEqual(["Done", "Minimum", "Skipped", "Missed", "Not scheduled"]);
  });
});
