import type { CompletionsByDate } from "./completions";
import { addDays, eachDay, startOfWeek, type DateKey } from "./dates";
import type { Habit } from "./habit";
import { getWeekProgress, isActiveOn, isScheduledOn } from "./schedule";

/**
 * What a single day looks like for a habit.
 *
 * - `full` / `minimum` / `skipped`: the day has that completion (on any day,
 *   scheduled or not).
 * - `missed`: a scheduled day before today with no completion.
 * - `pending`: today is scheduled and has no completion yet. Never counts as missed.
 * - `off`: nothing expected that day (unscheduled day, or any empty day of a
 *   weekly goal).
 * - `inactive`: before the habit was created.
 * - `future`: after today. Future-dated completions are ignored.
 */
export type DayStatus =
  "full" | "minimum" | "skipped" | "missed" | "pending" | "off" | "inactive" | "future";

export function getDayStatus(
  habit: Habit,
  byDate: CompletionsByDate,
  date: DateKey,
  today: DateKey,
): DayStatus {
  if (date > today) return "future";
  if (!isActiveOn(habit, date)) return "inactive";

  const completion = byDate.get(date);
  if (completion) return completion.kind;
  if (!isScheduledOn(habit.schedule, date)) return "off";
  return date === today ? "pending" : "missed";
}

export type StreakSummary =
  | {
      unit: "days";
      current: number;
      best: number;
      /** The last scheduled day was missed: one more miss breaks the streak. */
      atRisk: boolean;
    }
  | { unit: "weeks"; current: number; best: number };

/**
 * Current and best streak for a habit.
 *
 * Daily and specific-day habits use "never miss twice" (unit: days):
 * - The streak counts done days (full or minimum).
 * - One missed scheduled day is forgiven; a second consecutive one breaks it.
 * - Skipped, pending and unscheduled days are ignored, so miss, skip, miss breaks.
 * - Any done day, including one on an unscheduled day, resets the miss count.
 *
 * Weekly goals count consecutive weeks where the goal was met (unit: weeks):
 * - Each skipped day lowers that week's target by one; a fully excused week is neutral.
 * - The current week and the week the habit was created count if met but never
 *   break the streak.
 *
 * Archived habits have no current streak; their best streak is kept.
 */
export function getStreak(habit: Habit, byDate: CompletionsByDate, today: DateKey): StreakSummary {
  return habit.schedule.type === "weekly"
    ? getWeekStreak(habit, byDate, today)
    : getDayStreak(habit, byDate, today);
}

function getDayStreak(habit: Habit, byDate: CompletionsByDate, today: DateKey): StreakSummary {
  let run = 0;
  let best = 0;
  let consecutiveMisses = 0;

  for (const date of eachDay(habit.createdAt, today)) {
    const status = getDayStatus(habit, byDate, date, today);
    if (status === "full" || status === "minimum") {
      run += 1;
      consecutiveMisses = 0;
      best = Math.max(best, run);
    } else if (status === "missed") {
      consecutiveMisses += 1;
      if (consecutiveMisses >= 2) run = 0;
    }
  }

  if (habit.archived) {
    return { unit: "days", current: 0, best, atRisk: false };
  }
  return { unit: "days", current: run, best, atRisk: run > 0 && consecutiveMisses === 1 };
}

function getWeekStreak(habit: Habit, byDate: CompletionsByDate, today: DateKey): StreakSummary {
  const firstWeek = startOfWeek(habit.createdAt);
  const currentWeek = startOfWeek(today);
  let run = 0;
  let best = 0;

  for (let week = firstWeek; week <= currentWeek; week = addDays(week, 7)) {
    const { met, target } = getWeekProgress(habit, byDate, week, today);
    const excused = target === 0;
    if (met) {
      run += 1;
      best = Math.max(best, run);
    } else if (!excused && week !== firstWeek && week !== currentWeek) {
      run = 0;
    }
  }

  return { unit: "weeks", current: habit.archived ? 0 : run, best };
}
