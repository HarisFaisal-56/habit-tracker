import { DEFAULT_HABIT_COLOR } from "../../components/habitColors";
import type { Weekday } from "../../domain/dates";
import type { Habit, Schedule } from "../../domain/habit";
import { isTimeOfDay } from "../../domain/reminders";
import type { NewHabit } from "../../data/repository";

export const NAME_MAX_LENGTH = 60;
export const MINIMUM_MAX_LENGTH = 80;
export const IDENTITY_MAX_LENGTH = 80;
export const MIN_TIMES_PER_WEEK = 1;
export const MAX_TIMES_PER_WEEK = 7;

export type HabitFormValues = {
  name: string;
  emoji: string;
  color: string;
  identity: string;
  minimumVersion: string;
  /** "HH:mm", or "" for no reminder. */
  reminderTime: string;
  scheduleType: Schedule["type"];
  /** Used when scheduleType is "days". Kept when switching types so nothing is lost. */
  days: Weekday[];
  /** Used when scheduleType is "weekly". */
  timesPerWeek: number;
};

export type HabitFormErrors = Partial<
  Record<"name" | "days" | "timesPerWeek" | "reminderTime", string>
>;

export function emptyHabitForm(): HabitFormValues {
  return {
    name: "",
    emoji: "✅",
    color: DEFAULT_HABIT_COLOR,
    identity: "",
    minimumVersion: "",
    reminderTime: "",
    scheduleType: "daily",
    days: [1, 2, 3, 4, 5],
    timesPerWeek: 3,
  };
}

export function habitToForm(habit: Habit): HabitFormValues {
  const { schedule } = habit;
  const defaults = emptyHabitForm();
  return {
    name: habit.name,
    emoji: habit.emoji,
    color: habit.color,
    identity: habit.identity ?? "",
    minimumVersion: habit.minimumVersion ?? "",
    reminderTime: habit.reminderTime ?? "",
    scheduleType: schedule.type,
    days: schedule.type === "days" ? [...schedule.days] : defaults.days,
    timesPerWeek: schedule.type === "weekly" ? schedule.timesPerWeek : defaults.timesPerWeek,
  };
}

export function validateHabitForm(values: HabitFormValues): HabitFormErrors {
  const errors: HabitFormErrors = {};
  const name = values.name.trim();
  if (name.length === 0) {
    errors.name = "Give your habit a name.";
  } else if (name.length > NAME_MAX_LENGTH) {
    errors.name = `Keep the name under ${String(NAME_MAX_LENGTH)} characters.`;
  }
  if (values.scheduleType === "days" && values.days.length === 0) {
    errors.days = "Pick at least one day.";
  }
  const times = values.timesPerWeek;
  if (
    values.scheduleType === "weekly" &&
    (!Number.isInteger(times) || times < MIN_TIMES_PER_WEEK || times > MAX_TIMES_PER_WEEK)
  ) {
    errors.timesPerWeek = `Choose between ${String(MIN_TIMES_PER_WEEK)} and ${String(MAX_TIMES_PER_WEEK)} times.`;
  }
  if (values.reminderTime !== "" && !isTimeOfDay(values.reminderTime)) {
    errors.reminderTime = "Enter a time like 08:30.";
  }
  return errors;
}

export function hasErrors(errors: HabitFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

function toSchedule(values: HabitFormValues): Schedule {
  switch (values.scheduleType) {
    case "daily":
      return { type: "daily" };
    case "days":
      return { type: "days", days: [...new Set(values.days)].sort((a, b) => a - b) };
    case "weekly":
      return { type: "weekly", timesPerWeek: values.timesPerWeek };
  }
}

/**
 * Converts valid form values for saving. Optional text fields are always present
 * (undefined when blank) so that clearing one in an edit removes the old value.
 */
export function formToHabit(values: HabitFormValues): NewHabit {
  const optional = (value: string) => (value.trim() === "" ? undefined : value.trim());
  return {
    name: values.name.trim(),
    emoji: values.emoji,
    color: values.color,
    schedule: toSchedule(values),
    identity: optional(values.identity),
    minimumVersion: optional(values.minimumVersion),
    reminderTime: optional(values.reminderTime),
  };
}
