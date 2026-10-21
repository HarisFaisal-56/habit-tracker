import { format } from "date-fns";
import { indexCompletionsByHabit, NO_COMPLETIONS } from "../../domain/completions";
import { addDays, getWeekday, minDateKey, parseDateKey, type DateKey } from "../../domain/dates";
import type { Completion, Habit, WeeklyReview } from "../../domain/habit";
import { getWeekProgress, type WeekProgress } from "../../domain/schedule";

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
