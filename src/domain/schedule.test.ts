import { describe, expect, it } from "vitest";
import { makeHabit, makeIndex, on } from "../test/factories";
import { NO_COMPLETIONS } from "./completions";
import type { Schedule } from "./habit";
import { getWeekProgress, isActiveOn, isDueOn, isScheduledOn } from "./schedule";

// Week of Mon 2025-01-06 ... Sun 2025-01-12.
const MON = "2025-01-06";
const TUE = "2025-01-07";
const WED = "2025-01-08";
const THU = "2025-01-09";
const FRI = "2025-01-10";
const SAT = "2025-01-11";
const SUN = "2025-01-12";

const weekly = (timesPerWeek: number, createdAt = "2025-01-01") =>
  makeHabit({ schedule: { type: "weekly", timesPerWeek }, createdAt });
const monWedFri = (createdAt = "2025-01-01") =>
  makeHabit({ schedule: { type: "days", days: [1, 3, 5] }, createdAt });

describe("isActiveOn", () => {
  it("is true from the creation date onwards", () => {
    const habit = makeHabit({ createdAt: WED });
    expect(isActiveOn(habit, TUE)).toBe(false);
    expect(isActiveOn(habit, WED)).toBe(true);
    expect(isActiveOn(habit, "2026-01-01")).toBe(true);
  });
});

describe("isScheduledOn", () => {
  it("schedules daily habits every day", () => {
    expect(isScheduledOn({ type: "daily" }, MON)).toBe(true);
    expect(isScheduledOn({ type: "daily" }, SUN)).toBe(true);
  });

  it("schedules specific-day habits only on those weekdays", () => {
    const weekends: Schedule = { type: "days", days: [0, 6] };
    expect(isScheduledOn(weekends, SAT)).toBe(true);
    expect(isScheduledOn(weekends, SUN)).toBe(true);
    expect(isScheduledOn(weekends, FRI)).toBe(false);
  });

  it("never schedules a habit with no days", () => {
    expect(isScheduledOn({ type: "days", days: [] }, MON)).toBe(false);
  });

  it("has no fixed days for weekly goals", () => {
    expect(isScheduledOn({ type: "weekly", timesPerWeek: 7 }, MON)).toBe(false);
  });
});

describe("isDueOn", () => {
  it("is never due before creation or when archived", () => {
    expect(isDueOn(makeHabit({ createdAt: WED }), NO_COMPLETIONS, TUE)).toBe(false);
    expect(isDueOn(makeHabit({ archived: true }), NO_COMPLETIONS, WED)).toBe(false);
  });

  it("follows the schedule for fixed-day habits", () => {
    expect(isDueOn(makeHabit(), NO_COMPLETIONS, SUN)).toBe(true);
    expect(isDueOn(monWedFri(), NO_COMPLETIONS, WED)).toBe(true);
    expect(isDueOn(monWedFri(), NO_COMPLETIONS, THU)).toBe(false);
  });

  it("keeps a weekly goal due until it is met", () => {
    const habit = weekly(2);
    const index = makeIndex(habit, on("full", MON, TUE));

    expect(isDueOn(habit, index, MON)).toBe(true);
    expect(isDueOn(habit, index, TUE)).toBe(true); // checked off today, still shown as due
    expect(isDueOn(habit, index, WED)).toBe(false); // goal met earlier this week
  });

  it("counts minimum completions towards a weekly goal", () => {
    const habit = weekly(1);
    expect(isDueOn(habit, makeIndex(habit, on("minimum", MON)), TUE)).toBe(false);
  });

  it("lowers a weekly target for each skipped day", () => {
    const habit = weekly(3);
    const index = makeIndex(habit, { [MON]: "skipped", [TUE]: "full", [WED]: "full" });

    expect(isDueOn(habit, index, THU)).toBe(false); // 2 done, target 3 - 1 skip
  });

  it("is not due when every remaining unit of a weekly goal is skipped", () => {
    const habit = weekly(1);
    expect(isDueOn(habit, makeIndex(habit, on("skipped", MON)), MON)).toBe(false);
  });

  it("starts each week afresh", () => {
    const habit = weekly(1);
    const index = makeIndex(habit, on("full", SUN));
    expect(isDueOn(habit, index, "2025-01-13")).toBe(true); // next Monday
  });

  it("only counts the week from the habit's creation", () => {
    const habit = weekly(1, WED);
    // A stray completion before creation doesn't satisfy the goal.
    expect(isDueOn(habit, makeIndex(habit, on("full", MON)), THU)).toBe(true);
  });
});

describe("getWeekProgress", () => {
  it("counts done and skipped days for a weekly goal", () => {
    const habit = weekly(3);
    const index = makeIndex(habit, {
      [MON]: "full",
      [TUE]: "minimum",
      [WED]: "skipped",
    });

    expect(getWeekProgress(habit, index, FRI, SUN)).toEqual({
      weekStart: MON,
      done: 2,
      skipped: 1,
      target: 2,
      met: true,
    });
  });

  it("never lowers the target below zero", () => {
    const habit = weekly(1);
    const index = makeIndex(habit, on("skipped", MON, TUE));
    expect(getWeekProgress(habit, index, MON, SUN)).toMatchObject({ target: 0, met: false });
  });

  it("counts a done day as met even with a zero target", () => {
    const habit = weekly(1);
    const index = makeIndex(habit, { [MON]: "skipped", [TUE]: "full" });
    expect(getWeekProgress(habit, index, MON, SUN)).toMatchObject({ target: 0, met: true });
  });

  it("ignores completions after today and before creation", () => {
    const habit = weekly(2, TUE);
    const index = makeIndex(habit, on("full", MON, WED, FRI));

    expect(getWeekProgress(habit, index, MON, THU)).toMatchObject({ done: 1, met: false });
  });

  it("uses scheduled days as the target for fixed schedules", () => {
    const habit = monWedFri();
    const index = makeIndex(habit, { [MON]: "full", [WED]: "skipped" });

    expect(getWeekProgress(habit, index, MON, THU)).toEqual({
      weekStart: MON,
      done: 1,
      skipped: 1,
      target: 2, // Mon, Fri (Wed skipped)
      met: false,
    });
  });

  it("only counts scheduled days from the creation date for fixed schedules", () => {
    const habit = monWedFri(THU);
    expect(getWeekProgress(habit, NO_COMPLETIONS, THU, SUN).target).toBe(1); // Fri only
  });

  it("handles weeks spanning a year boundary", () => {
    const habit = weekly(2, "2024-12-01");
    const index = makeIndex(habit, on("full", "2024-12-31", "2025-01-02"));

    expect(getWeekProgress(habit, index, "2025-01-01", "2025-01-05")).toMatchObject({
      weekStart: "2024-12-30",
      done: 2,
      met: true,
    });
  });
});
