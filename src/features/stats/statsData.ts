import { indexCompletionsByHabit, NO_COMPLETIONS } from "../../domain/completions";
import type { DateKey } from "../../domain/dates";
import type { Completion, Habit, Schedule } from "../../domain/habit";
import { getWeekProgress, type WeekProgress } from "../../domain/schedule";
import {
  getCompletionRate,
  getOverallCompletionRate,
  type CompletionRate,
} from "../../domain/stats";
import { getStreak, type StreakSummary } from "../../domain/streaks";

export type HabitStats = {
  habit: Habit;
  streak: StreakSummary;
  rate: CompletionRate;
  /** This week so far. */
  week: WeekProgress;
};

export type StatsOverview = {
  /** Across active habits. */
  overall: CompletionRate;
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
    habits: habits.map((habit) => {
      const byDate = byHabit.get(habit.id) ?? NO_COMPLETIONS;
      return {
        habit,
        streak: getStreak(habit, byDate, today),
        rate: getCompletionRate(habit, byDate, today, windowDays),
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
