import { describe, expect, it } from "vitest";
import { makeCompletions, makeHabit, on } from "../test/factories";
import type { Completion, Habit } from "./habit";
import { getRemindersForToday, isTimeOfDay } from "./reminders";

const today = "2025-01-08"; // Wednesday

describe("isTimeOfDay", () => {
  it.each(["00:00", "08:30", "23:59"])("accepts %s", (value) => {
    expect(isTimeOfDay(value)).toBe(true);
  });

  it.each(["24:00", "8:30", "08:60", "08:30:00", "", "noon"])("rejects %j", (value) => {
    expect(isTimeOfDay(value)).toBe(false);
  });
});

describe("getRemindersForToday", () => {
  const plan = (habits: Habit[], completions: Completion[] = [], now = "07:00") =>
    getRemindersForToday(habits, completions, today, now).map(({ habit, time }) => [
      habit.id,
      time,
    ]);

  it("lists due habits with a reminder later today, earliest first", () => {
    const habits = [
      makeHabit({ id: "evening", reminderTime: "21:00" }),
      makeHabit({ id: "none" }),
      makeHabit({ id: "morning", reminderTime: "08:00" }),
    ];

    expect(plan(habits)).toEqual([
      ["morning", "08:00"],
      ["evening", "21:00"],
    ]);
  });

  it("skips reminders whose time has passed, including this minute", () => {
    const habits = [
      makeHabit({ id: "past", reminderTime: "06:30" }),
      makeHabit({ id: "now", reminderTime: "07:00" }),
      makeHabit({ id: "later", reminderTime: "07:01" }),
    ];

    expect(plan(habits, [], "07:00")).toEqual([["later", "07:01"]]);
  });

  it("skips habits already logged today, whether done or skipped", () => {
    const habits = [
      makeHabit({ id: "done", reminderTime: "20:00" }),
      makeHabit({ id: "minimum", reminderTime: "20:00" }),
      makeHabit({ id: "skipped", reminderTime: "20:00" }),
      makeHabit({ id: "open", reminderTime: "20:00" }),
    ];
    const completions = [
      ...makeCompletions("done", on("full", today)),
      ...makeCompletions("minimum", on("minimum", today)),
      ...makeCompletions("skipped", on("skipped", today)),
      ...makeCompletions("open", on("full", "2025-01-07")), // yesterday doesn't count
    ];

    expect(plan(habits, completions)).toEqual([["open", "20:00"]]);
  });

  it("only reminds about habits due today", () => {
    const habits = [
      makeHabit({ id: "mon-fri", reminderTime: "09:00", schedule: { type: "days", days: [1, 5] } }),
      makeHabit({ id: "wed", reminderTime: "09:00", schedule: { type: "days", days: [3] } }),
      makeHabit({ id: "archived", reminderTime: "09:00", archived: true }),
      makeHabit({ id: "not-yet", reminderTime: "09:00", createdAt: "2025-01-09" }),
    ];

    expect(plan(habits)).toEqual([["wed", "09:00"]]);
  });

  it("stops reminding about a weekly goal once it's met", () => {
    const weekly = (id: string) =>
      makeHabit({ id, reminderTime: "18:00", schedule: { type: "weekly", timesPerWeek: 2 } });
    const completions = [
      ...makeCompletions("met", on("full", "2025-01-06", "2025-01-07")),
      ...makeCompletions("halfway", on("full", "2025-01-06")),
    ];

    expect(plan([weekly("met"), weekly("halfway")], completions)).toEqual([["halfway", "18:00"]]);
  });

  it("ignores malformed reminder times", () => {
    expect(plan([makeHabit({ reminderTime: "8am" })])).toEqual([]);
  });
});
