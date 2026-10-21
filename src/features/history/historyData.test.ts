import { describe, expect, it } from "vitest";
import { indexCompletionsByHabit } from "../../domain/completions";
import { eachDay } from "../../domain/dates";
import { makeCompletions, makeHabit, makeIndex, on } from "../../test/factories";
import {
  buildHeatmap,
  getDayEntries,
  getMonthGrid,
  HEATMAP_WEEKS,
  summarizeDay,
} from "./historyData";

describe("getMonthGrid", () => {
  it("pads a month that starts mid-week", () => {
    // January 2025 starts on a Wednesday and ends on a Friday.
    const grid = getMonthGrid("2025-01-15");

    expect(grid).toHaveLength(5);
    expect(grid[0]).toEqual([
      null,
      null,
      "2025-01-01",
      "2025-01-02",
      "2025-01-03",
      "2025-01-04",
      "2025-01-05",
    ]);
    expect(grid[4]).toEqual([
      "2025-01-27",
      "2025-01-28",
      "2025-01-29",
      "2025-01-30",
      "2025-01-31",
      null,
      null,
    ]);
  });

  it("handles a month starting on Sunday and on Monday", () => {
    // June 2025 starts on a Sunday: six blanks first, and it spans six rows.
    const june = getMonthGrid("2025-06-01");
    expect(june[0]).toEqual([null, null, null, null, null, null, "2025-06-01"]);
    expect(june).toHaveLength(6);

    // September 2025 starts on a Monday.
    expect(getMonthGrid("2025-09-10")[0]?.[0]).toBe("2025-09-01");
  });

  it("fits a February that starts on Monday into exactly four rows", () => {
    // February 2027 has 28 days and starts on a Monday.
    const grid = getMonthGrid("2027-02-01");
    expect(grid).toHaveLength(4);
    expect(grid.flat().every((day) => day !== null)).toBe(true);
  });

  it("includes leap days", () => {
    expect(getMonthGrid("2024-02-01").flat()).toContain("2024-02-29");
  });
});

describe("summarizeDay / getDayEntries", () => {
  const today = "2025-01-08"; // Wednesday
  const habits = [
    makeHabit({ id: "read" }),
    makeHabit({ id: "run" }),
    makeHabit({ id: "mon", schedule: { type: "days", days: [1] } }),
    makeHabit({ id: "weekly", schedule: { type: "weekly", timesPerWeek: 2 } }),
    makeHabit({ id: "archived", archived: true }),
    makeHabit({ id: "new", createdAt: "2025-01-08" }),
  ];
  const byHabit = indexCompletionsByHabit([
    ...makeCompletions("read", { "2025-01-07": "full" }),
    ...makeCompletions("run", { "2025-01-07": "skipped" }),
    ...makeCompletions("weekly", { "2025-01-07": "minimum" }),
    ...makeCompletions("archived", { "2025-01-07": "full" }),
  ]);

  it("counts done habits against those that were expected", () => {
    // read done, weekly done, run skipped (neutral), mon not scheduled,
    // archived ignored, new not created yet.
    expect(summarizeDay(habits, byHabit, "2025-01-07", today)).toEqual({ done: 2, expected: 2 });
    // The 6th: read and run missed, mon missed, weekly not logged.
    expect(summarizeDay(habits, byHabit, "2025-01-06", today)).toEqual({ done: 0, expected: 3 });
  });

  it("counts habits still to do today as expected", () => {
    expect(summarizeDay(habits, byHabit, today, today)).toEqual({ done: 0, expected: 3 });
  });

  it("lists each habit that existed that day with its status", () => {
    const entries = getDayEntries(habits, byHabit, "2025-01-07", today);

    expect(entries.map((e) => [e.habit.id, e.status])).toEqual([
      ["read", "full"],
      ["run", "skipped"],
      ["mon", "off"],
      ["weekly", "minimum"],
      ["archived", "full"],
    ]);
    expect(entries[0]?.completion?.kind).toBe("full");
  });

  it("lists nothing for future days", () => {
    expect(getDayEntries(habits, byHabit, "2025-01-09", today)).toEqual([]);
  });
});

describe("buildHeatmap", () => {
  const today = "2025-01-08"; // Wednesday

  it("covers 53 weeks ending with the current week, Monday first", () => {
    const habit = makeHabit({ createdAt: "2024-01-01" });
    const { weeks } = buildHeatmap(habit, makeIndex(habit, {}), today);

    expect(weeks).toHaveLength(HEATMAP_WEEKS);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0]?.[0]?.date).toBe("2024-01-08");
    expect(weeks.at(-1)?.map((cell) => cell.date)).toEqual(eachDay("2025-01-06", "2025-01-12"));
  });

  it("marks each day with its status", () => {
    const habit = makeHabit({ createdAt: "2025-01-02" });
    const index = makeIndex(habit, {
      "2025-01-03": "full",
      "2025-01-04": "minimum",
      "2025-01-05": "skipped",
    });

    const { weeks, totals } = buildHeatmap(habit, index, today);
    const status = (date: string) => weeks.flat().find((cell) => cell.date === date)?.status;

    expect(status("2025-01-01")).toBe("inactive");
    expect(status("2025-01-02")).toBe("missed");
    expect(status("2025-01-03")).toBe("full");
    expect(status("2025-01-04")).toBe("minimum");
    expect(status("2025-01-05")).toBe("skipped");
    expect(status(today)).toBe("pending");
    expect(status("2025-01-09")).toBe("future");
    // Missed: 01-02, 01-06, 01-07.
    expect(totals).toEqual({ full: 1, minimum: 1, skipped: 1, missed: 3 });
  });

  it("labels months on the column containing their 1st", () => {
    const habit = makeHabit();
    const { weeks, monthLabels } = buildHeatmap(habit, makeIndex(habit, {}), today);

    expect(monthLabels.map((label) => label.label).join(" ")).toBe(
      "Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec Jan",
    );
    for (const { week } of monthLabels) {
      expect(weeks[week]?.some((cell) => cell.date.endsWith("-01"))).toBe(true);
    }
  });

  it("only counts days within the window", () => {
    const habit = makeHabit({ createdAt: "2020-01-01" });
    const index = makeIndex(habit, on("full", "2023-06-01", "2024-06-01"));

    expect(buildHeatmap(habit, index, today).totals.full).toBe(1);
  });
});
