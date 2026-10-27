import { format } from "date-fns";
import { indexCompletionsByHabit, NO_COMPLETIONS } from "../../domain/completions";
import { addDays, parseDateKey, type DateKey } from "../../domain/dates";
import type { Completion, Habit, Schedule } from "../../domain/habit";
import { getWeekProgress, type WeekProgress } from "../../domain/schedule";
import {
  getBestRun,
  getCompletionRate,
  getCompletionTrend,
  getLongestCurrentRun,
  getOverallCompletionRate,
  type CompletionRate,
} from "../../domain/stats";
import { getStreak, type StreakSummary } from "../../domain/streaks";

export type HabitStats = {
  habit: Habit;
  streak: StreakSummary;
  rate: CompletionRate;
  /** The window just before the current one, for comparing. */
  previous: CompletionRate;
  /** This week so far. */
  week: WeekProgress;
};

export type StatsOverview = {
  /** Across active habits. */
  overall: CompletionRate;
  /** The window just before the current one, for comparing. */
  previous: CompletionRate;
  /** Overall rate per day over the window, oldest first. See `getCompletionTrend`. */
  trend: (number | null)[];
  /** Longest current and best day streaks among active habits. */
  run: { current: number; best: number };
  /** Every habit given, in the same order. */
  habits: HabitStats[];
};

export function buildStats(
  habits: readonly Habit[],
  completions: readonly Completion[],
  today: DateKey,
  windowDays: number,
): StatsOverview {
  const byHabit = indexCompletionsByHabit(completions);
  return {
    overall: getOverallCompletionRate(habits, completions, today, windowDays),
    previous: getOverallCompletionRate(
      habits,
      completions,
      addDays(today, -windowDays),
      windowDays,
    ),
    trend: getCompletionTrend(habits, completions, today, windowDays),
    run: {
      current: getLongestCurrentRun(habits, completions, today),
      best: getBestRun(
        habits.filter((habit) => !habit.archived),
        completions,
        today,
      ),
    },
    habits: habits.map((habit) => {
      const byDate = byHabit.get(habit.id) ?? NO_COMPLETIONS;
      return {
        habit,
        streak: getStreak(habit, byDate, today),
        rate: getCompletionRate(habit, byDate, today, windowDays),
        previous: getCompletionRate(habit, byDate, addDays(today, -windowDays), windowDays),
        week: getWeekProgress(habit, byDate, today, today),
      };
    }),
  };
}

/** "86%", or "–" when nothing was expected yet. */
export function formatRate(rate: number | null): string {
  return rate === null ? "–" : `${String(Math.round(rate * 100))}%`;
}

/** "1 day", "5 days", "2 weeks". */
export function formatStreak(count: number, unit: StreakSummary["unit"]): string {
  const word = unit === "days" ? "day" : "week";
  return `${String(count)} ${word}${count === 1 ? "" : "s"}`;
}

/** "2 of 3 times" for weekly goals, "3 of 5 days" for fixed schedules. */
export function formatWeekProgress(week: WeekProgress, schedule: Schedule): string {
  const isWeekly = schedule.type === "weekly";
  if (week.target === 0) return isWeekly ? "Excused this week" : "Nothing due this week";
  return `${String(week.done)} of ${String(week.target)} ${isWeekly ? "times" : "days"}`;
}

/** "+6 pts" or "-3 pts" between two rates, or null when either is missing. */
export function formatRateChange(current: number | null, previous: number | null): string | null {
  if (current === null || previous === null) return null;
  const points = Math.round(current * 100) - Math.round(previous * 100);
  const sign = points > 0 ? "+" : points < 0 ? "−" : "";
  return `${sign}${String(Math.abs(points))} pts`;
}

/** Habits by completion rate, best first; habits with nothing expected yet go last. */
export function rankByRate(habits: readonly HabitStats[]): HabitStats[] {
  return [...habits].sort((a, b) => (b.rate.rate ?? -1) - (a.rate.rate ?? -1));
}

/** Change in whole percentage points between two rates, or null when either is missing. */
export function getRateChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return Math.round(current * 100) - Math.round(previous * 100);
}

/**
 * Dates under the trend chart: where the window starts and its middle, e.g.
 * ["22 SEP", "6 OCT"]. The right end is always today.
 */
export function getTrendLabels(today: DateKey, windowDays: number): [string, string] {
  const label = (date: DateKey) => format(parseDateKey(date), "d MMM").toUpperCase();
  return [
    label(addDays(today, 1 - windowDays)),
    label(addDays(today, -Math.floor(windowDays / 2))),
  ];
}

type Point = { x: number; y: number };

/**
 * A smooth SVG path through the points: each step is a cubic curve with both
 * control points halfway across, so the line eases between values without
 * overshooting them.
 */
export function smoothPath(points: readonly Point[]): string {
  const fixed = (n: number) => n.toFixed(1);
  return points
    .map((point, index) => {
      const previous = points[index - 1];
      if (!previous) return `M${fixed(point.x)} ${fixed(point.y)}`;
      const middle = fixed((previous.x + point.x) / 2);
      return `C${middle} ${fixed(previous.y)} ${middle} ${fixed(point.y)} ${fixed(point.x)} ${fixed(point.y)}`;
    })
    .join(" ");
}
