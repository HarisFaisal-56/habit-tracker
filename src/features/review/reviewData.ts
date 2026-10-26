import { format, getISOWeek } from "date-fns";
import { indexCompletionsByHabit, NO_COMPLETIONS } from "../../domain/completions";
import {
  addDays,
  eachDay,
  getWeekday,
  minDateKey,
  parseDateKey,
  type DateKey,
} from "../../domain/dates";
import type { Completion, Habit, WeeklyReview } from "../../domain/habit";
import { getWeekProgress, type WeekProgress } from "../../domain/schedule";
import { summarizeDay } from "../history/historyData";

export const REVIEW_TEXT_MAX_LENGTH = 1000;
export const INTENTION_MAX_LENGTH = 200;

/** Reviews are prompted on Sundays, the last day of the Monday-to-Sunday week. */
export function isReviewDay(date: DateKey): boolean {
  return getWeekday(date) === 0;
}

/** "6–12 January 2025", "27 January – 2 February 2025", "30 December 2024 – 5 January 2025". */
export function formatWeekRange(weekStart: DateKey): string {
  const start = parseDateKey(weekStart);
  const end = parseDateKey(addDays(weekStart, 6));
  if (start.getFullYear() !== end.getFullYear()) {
    return `${format(start, "d MMMM yyyy")} – ${format(end, "d MMMM yyyy")}`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${format(start, "d MMMM")} – ${format(end, "d MMMM yyyy")}`;
  }
  return `${format(start, "d")}–${format(end, "d MMMM yyyy")}`;
}

/** "6–12 Jan", "27 Jan – 2 Feb", "30 Dec – 5 Jan": the short form for captions. */
export function formatWeekRangeShort(weekStart: DateKey): string {
  const start = parseDateKey(weekStart);
  const end = parseDateKey(addDays(weekStart, 6));
  if (start.getMonth() !== end.getMonth()) {
    return `${format(start, "d MMM")} – ${format(end, "d MMM")}`;
  }
  return `${format(start, "d")}–${format(end, "d MMM")}`;
}

export type WeekHabitSummary = { habit: Habit; progress: WeekProgress };

/** How each active habit went in a week, counting days up to `today`. */
export function summarizeWeek(
  habits: readonly Habit[],
  completions: readonly Completion[],
  weekStart: DateKey,
  today: DateKey,
): WeekHabitSummary[] {
  const byHabit = indexCompletionsByHabit(completions);
  const weekEnd = addDays(weekStart, 6);
  const through = minDateKey(today, weekEnd);
  return habits
    .filter((habit) => !habit.archived && habit.createdAt <= weekEnd)
    .map((habit) => ({
      habit,
      progress: getWeekProgress(habit, byHabit.get(habit.id) ?? NO_COMPLETIONS, weekStart, through),
    }));
}

export type ReviewFields = Pick<WeeklyReview, "wins" | "struggles" | "intention">;

export function trimReview(fields: ReviewFields): ReviewFields {
  return {
    wins: fields.wins.trim(),
    struggles: fields.struggles.trim(),
    intention: fields.intention.trim(),
  };
}

export function isReviewEmpty(fields: ReviewFields): boolean {
  const { wins, struggles, intention } = trimReview(fields);
  return wins === "" && struggles === "" && intention === "";
}

/** The ISO week number of the week starting `weekStart`, e.g. 43. */
export function getWeekNumber(weekStart: DateKey): number {
  return getISOWeek(parseDateKey(weekStart));
}

export type DayCheckins = { date: DateKey; done: number; expected: number };

export type WeekCheckins = {
  /** Monday to Sunday. Days after `today` expect nothing. */
  days: DayCheckins[];
  done: number;
  expected: number;
};

/** Check-ins done out of those expected, per day and for the week, up to `today`. */
export function getWeekCheckins(
  habits: readonly Habit[],
  completions: readonly Completion[],
  weekStart: DateKey,
  today: DateKey,
): WeekCheckins {
  const byHabit = indexCompletionsByHabit(completions);
  const days = eachDay(weekStart, addDays(weekStart, 6)).map((date) => ({
    date,
    ...summarizeDay(habits, byHabit, date, today),
  }));
  return {
    days,
    done: days.reduce((total, day) => total + day.done, 0),
    expected: days.reduce((total, day) => total + day.expected, 0),
  };
}
