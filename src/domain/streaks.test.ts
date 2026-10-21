import { describe, expect, it, vi } from "vitest";
import { makeHabit, makeIndex, on } from "../test/factories";
import { addDays, eachDay, type DateKey } from "./dates";
import type { CompletionKind, Habit } from "./habit";
import { getDayStatus, getStreak } from "./streaks";

type Days = Record<DateKey, CompletionKind>;

function streak(habit: Habit, days: Days, today: DateKey) {
  return getStreak(habit, makeIndex(habit, days), today);
}

const daily = (overrides: Partial<Habit> = {}) =>
  makeHabit({ createdAt: "2025-01-01", ...overrides });
const monWedFri = (createdAt = "2025-01-06") =>
  makeHabit({ schedule: { type: "days", days: [1, 3, 5] }, createdAt });
const weekly = (timesPerWeek: number, createdAt = "2025-01-06") =>
  makeHabit({ schedule: { type: "weekly", timesPerWeek }, createdAt });

describe("getDayStatus", () => {
  const habit = monWedFri();
  const index = makeIndex(habit, {
    "2025-01-06": "full", // Mon
    "2025-01-07": "minimum", // Tue, unscheduled
    "2025-01-08": "skipped", // Wed
    "2025-01-20": "full", // future
  });
  const today = "2025-01-13"; // Mon

  it.each([
    ["2025-01-05", "inactive"], // before creation
    ["2025-01-06", "full"],
    ["2025-01-07", "minimum"], // completions count on unscheduled days too
    ["2025-01-08", "skipped"],
    ["2025-01-09", "off"], // Thu, unscheduled
    ["2025-01-10", "missed"], // Fri, scheduled, nothing logged
    ["2025-01-13", "pending"], // today, scheduled, nothing logged yet
    ["2025-01-20", "future"], // future completions are ignored
  ])("%s is %s", (date, expected) => {
    expect(getDayStatus(habit, index, date, today)).toBe(expected);
  });

  it("returns today's completion once logged", () => {
    const withToday = makeIndex(habit, on("full", today));
    expect(getDayStatus(habit, withToday, today, today)).toBe("full");
  });

  it("treats empty days of a weekly goal as off, never missed", () => {
    const goal = weekly(3);
    expect(getDayStatus(goal, makeIndex(goal, {}), "2025-01-07", "2025-01-13")).toBe("off");
  });
});

describe("getStreak: daily habits (never miss twice)", () => {
  it("is zero with no history", () => {
    expect(streak(daily(), {}, "2025-01-01")).toEqual({
      unit: "days",
      current: 0,
      best: 0,
      atRisk: false,
    });
  });

  it("counts consecutive done days", () => {
    const days = on("full", ...eachDay("2025-01-01", "2025-01-05"));
    expect(streak(daily(), days, "2025-01-05")).toMatchObject({ current: 5, best: 5 });
  });

  it("counts minimum completions", () => {
    const days = {
      "2025-01-01": "full",
      "2025-01-02": "minimum",
      "2025-01-03": "minimum",
    } as const;
    expect(streak(daily(), days, "2025-01-03")).toMatchObject({ current: 3 });
  });

  it("doesn't break or count an unchecked today", () => {
    const days = on("full", ...eachDay("2025-01-01", "2025-01-04"));
    expect(streak(daily(), days, "2025-01-05")).toEqual({
      unit: "days",
      current: 4,
      best: 4,
      atRisk: false,
    });
  });

  it("forgives a single missed day without counting it", () => {
    const days = on("full", "2025-01-01", "2025-01-02", "2025-01-04", "2025-01-05");
    expect(streak(daily(), days, "2025-01-05")).toMatchObject({ current: 4, atRisk: false });
  });

  it("is at risk after one miss until the habit is done again", () => {
    const days = on("full", "2025-01-01", "2025-01-02"); // missed 01-03
    expect(streak(daily(), days, "2025-01-04")).toMatchObject({ current: 2, atRisk: true });

    const doneToday = { ...days, "2025-01-04": "full" as const };
    expect(streak(daily(), doneToday, "2025-01-04")).toMatchObject({ current: 3, atRisk: false });
  });

  it("forgives misses that are not consecutive", () => {
    const days = on("full", "2025-01-01", "2025-01-03", "2025-01-05"); // missed 02, 04
    expect(streak(daily(), days, "2025-01-05")).toMatchObject({ current: 3 });
  });

  it("breaks after two consecutive missed days", () => {
    const days = on("full", ...eachDay("2025-01-01", "2025-01-03")); // missed 04, 05
    expect(streak(daily(), days, "2025-01-06")).toEqual({
      unit: "days",
      current: 0,
      best: 3,
      atRisk: false,
    });
  });

  it("starts a new streak after a break and keeps the best one", () => {
    const days = on("full", ...eachDay("2025-01-01", "2025-01-05"), "2025-01-08", "2025-01-09");
    expect(streak(daily(), days, "2025-01-09")).toMatchObject({ current: 2, best: 5 });
  });

  it("treats skipped days as neutral", () => {
    const days: Days = {
      "2025-01-01": "full",
      "2025-01-02": "full",
      "2025-01-03": "skipped",
      "2025-01-04": "skipped",
      "2025-01-05": "full",
    };
    expect(streak(daily(), days, "2025-01-05")).toMatchObject({ current: 3, atRisk: false });
  });

  it("breaks on miss, skip, miss because skips are ignored", () => {
    const days: Days = {
      "2025-01-01": "full",
      "2025-01-02": "full",
      "2025-01-04": "skipped", // missed 03 and 05 around it
    };
    expect(streak(daily(), days, "2025-01-06")).toMatchObject({ current: 0, best: 2 });
  });

  it("stays at risk through a skip after a miss", () => {
    const days: Days = { "2025-01-01": "full", "2025-01-02": "full", "2025-01-04": "skipped" };
    expect(streak(daily(), days, "2025-01-05")).toMatchObject({ current: 2, atRisk: true });
  });

  it("can't build a streak from skips alone", () => {
    const days = on("skipped", ...eachDay("2025-01-01", "2025-01-05"));
    expect(streak(daily(), days, "2025-01-05")).toMatchObject({ current: 0, best: 0 });
  });

  it("starts after a missed first day without being at risk", () => {
    expect(streak(daily(), {}, "2025-01-02")).toMatchObject({ current: 0, atRisk: false });
  });

  it("crosses month boundaries", () => {
    const habit = daily({ createdAt: "2025-01-28" });
    const days = on("full", ...eachDay("2025-01-28", "2025-02-02"));
    expect(streak(habit, days, "2025-02-02")).toMatchObject({ current: 6 });

    // Missing Jan 31 and Feb 1 breaks it, even across the month change.
    const gap = on("full", "2025-01-28", "2025-01-29", "2025-01-30", "2025-02-02");
    expect(streak(habit, gap, "2025-02-02")).toMatchObject({ current: 1, best: 3 });
  });

  it("crosses year boundaries and leap days", () => {
    const newYear = daily({ createdAt: "2024-12-29" });
    const days = on("full", ...eachDay("2024-12-29", "2025-01-02"));
    expect(streak(newYear, days, "2025-01-02")).toMatchObject({ current: 5 });

    const leap = daily({ createdAt: "2024-02-27" });
    const leapDays = on("full", "2024-02-27", "2024-02-28", "2024-02-29", "2024-03-01");
    expect(streak(leap, leapDays, "2024-03-01")).toMatchObject({ current: 4 });
  });

  it("crosses DST changes without gaining or losing a day", () => {
    const spring = daily({ createdAt: "2025-03-07" });
    const springDays = on("full", ...eachDay("2025-03-07", "2025-03-11"));
    expect(streak(spring, springDays, "2025-03-11")).toMatchObject({ current: 5 });

    // A miss on each side of the change is still two consecutive misses.
    const springGap = on("full", "2025-03-07", "2025-03-10");
    expect(streak(spring, springGap, "2025-03-10")).toMatchObject({ current: 1 });

    const fall = daily({ createdAt: "2025-10-31" });
    const fallDays = on("full", ...eachDay("2025-10-31", "2025-11-04"));
    expect(streak(fall, fallDays, "2025-11-04")).toMatchObject({ current: 5 });
  });

  it("counts every day where DST skips midnight", () => {
    // In São Paulo, 2018-11-04 started at 01:00. Today must still be counted.
    vi.stubEnv("TZ", "America/Sao_Paulo");
    try {
      const habit = daily({ createdAt: "2018-11-02" });
      const days = on("full", "2018-11-02", "2018-11-03", "2018-11-04", "2018-11-05", "2018-11-06");
      expect(streak(habit, days, "2018-11-06")).toMatchObject({ current: 5 });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("ignores future-dated completions", () => {
    const days = on("full", ...eachDay("2025-01-01", "2025-01-03"), "2025-01-10");
    expect(streak(daily(), days, "2025-01-03")).toMatchObject({ current: 3, best: 3 });
  });

  it("ignores completions dated before the habit was created", () => {
    const habit = daily({ createdAt: "2025-01-05" });
    const days = on("full", "2025-01-01", "2025-01-02", "2025-01-05");
    expect(streak(habit, days, "2025-01-05")).toMatchObject({ current: 1, best: 1 });
  });

  it("has no current streak once archived but keeps the best", () => {
    const habit = daily({ archived: true });
    const days = on("full", ...eachDay("2025-01-01", "2025-01-05"));
    expect(streak(habit, days, "2025-01-10")).toEqual({
      unit: "days",
      current: 0,
      best: 5,
      atRisk: false,
    });
  });

  it("handles years of history", () => {
    const habit = daily({ createdAt: "2023-01-01" });
    const days = on("full", ...eachDay("2023-01-01", "2025-12-31"));
    expect(streak(habit, days, "2025-12-31")).toMatchObject({ current: 1096, best: 1096 });
  });
});

describe("getStreak: specific-day habits", () => {
  it("only expects scheduled days", () => {
    const days = on("full", "2025-01-06", "2025-01-08", "2025-01-10"); // Mon, Wed, Fri
    expect(streak(monWedFri(), days, "2025-01-12")).toMatchObject({ current: 3, atRisk: false });
  });

  it("breaks after two consecutive missed scheduled days, with off days between", () => {
    const days = on("full", "2025-01-06"); // missed Wed 08 and Fri 10
    expect(streak(monWedFri(), days, "2025-01-11")).toMatchObject({ current: 0, best: 1 });
  });

  it("counts a done unscheduled day as a bonus", () => {
    const days = on("full", "2025-01-06", "2025-01-07", "2025-01-08"); // Tue is a bonus
    expect(streak(monWedFri(), days, "2025-01-08")).toMatchObject({ current: 3 });
  });

  it("lets a done unscheduled day reset the miss count", () => {
    // Mon done, Wed missed, Thu bonus, Fri missed: never two misses in a row.
    const days = on("full", "2025-01-06", "2025-01-09");
    expect(streak(monWedFri(), days, "2025-01-11")).toMatchObject({ current: 2, atRisk: true });
  });

  it("doesn't count scheduled days before a mid-week creation as missed", () => {
    const habit = monWedFri("2025-01-09"); // created Thursday
    const days = on("full", "2025-01-06", "2025-01-10"); // Mon is before creation
    expect(streak(habit, days, "2025-01-11")).toMatchObject({ current: 1, best: 1 });
  });

  it("isn't broken by a pending scheduled today after a miss", () => {
    const days = on("full", "2025-01-06"); // missed Wed, today is Fri
    expect(streak(monWedFri(), days, "2025-01-10")).toMatchObject({ current: 1, atRisk: true });
  });
});

describe("getStreak: weekly goals", () => {
  // Weeks start Mon 01-06, 01-13, 01-20, 01-27.
  const threeDaysFrom = (monday: DateKey) => on("full", ...eachDay(monday, addDays(monday, 2)));

  it("counts consecutive weeks where the goal was met", () => {
    const days = {
      ...threeDaysFrom("2025-01-06"),
      ...threeDaysFrom("2025-01-13"),
      ...threeDaysFrom("2025-01-20"),
    };
    expect(streak(weekly(3), days, "2025-01-27")).toEqual({ unit: "weeks", current: 3, best: 3 });
  });

  it("counts the current week once its goal is met", () => {
    const days = { ...threeDaysFrom("2025-01-06"), ...threeDaysFrom("2025-01-13") };
    expect(streak(weekly(3), days, "2025-01-15")).toMatchObject({ current: 2 });
  });

  it("doesn't break while the current week is in progress", () => {
    expect(streak(weekly(3), threeDaysFrom("2025-01-06"), "2025-01-19")).toMatchObject({
      current: 1,
    });
  });

  it("breaks when a past week falls short", () => {
    const days = {
      ...threeDaysFrom("2025-01-06"),
      ...threeDaysFrom("2025-01-13"),
      ...on("full", "2025-01-20", "2025-01-21"), // 2 of 3
      ...threeDaysFrom("2025-01-27"),
    };
    expect(streak(weekly(3), days, "2025-02-02")).toMatchObject({ current: 1, best: 2 });
  });

  it("counts minimum completions towards the goal", () => {
    const days = on("minimum", "2025-01-06", "2025-01-07");
    expect(streak(weekly(2), days, "2025-01-13")).toMatchObject({ current: 1 });
  });

  it("counts a week once no matter how often the goal is exceeded", () => {
    const days = on("full", ...eachDay("2025-01-06", "2025-01-12"));
    expect(streak(weekly(2), days, "2025-01-13")).toMatchObject({ current: 1, best: 1 });
  });

  it("lowers the target by one for each skipped day", () => {
    const days: Days = {
      ...threeDaysFrom("2025-01-06"),
      "2025-01-13": "skipped",
      "2025-01-14": "skipped",
      "2025-01-15": "full", // 1 of 3 - 2 skips
    };
    expect(streak(weekly(3), days, "2025-01-20")).toMatchObject({ current: 2 });
  });

  it("treats a fully excused week as neutral", () => {
    const days: Days = {
      ...on("full", "2025-01-06", "2025-01-07"),
      ...on("skipped", "2025-01-13", "2025-01-14"),
      ...on("full", "2025-01-20", "2025-01-21"),
    };
    expect(streak(weekly(2), days, "2025-01-26")).toMatchObject({ current: 2, best: 2 });
  });

  it("doesn't break on an unmet creation week but counts it when met", () => {
    const habit = weekly(3, "2025-01-09"); // created Thursday
    const shortStart = { ...on("full", "2025-01-10"), ...threeDaysFrom("2025-01-13") };
    expect(streak(habit, shortStart, "2025-01-20")).toMatchObject({ current: 1 });

    const fullStart = {
      ...on("full", "2025-01-09", "2025-01-10", "2025-01-11"),
      ...threeDaysFrom("2025-01-13"),
    };
    expect(streak(habit, fullStart, "2025-01-20")).toMatchObject({ current: 2 });
  });

  it("is zero for a goal created today", () => {
    expect(streak(weekly(3, "2025-01-08"), {}, "2025-01-08")).toEqual({
      unit: "weeks",
      current: 0,
      best: 0,
    });
  });

  it("crosses year boundaries, including a week split between years", () => {
    const habit = weekly(1, "2024-12-16");
    const days = on("full", "2024-12-17", "2024-12-24", "2025-01-01", "2025-01-07");
    expect(streak(habit, days, "2025-01-07")).toMatchObject({ current: 4 });
  });

  it("has no current streak once archived but keeps the best", () => {
    const habit = { ...weekly(3), archived: true };
    const days = { ...threeDaysFrom("2025-01-06"), ...threeDaysFrom("2025-01-13") };
    expect(streak(habit, days, "2025-01-20")).toEqual({ unit: "weeks", current: 0, best: 2 });
  });
});
