import { describe, expect, it } from "vitest";
import { makeCompletions, makeHabit, on } from "../../test/factories";
import {
  formatWeekRange,
  formatWeekRangeShort,
  getWeekCheckins,
  getWeekNumber,
  isReviewDay,
  isReviewEmpty,
  summarizeWeek,
  trimReview,
} from "./reviewData";

describe("isReviewDay", () => {
  it("is Sunday only", () => {
    expect(isReviewDay("2025-01-12")).toBe(true); // Sunday
    expect(isReviewDay("2025-01-11")).toBe(false); // Saturday
    expect(isReviewDay("2025-01-13")).toBe(false); // Monday
  });
});

describe("formatWeekRange", () => {
  it.each([
    ["2025-01-06", "6–12 January 2025"],
    ["2025-01-27", "27 January – 2 February 2025"],
    ["2024-12-30", "30 December 2024 – 5 January 2025"],
    ["2024-02-26", "26 February – 3 March 2024"], // leap year
  ])("formats the week of %s as %s", (weekStart, expected) => {
    expect(formatWeekRange(weekStart)).toBe(expected);
  });
});

describe("formatWeekRangeShort", () => {
  it.each([
    ["2025-01-06", "6–12 Jan"],
    ["2025-01-27", "27 Jan – 2 Feb"],
    ["2024-12-30", "30 Dec – 5 Jan"],
  ])("formats the week of %s as %s", (weekStart, expected) => {
    expect(formatWeekRangeShort(weekStart)).toBe(expected);
  });
});

describe("summarizeWeek", () => {
  const weekStart = "2025-01-06";

  it("reports each active habit's progress up to today", () => {
    const daily = makeHabit({ id: "daily" });
    const weekly = makeHabit({ id: "weekly", schedule: { type: "weekly", timesPerWeek: 3 } });
    const completions = [
      ...makeCompletions("daily", on("full", "2025-01-06", "2025-01-07", "2025-01-09")),
      ...makeCompletions("weekly", on("minimum", "2025-01-08")),
    ];

    const summary = summarizeWeek([daily, weekly], completions, weekStart, "2025-01-09");

    expect(summary.map((s) => [s.habit.id, s.progress.done, s.progress.target])).toEqual([
      ["daily", 3, 7],
      ["weekly", 1, 3],
    ]);
  });

  it("counts the whole week once it is over", () => {
    const habit = makeHabit();
    const completions = makeCompletions(habit.id, on("full", "2025-01-12"));
    const [summary] = summarizeWeek([habit], completions, weekStart, "2025-01-20");
    expect(summary?.progress.done).toBe(1);
  });

  it("leaves out archived habits and habits created after the week", () => {
    const habits = [
      makeHabit({ id: "archived", archived: true }),
      makeHabit({ id: "later", createdAt: "2025-01-13" }),
      makeHabit({ id: "mid-week", createdAt: "2025-01-10" }),
    ];

    const summary = summarizeWeek(habits, [], weekStart, "2025-01-12");

    expect(summary.map((s) => s.habit.id)).toEqual(["mid-week"]);
    expect(summary[0]?.progress.target).toBe(3); // Fri to Sun
  });
});

describe("trimReview / isReviewEmpty", () => {
  it("trims every field", () => {
    expect(
      trimReview({ wins: " Ran 3 times ", struggles: "\n", intention: " Sleep by 11 " }),
    ).toEqual({
      wins: "Ran 3 times",
      struggles: "",
      intention: "Sleep by 11",
    });
  });

  it("treats whitespace-only reviews as empty", () => {
    expect(isReviewEmpty({ wins: " ", struggles: "\n\t", intention: "" })).toBe(true);
    expect(isReviewEmpty({ wins: "", struggles: "", intention: "Walk daily" })).toBe(false);
  });
});

describe("getWeekNumber", () => {
  it("is the ISO week, including across the year end", () => {
    expect(getWeekNumber("2026-10-19")).toBe(43);
    expect(getWeekNumber("2024-12-30")).toBe(1); // belongs to week 1 of 2025
    expect(getWeekNumber("2025-01-06")).toBe(2);
  });
});

describe("getWeekCheckins", () => {
  it("counts check-ins per day up to today", () => {
    const habits = [makeHabit({ id: "a" }), makeHabit({ id: "b" })];
    const completions = [
      ...makeCompletions("a", on("full", "2025-01-06", "2025-01-07", "2025-01-08")),
      ...makeCompletions("b", on("minimum", "2025-01-06")),
    ];

    const week = getWeekCheckins(habits, completions, "2025-01-06", "2025-01-08");

    expect(week.days.map((day) => [day.done, day.expected])).toEqual([
      [2, 2],
      [1, 2],
      [1, 2], // Wednesday is today: b is still to do
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ]);
    expect(week).toMatchObject({ done: 4, expected: 6 });
  });

  it("leaves archived habits out", () => {
    const habits = [makeHabit({ id: "a", archived: true })];
    expect(getWeekCheckins(habits, [], "2025-01-06", "2025-01-08")).toMatchObject({
      done: 0,
      expected: 0,
    });
  });
});
