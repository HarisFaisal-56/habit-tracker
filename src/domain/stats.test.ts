import { describe, expect, it } from "vitest";
import { makeCompletions, makeHabit, makeIndex, on } from "../test/factories";
import { eachDay, type DateKey } from "./dates";
import type { CompletionKind, Habit } from "./habit";
import {
  getBestRun,
  getCompletionRate,
  getCompletionTrend,
  getLongestCurrentRun,
  getOverallCompletionRate,
  getTodayProgress,
} from "./stats";

type Days = Record<DateKey, CompletionKind>;

function rate(habit: Habit, days: Days, today: DateKey, windowDays: number) {
  return getCompletionRate(habit, makeIndex(habit, days), today, windowDays);
}

const daily = (overrides: Partial<Habit> = {}) =>
  makeHabit({ createdAt: "2025-01-01", ...overrides });
const weekly = (timesPerWeek: number) =>
  makeHabit({ schedule: { type: "weekly", timesPerWeek }, createdAt: "2025-01-01" });

describe("getCompletionRate: fixed schedules", () => {
  // A 7-day window ending 2025-01-10 covers 01-04 ... 01-10.
  const today = "2025-01-10";

  it("divides done days by done + missed days", () => {
    const days = on("full", ...eachDay("2025-01-04", "2025-01-08")); // 09 missed, today open
    expect(rate(daily(), days, today, 7)).toEqual({ done: 5, expected: 6, rate: 5 / 6 });
  });

  it("counts today once it's done", () => {
    const days = on("full", ...eachDay("2025-01-04", "2025-01-08"), today);
    expect(rate(daily(), days, today, 7)).toEqual({ done: 6, expected: 7, rate: 6 / 7 });
  });

  it("counts minimum completions as done", () => {
    const days = on("minimum", ...eachDay("2025-01-04", today));
    expect(rate(daily(), days, today, 7).rate).toBe(1);
  });

  it("leaves skipped days out", () => {
    const days: Days = {
      "2025-01-04": "skipped",
      ...on("full", ...eachDay("2025-01-05", "2025-01-09")),
    };
    expect(rate(daily(), days, today, 7)).toEqual({ done: 5, expected: 5, rate: 1 });
  });

  it("only looks at days since the habit was created", () => {
    const habit = daily({ createdAt: "2025-01-08" });
    const days = on("full", "2025-01-08", today); // 09 missed
    expect(rate(habit, days, today, 30)).toEqual({ done: 2, expected: 3, rate: 2 / 3 });
  });

  it("returns a null rate when nothing was expected yet", () => {
    expect(rate(daily({ createdAt: today }), {}, today, 7)).toEqual({
      done: 0,
      expected: 0,
      rate: null,
    });
    expect(rate(daily(), on("skipped", ...eachDay("2025-01-04", today)), today, 7).rate).toBeNull();
  });

  it("ignores unscheduled days but rewards bonus completions", () => {
    // Mon/Wed/Fri, window 01-06 ... 01-12: Mon and Wed done, Fri missed, Sat bonus.
    const habit = makeHabit({
      schedule: { type: "days", days: [1, 3, 5] },
      createdAt: "2025-01-01",
    });
    const days = on("full", "2025-01-06", "2025-01-08", "2025-01-11");
    expect(rate(habit, days, "2025-01-12", 7)).toEqual({ done: 3, expected: 4, rate: 0.75 });
  });

  it("supports 90-day windows across a year boundary", () => {
    const habit = daily({ createdAt: "2024-10-01" });
    const window = eachDay("2024-11-01", "2025-01-29"); // exactly 90 days
    expect(window).toHaveLength(90);
    const days = on("full", ...window.filter((d) => d !== "2024-12-25" && d !== "2025-01-01"));

    expect(rate(habit, days, "2025-01-29", 90)).toEqual({ done: 88, expected: 90, rate: 88 / 90 });
  });

  it("rejects windows that aren't a positive whole number of days", () => {
    expect(() => rate(daily(), {}, today, 0)).toThrow(RangeError);
    expect(() => rate(daily(), {}, today, 1.5)).toThrow(RangeError);
  });
});

describe("getCompletionRate: weekly goals", () => {
  // 7-day window ending Tue 2025-01-14 covers 01-08 ... 01-14.
  const today = "2025-01-14";

  it("spreads the weekly target across the window", () => {
    const days = on("full", "2025-01-10", today);
    expect(rate(weekly(3), days, today, 7)).toEqual({ done: 2, expected: 3, rate: 2 / 3 });
  });

  it("caps the rate at 100% when the goal is exceeded", () => {
    const days = on("full", ...eachDay("2025-01-10", today));
    expect(rate(weekly(3), days, today, 7)).toEqual({ done: 5, expected: 3, rate: 1 });
  });

  it("lowers the expectation by one per skipped day", () => {
    const days: Days = { "2025-01-09": "skipped", ...on("full", "2025-01-12", today) };
    expect(rate(weekly(3), days, today, 7)).toEqual({ done: 2, expected: 2, rate: 1 });
  });

  it("leaves an unchecked today out", () => {
    const result = rate(weekly(3), {}, today, 7);
    expect(result.done).toBe(0);
    expect(result.expected).toBeCloseTo(18 / 7);
    expect(result.rate).toBe(0);
  });
});

describe("getOverallCompletionRate", () => {
  const today = "2025-01-07"; // 7-day window: 01-01 ... 01-07

  it("combines active habits and leaves archived ones out", () => {
    const allDone = daily({ id: "a" });
    const someDone = daily({ id: "b" });
    const archived = daily({ id: "c", archived: true });
    const completions = [
      ...makeCompletions("a", on("full", ...eachDay("2025-01-01", today))),
      ...makeCompletions("b", on("full", "2025-01-01", "2025-01-02", "2025-01-03")),
    ];

    // a: 7 of 7. b: 3 done, 3 missed, today still open.
    expect(getOverallCompletionRate([allDone, someDone, archived], completions, today, 7)).toEqual({
      done: 10,
      expected: 13,
      rate: 10 / 13,
    });
  });

  it("doesn't let an over-achieved weekly goal hide misses elsewhere", () => {
    const goal = { ...weekly(1), id: "goal" };
    const neglected = daily({ id: "neglected" });
    const completions = makeCompletions("goal", on("full", ...eachDay("2025-01-01", today)));

    // goal: 7 done, 1 expected, counted as 1. neglected: 6 missed, today still open.
    expect(getOverallCompletionRate([goal, neglected], completions, today, 7)).toEqual({
      done: 1,
      expected: 7,
      rate: 1 / 7,
    });
  });

  it("returns a null rate with no habits", () => {
    expect(getOverallCompletionRate([], [], today, 7).rate).toBeNull();
  });
});

describe("getTodayProgress", () => {
  it("counts due habits and the ones done today", () => {
    const today = "2025-01-08"; // Wednesday
    const habits = [
      daily({ id: "done" }),
      daily({ id: "open" }),
      daily({ id: "minimum" }),
      daily({ id: "skipped" }),
      daily({ id: "archived", archived: true }),
      daily({ id: "not-yet-created", createdAt: "2025-01-09" }),
      makeHabit({ id: "mon-fri", schedule: { type: "days", days: [1, 5] } }),
      { ...weekly(1), id: "weekly-met" },
      { ...weekly(2), id: "weekly-today" },
    ];
    const completions = [
      ...makeCompletions("done", on("full", today)),
      ...makeCompletions("minimum", on("minimum", today)),
      ...makeCompletions("skipped", on("skipped", today)),
      ...makeCompletions("archived", on("full", today)),
      ...makeCompletions("mon-fri", on("full", today)), // bonus, not due
      ...makeCompletions("weekly-met", on("full", "2025-01-06")),
      ...makeCompletions("weekly-today", on("full", "2025-01-06", today)),
    ];

    // Due: done, open, minimum, weekly-today. Closed: done, weekly-today. Minimum: minimum.
    expect(getTodayProgress(habits, completions, today)).toEqual({
      closed: 2,
      minimum: 1,
      due: 4,
    });
  });

  it("keeps the minimum version out of the closed count", () => {
    const today = "2025-01-08";
    const habits = [daily({ id: "a" }), daily({ id: "b" })];
    const completions = [
      ...makeCompletions("a", on("minimum", today)),
      ...makeCompletions("b", on("minimum", today)),
    ];

    expect(getTodayProgress(habits, completions, today)).toEqual({
      closed: 0,
      minimum: 2,
      due: 2,
    });
  });

  it("is zero with no habits", () => {
    expect(getTodayProgress([], [], "2025-01-08")).toEqual({ closed: 0, minimum: 0, due: 0 });
  });
});

describe("getLongestCurrentRun", () => {
  const today = "2025-01-08";

  it("is the longest current day streak among active habits", () => {
    const habits = [daily({ id: "short" }), daily({ id: "long" })];
    const completions = [
      ...makeCompletions("short", on("full", ...eachDay("2025-01-06", today))),
      ...makeCompletions("long", on("full", ...eachDay("2025-01-01", today))),
    ];

    expect(getLongestCurrentRun(habits, completions, today)).toBe(8);
  });

  it("keeps a run alive across one missed day and ends it after two", () => {
    const habits = [daily({ id: "a" })];
    const days = (...dates: string[]) => makeCompletions("a", on("full", ...dates));

    expect(getLongestCurrentRun(habits, days("2025-01-05", "2025-01-06"), today)).toBe(2);
    expect(getLongestCurrentRun(habits, days("2025-01-04", "2025-01-05"), today)).toBe(0);
  });

  it("runs across a year boundary", () => {
    const habits = [daily({ id: "a", createdAt: "2024-12-20" })];
    const completions = makeCompletions("a", on("full", ...eachDay("2024-12-28", "2025-01-02")));

    expect(getLongestCurrentRun(habits, completions, "2025-01-02")).toBe(6);
  });

  it("leaves out archived habits and weekly goals", () => {
    const habits = [daily({ id: "archived", archived: true }), { ...weekly(3), id: "weekly" }];
    const completions = [
      ...makeCompletions("archived", on("full", ...eachDay("2025-01-01", today))),
      ...makeCompletions("weekly", on("full", "2025-01-06", "2025-01-07", today)),
    ];

    expect(getLongestCurrentRun(habits, completions, today)).toBe(0);
  });

  it("is zero with no habits", () => {
    expect(getLongestCurrentRun([], [], today)).toBe(0);
  });
});

describe("getBestRun", () => {
  it("is the best day streak across the habits, ignoring weekly goals", () => {
    const habits = [daily({ id: "a" }), { ...weekly(1), id: "weekly" }];
    const completions = [
      ...makeCompletions("a", on("full", ...eachDay("2025-01-01", "2025-01-04"))),
      ...makeCompletions("weekly", on("full", "2025-01-06")),
    ];

    expect(getBestRun(habits, completions, "2025-01-08")).toBe(4);
    expect(getBestRun([], [], "2025-01-08")).toBe(0);
  });
});

describe("getCompletionTrend", () => {
  const today = "2025-01-10";
  const habits = [daily({ id: "a" })];

  it("has one point per day, oldest first, each averaging the week up to that day", () => {
    const completions = makeCompletions("a", on("full", ...eachDay("2025-01-04", "2025-01-10")));

    const trend = getCompletionTrend(habits, completions, today, 3);

    expect(trend).toHaveLength(3);
    expect(trend).toEqual([5 / 7, 6 / 7, 1]);
  });

  it("is null while nothing has been expected yet", () => {
    const young = [daily({ id: "a", createdAt: today })];
    expect(getCompletionTrend(young, [], today, 2)).toEqual([null, null]);
  });
});
