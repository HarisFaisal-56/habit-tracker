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
    expect(
      formToHabit(
        form({ name: "  Read  ", identity: " I am a reader ", minimumVersion: " One page " }),
      ),
    ).toEqual({
      name: "Read",
      emoji: "✅",
      color: "emerald",
      schedule: { type: "daily" },
      identity: "I am a reader",
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

  it("keeps blank optional fields as explicit undefineds so edits can clear them", () => {
    const habit = formToHabit(form({ identity: " ", minimumVersion: "  " }));
    expect(Object.keys(habit)).toEqual(expect.arrayContaining(["identity", "minimumVersion"]));
    expect(habit.identity).toBeUndefined();
    expect(habit.minimumVersion).toBeUndefined();
  });
});

describe("habitToForm", () => {
  it("round-trips a habit through the form", () => {
    const habit = makeHabit({
      name: "Run",
      emoji: "🏃",
      color: "sky",
      identity: "I am a runner",
      minimumVersion: "Shoes on",
      schedule: { type: "days", days: [2, 4] },
    });

    const values = habitToForm(habit);

    expect(values).toMatchObject({
      scheduleType: "days",
      days: [2, 4],
      identity: "I am a runner",
      minimumVersion: "Shoes on",
    });
    expect(formToHabit(values)).toEqual({
      name: "Run",
      emoji: "🏃",
      color: "sky",
      schedule: { type: "days", days: [2, 4] },
      identity: "I am a runner",
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
    expect(habitToForm(makeHabit())).toMatchObject({ identity: "", minimumVersion: "" });
  });
});

describe("reminder time", () => {
  it("is optional but must be a real time when set", () => {
    expect(validateHabitForm(form({ reminderTime: "" })).reminderTime).toBeUndefined();
    expect(validateHabitForm(form({ reminderTime: "20:30" })).reminderTime).toBeUndefined();
    expect(validateHabitForm(form({ reminderTime: "25:00" })).reminderTime).toMatch(/time/);
  });

  it("round-trips, and clearing it removes the reminder", () => {
    const habit = makeHabit({ reminderTime: "07:15" });
    expect(habitToForm(habit).reminderTime).toBe("07:15");
    expect(formToHabit(habitToForm(habit)).reminderTime).toBe("07:15");

    const cleared = formToHabit({ ...habitToForm(habit), reminderTime: "" });
    expect("reminderTime" in cleared).toBe(true);
    expect(cleared.reminderTime).toBeUndefined();
  });
});
