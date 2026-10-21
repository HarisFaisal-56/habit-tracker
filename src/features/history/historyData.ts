import { format } from "date-fns";
import type { HeatmapCell } from "../../components/Heatmap";
import { NO_COMPLETIONS, type CompletionsByDate } from "../../domain/completions";
import {
  addDays,
  eachDay,
  endOfMonth,
  getWeekday,
  parseDateKey,
  startOfMonth,
  startOfWeek,
  type DateKey,
} from "../../domain/dates";
import type { Completion, Habit } from "../../domain/habit";
import { getDayStatus, type DayStatus } from "../../domain/streaks";

/** Weeks of a month, Monday first. `null` pads the days outside the month. */
export type MonthGrid = (DateKey | null)[][];

export function getMonthGrid(month: DateKey): MonthGrid {
  const first = startOfMonth(month);
  const leading = (getWeekday(first) + 6) % 7; // days before the 1st, counting from Monday
  const cells: (DateKey | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...eachDay(first, endOfMonth(month)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: MonthGrid = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

export type DaySummary = {
  /** Habits done (full or minimum) that day. */
  done: number;
  /** Habits done, missed, or still to do (today). Weekly goals only count when done. */
  expected: number;
};

/** How a day went across the given habits. Archived habits are left out. */
export function summarizeDay(
  habits: readonly Habit[],
  byHabit: ReadonlyMap<string, CompletionsByDate>,
  date: DateKey,
  today: DateKey,
): DaySummary {
  let done = 0;
  let expected = 0;
  for (const habit of habits) {
    if (habit.archived) continue;
    const status = getDayStatus(habit, byHabit.get(habit.id) ?? NO_COMPLETIONS, date, today);
    if (status === "full" || status === "minimum") {
      done += 1;
      expected += 1;
    } else if (status === "missed" || status === "pending") {
      expected += 1;
    }
  }
  return { done, expected };
}

export type DayEntry = {
  habit: Habit;
  status: DayStatus;
  completion: Completion | undefined;
};

/** Each habit that existed on `date`, with how that day went. */
export function getDayEntries(
  habits: readonly Habit[],
  byHabit: ReadonlyMap<string, CompletionsByDate>,
  date: DateKey,
  today: DateKey,
): DayEntry[] {
  return habits.flatMap((habit) => {
    const byDate = byHabit.get(habit.id) ?? NO_COMPLETIONS;
    const status = getDayStatus(habit, byDate, date, today);
    if (status === "inactive" || status === "future") return [];
    return [{ habit, status, completion: byDate.get(date) }];
  });
}

/** Columns in the year heatmap: the current week plus the 52 before it. */
export const HEATMAP_WEEKS = 53;

export type HeatmapData = {
  /** Columns of seven days, Monday first. The last column is the current week. */
  weeks: HeatmapCell[][];
  /** Short month names, placed on the column containing the 1st of that month. */
  monthLabels: { week: number; label: string }[];
  totals: Record<"full" | "minimum" | "skipped" | "missed", number>;
};

export function buildHeatmap(
  habit: Habit,
  byDate: CompletionsByDate,
  today: DateKey,
  weekCount: number = HEATMAP_WEEKS,
): HeatmapData {
  const firstMonday = addDays(startOfWeek(today), -7 * (weekCount - 1));
  const weeks: HeatmapCell[][] = [];
  const monthLabels: HeatmapData["monthLabels"] = [];
  const totals: HeatmapData["totals"] = { full: 0, minimum: 0, skipped: 0, missed: 0 };

  for (let week = 0; week < weekCount; week += 1) {
    const monday = addDays(firstMonday, week * 7);
    const cells = eachDay(monday, addDays(monday, 6)).map((date) => {
      const status = getDayStatus(habit, byDate, date, today);
      if (
        status === "full" ||
        status === "minimum" ||
        status === "skipped" ||
        status === "missed"
      ) {
        totals[status] += 1;
      }
      return { date, status };
    });
    const firstOfMonth = cells.find((cell) => cell.date.endsWith("-01"));
    if (firstOfMonth) {
      monthLabels.push({ week, label: format(parseDateKey(firstOfMonth.date), "MMM") });
    }
    weeks.push(cells);
  }

  return { weeks, monthLabels, totals };
}
