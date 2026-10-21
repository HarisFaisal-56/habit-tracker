import { indexCompletionsByHabit, NO_COMPLETIONS } from "../../domain/completions";
import type { DateKey } from "../../domain/dates";
import type { Completion, Habit } from "../../domain/habit";
import { getWeekProgress, isDueOn, type WeekProgress } from "../../domain/schedule";
import { getTodayProgress, type TodayProgress } from "../../domain/stats";
import { getStreak, type StreakSummary } from "../../domain/streaks";

export type TodayItem = {
  habit: Habit;
  /** Today's completion, if any. */
  completion: Completion | undefined;
  streak: StreakSummary;
  /** This week's progress, for weekly goals only. */
  week: WeekProgress | undefined;
};

export type TodayList = {
  /** Habits to do today, in display order. */
  due: TodayItem[];
  /** Other active habits, which can still be logged (e.g. a bonus day). */
  other: TodayItem[];
  progress: TodayProgress;
};

export function buildTodayList(
  habits: readonly Habit[],
  completions: readonly Completion[],
  today: DateKey,
): TodayList {
  const byHabit = indexCompletionsByHabit(completions);
  const due: TodayItem[] = [];
  const other: TodayItem[] = [];

  for (const habit of habits) {
    if (habit.archived) continue;
    const byDate = byHabit.get(habit.id) ?? NO_COMPLETIONS;
    const item: TodayItem = {
      habit,
      completion: byDate.get(today),
      streak: getStreak(habit, byDate, today),
      week:
        habit.schedule.type === "weekly" ? getWeekProgress(habit, byDate, today, today) : undefined,
    };
    // Decide the section without today's own entry, so a habit doesn't jump
    // between sections when it's checked off or skipped.
    const withoutToday = new Map(byDate);
    withoutToday.delete(today);
    (isDueOn(habit, withoutToday, today) ? due : other).push(item);
  }

  return { due, other, progress: getTodayProgress(habits, completions, today) };
}

export type ItemSummary = { text: string; tone: "normal" | "warning" | "success" };

/** The short line under a habit's name, or null when there's nothing to say yet. */
export function summarizeItem({ streak, week }: TodayItem): ItemSummary | null {
  if (week) {
    const streakText = streak.current > 0 ? ` · ${String(streak.current)}-week streak` : "";
    if (week.target === 0) return { text: `Excused this week${streakText}`, tone: "normal" };
    if (week.met) return { text: `Goal met this week${streakText}`, tone: "success" };
    return {
      text: `${String(week.done)} of ${String(week.target)} this week${streakText}`,
      tone: "normal",
    };
  }
  if (streak.current === 0) return null;
  const days = `${String(streak.current)}-day streak`;
  if (streak.unit === "days" && streak.atRisk) {
    return { text: `${days} · don’t miss twice`, tone: "warning" };
  }
  return { text: days, tone: "normal" };
}
