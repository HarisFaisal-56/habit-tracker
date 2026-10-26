import { indexCompletionsByHabit, NO_COMPLETIONS } from "../../domain/completions";
import type { DateKey } from "../../domain/dates";
import type { Completion, Habit } from "../../domain/habit";
import { getWeekProgress, isDueOn, type WeekProgress } from "../../domain/schedule";
import { getTodayProgress, type TodayProgress } from "../../domain/stats";
import { getStreak, type StreakSummary } from "../../domain/streaks";
import { describeScheduleShort } from "../habits/describeSchedule";

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

/**
 * The short caption under a habit's name: its run, then its schedule or weekly
 * progress, e.g. "12d run · Daily" or "2d run · 2 of 3 this week".
 */
export function summarizeItem({ habit, streak, week }: TodayItem): ItemSummary {
  const parts: string[] = [];
  if (streak.current > 0) {
    parts.push(`${String(streak.current)}${streak.unit === "weeks" ? "w" : "d"} run`);
  }

  let tone: ItemSummary["tone"] = "normal";
  if (week) {
    if (week.target === 0) {
      parts.push("Excused this week");
    } else if (week.met) {
      parts.push("Goal met this week");
      tone = "success";
    } else {
      parts.push(`${String(week.done)} of ${String(week.target)} this week`);
    }
  } else {
    parts.push(describeScheduleShort(habit.schedule));
    if (streak.unit === "days" && streak.atRisk) {
      parts.push("don’t miss twice");
      tone = "warning";
    }
  }
  return { text: parts.join(" · "), tone };
}
