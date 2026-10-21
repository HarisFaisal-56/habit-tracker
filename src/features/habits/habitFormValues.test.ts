import { describe, expect, it } from "vitest";
import { makeHabit } from "../../test/factories";
import {
  emptyHabitForm,
  formToHabit,
  habitToForm,
  hasErrors,
  validateHabitForm,
  type HabitFormValues,
} from "./habitFormValues";

const form = (overrides: Partial<HabitFormValues> = {}): HabitFormValues => ({
  ...emptyHabitForm(),
  name: "Read",
  ...overrides,
});

describe("validateHabitForm", () => {
  it("accepts a valid form", () => {
    expect(validateHabitForm(form())).toEqual({});
    expect(hasErrors(validateHabitForm(form()))).toBe(false);
  });

  it("requires a name that isn't just spaces", () => {
    expect(validateHabitForm(form({ name: "   " })).name).toMatch(/name/);
  });

  it("limits the name length", () => {
    expect(validateHabitForm(form({ name: "x".repeat(60) })).name).toBeUndefined();
    expect(validateHabitForm(form({ name: "x".repeat(61) })).name).toMatch(/60/);
  });

  it("requires at least one day for specific-day schedules only", () => {
    expect(validateHabitForm(form({ scheduleType: "days", days: [] })).days).toBeDefined();
    expect(validateHabitForm(form({ scheduleType: "daily", days: [] })).days).toBeUndefined();
  });

  it("keeps weekly goals between 1 and 7", () => {
    const weekly = (timesPerWeek: number) =>
      validateHabitForm(form({ scheduleType: "weekly", timesPerWeek })).timesPerWeek;
    expect(weekly(1)).toBeUndefined();
    expect(weekly(7)).toBeUndefined();
    expect(weekly(0)).toBeDefined();
    expect(weekly(8)).toBeDefined();
    expect(weekly(2.5)).toBeDefined();
  });
});

describe("formToHabit", () => {
  it("trims text and builds each schedule type", () => {
    expect(formToHabit(form({ name: "  Read  ", minimumVersion: " One page " }))).toEqual({
      name: "Read",
      emoji: "✅",
      color: "emerald",
      schedule: { type: "daily" },
      minimumVersion: "One page",
    });
    expect(formToHabit(form({ scheduleType: "days", days: [5, 1, 3, 1] })).schedule).toEqual({
      type: "days",
      days: [1, 3, 5],
    });
    expect(formToHabit(form({ scheduleType: "weekly", timesPerWeek: 4 })).schedule).toEqual({
      type: "weekly",
      timesPerWeek: 4,
    });
  });

  it("keeps a blank minimum version as an explicit undefined so edits can clear it", () => {
    const habit = formToHabit(form({ minimumVersion: "  " }));
    expect("minimumVersion" in habit).toBe(true);
    expect(habit.minimumVersion).toBeUndefined();
  });
});

describe("habitToForm", () => {
  it("round-trips a habit through the form", () => {
    const habit = makeHabit({
      name: "Run",
      emoji: "🏃",
      color: "sky",
      minimumVersion: "Shoes on",
      schedule: { type: "days", days: [2, 4] },
    });

    const values = habitToForm(habit);

    expect(values).toMatchObject({
      scheduleType: "days",
      days: [2, 4],
      minimumVersion: "Shoes on",
    });
    expect(formToHabit(values)).toEqual({
      name: "Run",
      emoji: "🏃",
      color: "sky",
      schedule: { type: "days", days: [2, 4] },
      minimumVersion: "Shoes on",
    });
  });

  it("fills unused schedule fields with defaults", () => {
    const values = habitToForm(makeHabit({ schedule: { type: "weekly", timesPerWeek: 2 } }));
    expect(values).toMatchObject({
      scheduleType: "weekly",
      timesPerWeek: 2,
      days: [1, 2, 3, 4, 5],
    });
    expect(habitToForm(makeHabit()).minimumVersion).toBe("");
  });
});
