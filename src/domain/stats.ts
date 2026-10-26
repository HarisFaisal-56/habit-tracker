import {
  indexCompletionsByHabit,
  isDone,
  NO_COMPLETIONS,
  type CompletionsByDate,
} from "./completions";
import { addDays, eachDay, maxDateKey, type DateKey } from "./dates";
import type { Completion, Habit } from "./habit";
import { isDueOn } from "./schedule";
import { getDayStatus, getStreak } from "./streaks";

/** The rolling windows shown on the Stats screen, in days. */
export const COMPLETION_RATE_WINDOWS = [7, 30, 90] as const;

export type CompletionRate = {
  done: number;
  /** May be fractional for weekly goals, which spread their target across the days. */
  expected: number;
  /** 0 to 1, or null when nothing was expected in the window. */
  rate: number | null;
};

function toRate(done: number, expected: number): CompletionRate {
  return { done, expected, rate: expected > 0 ? Math.min(1, done / expected) : null };
}

/**
 * Completion rate over the last `days` days, ending today. Days before the habit
 * was created are left out.
 *
 * - Fixed schedules: done days / (done days + missed days). Skips, an unchecked
 *   today and unscheduled days are neutral; a done unscheduled day counts on both sides.
 * - Weekly goals: done days / (`timesPerWeek` per 7 days in the window, minus one
 *   per skipped day), capped at 100%. An unchecked today is left out.
 */
export function getCompletionRate(
  habit: Habit,
  byDate: CompletionsByDate,
  today: DateKey,
  days: number,
): CompletionRate {
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError(`Window must be a positive whole number of days, got ${String(days)}`);
  }
  const windowDays = eachDay(maxDateKey(addDays(today, 1 - days), habit.createdAt), today);

  if (habit.schedule.type === "weekly") {
    let done = 0;
    let skipped = 0;
    let counted = 0;
    for (const date of windowDays) {
      const completion = byDate.get(date);
      if (date === today && !completion) continue;
      counted += 1;
      if (isDone(completion)) done += 1;
      else if (completion?.kind === "skipped") skipped += 1;
    }
    const expected = Math.max(0, (habit.schedule.timesPerWeek * counted) / 7 - skipped);
    return toRate(done, expected);
  }

  let done = 0;
  let missed = 0;
  for (const date of windowDays) {
    const status = getDayStatus(habit, byDate, date, today);
    if (status === "full" || status === "minimum") done += 1;
    else if (status === "missed") missed += 1;
  }
  return toRate(done, done + missed);
}

/** Combined completion rate across all active (non-archived) habits. */
export function getOverallCompletionRate(
  habits: readonly Habit[],
  completions: readonly Completion[],
  today: DateKey,
  days: number,
): CompletionRate {
  const byHabit = indexCompletionsByHabit(completions);
  let done = 0;
  let expected = 0;
  for (const habit of habits) {
    if (habit.archived) continue;
    const rate = getCompletionRate(habit, byHabit.get(habit.id) ?? NO_COMPLETIONS, today, days);
    // A weekly goal done more often than needed must not hide misses elsewhere.
    done += Math.min(rate.done, rate.expected);
    expected += rate.expected;
  }
  return toRate(done, expected);
}

/**
 * The longest current streak, in days, among active habits: the "day run" shown
 * on Today. Weekly goals count in weeks, so they're left out.
 */
export function getLongestCurrentRun(
  habits: readonly Habit[],
  completions: readonly Completion[],
  today: DateKey,
): number {
  const byHabit = indexCompletionsByHabit(completions);
  let longest = 0;
  for (const habit of habits) {
    if (habit.archived) continue;
    const streak = getStreak(habit, byHabit.get(habit.id) ?? NO_COMPLETIONS, today);
    if (streak.unit === "days") longest = Math.max(longest, streak.current);
  }
  return longest;
}

/** The best day streak any of the given habits has reached. Weekly goals count in weeks, so they're left out. */
export function getBestRun(
  habits: readonly Habit[],
  completions: readonly Completion[],
  today: DateKey,
): number {
  const byHabit = indexCompletionsByHabit(completions);
  let best = 0;
  for (const habit of habits) {
    const streak = getStreak(habit, byHabit.get(habit.id) ?? NO_COMPLETIONS, today);
    if (streak.unit === "days") best = Math.max(best, streak.best);
  }
  return best;
}

/** Days averaged into each point of the completion trend. */
const TREND_SMOOTHING_DAYS = 7;

/**
 * The overall completion rate for each of the last `days` days, oldest first. Each
 * point averages the week ending that day, so a single bad day doesn't spike the line.
 * A point is null when nothing was expected in its week.
 */
export function getCompletionTrend(
  habits: readonly Habit[],
  completions: readonly Completion[],
  today: DateKey,
  days: number,
): (number | null)[] {
  return eachDay(addDays(today, 1 - days), today).map(
    (date) => getOverallCompletionRate(habits, completions, date, TREND_SMOOTHING_DAYS).rate,
  );
}

export type TodayProgress = {
  /** Due habits fully done today: the ring's "closed" count. */
  closed: number;
  /** Due habits done at their minimum version today. Counts for streaks, but isn't closed. */
  minimum: number;
  /** Habits due today, not counting ones skipped today. */
  due: number;
};

/** Numbers for the Today progress ring. */
export function getTodayProgress(
  habits: readonly Habit[],
  completions: readonly Completion[],
  today: DateKey,
): TodayProgress {
  const byHabit = indexCompletionsByHabit(completions);
  let closed = 0;
  let minimum = 0;
  let due = 0;
  for (const habit of habits) {
    const byDate = byHabit.get(habit.id) ?? NO_COMPLETIONS;
    const completion = byDate.get(today);
    if (completion?.kind === "skipped" || !isDueOn(habit, byDate, today)) continue;
    due += 1;
    if (completion?.kind === "full") closed += 1;
    else if (completion?.kind === "minimum") minimum += 1;
  }
  return { closed, minimum, due };
}
