import type { Weekday } from "../../domain/dates";
import type { Habit, Schedule } from "../../domain/habit";

/** Weekdays in display order: weeks start on Monday. */
export const WEEKDAYS_MONDAY_FIRST: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5];
const WEEKEND: readonly Weekday[] = [6, 0];

function sameDays(a: readonly Weekday[], b: readonly Weekday[]): boolean {
  return a.length === b.length && b.every((day) => a.includes(day));
}

/** A short human description, e.g. "Every day", "Mon, Wed, Fri", "3 times a week". */
export function describeSchedule(schedule: Schedule): string {
  switch (schedule.type) {
    case "daily":
      return "Every day";
    case "days": {
      const days = [...new Set(schedule.days)];
      if (days.length === 0) return "No days chosen";
      if (days.length === 7) return "Every day";
      if (sameDays(days, WEEKDAYS)) return "Weekdays";
      if (sameDays(days, WEEKEND)) return "Weekends";
      return WEEKDAYS_MONDAY_FIRST.filter((day) => days.includes(day))
        .map((day) => WEEKDAY_NAMES[day].slice(0, 3))
        .join(", ");
    }
    case "weekly":
      return schedule.timesPerWeek === 1
        ? "Once a week"
        : `${String(schedule.timesPerWeek)} times a week`;
  }
}

/** A short label for chips and captions: "Daily", "Mon, Wed, Fri", "3 times a week". */
export function describeScheduleShort(schedule: Schedule): string {
  return schedule.type === "daily" ? "Daily" : describeSchedule(schedule);
}

/**
 * The schedule chip on a habit card: "Daily", "Mon, Wed, Fri" or "3× a week",
 * plus the minimum version, e.g. "Daily · Min 20".
 */
export function describeScheduleChip({ schedule, minimumVersion }: Habit): string {
  const when =
    schedule.type === "weekly"
      ? `${String(schedule.timesPerWeek)}× a week`
      : describeScheduleShort(schedule);
  return minimumVersion ? `${when} · Min ${minimumVersion}` : when;
}

/** Counts for the Habits caption, e.g. "05 orbits · 4 daily · 1 weekly". Zero counts are left out. */
export function summarizeHabits(habits: readonly Habit[]): string {
  const count = (type: Schedule["type"]) =>
    habits.filter((habit) => habit.schedule.type === type).length;
  const parts = [
    `${String(habits.length).padStart(2, "0")} ${habits.length === 1 ? "orbit" : "orbits"}`,
  ];
  const kinds: [number, string][] = [
    [count("daily"), "daily"],
    [count("days"), "some days"],
    [count("weekly"), "weekly"],
  ];
  for (const [n, label] of kinds) {
    if (n > 0) parts.push(`${String(n)} ${label}`);
  }
  return parts.join(" · ");
}
