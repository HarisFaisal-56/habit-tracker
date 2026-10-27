import { format } from "date-fns";
import { dayStatusText } from "../../components/dayStatusText";
import type { HeatmapCell, HeatmapLevel } from "../../components/Heatmap";
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

/**
 * A few words on how a day went, e.g. "Strong day". Today, which isn't over
 * yet, says how much is still open instead.
 */
export function describeDayVerdict({ done, expected }: DaySummary, isToday: boolean): string {
  if (expected === 0) return "Nothing due";
  if (done >= expected) return "Every orbit closed";
  if (isToday) return `${String(expected - done)} still open`;
  const share = done / expected;
  if (share >= 0.75) return "Strong day";
  if (share >= 0.5) return "Kept the chain";
  return "A light day";
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

type MonthLabel = { week: number; label: string };

/**
 * `weekCount` columns of Monday-to-Sunday days ending with the current week, plus
 * short month names placed on the column containing the 1st of each month.
 */
function buildWeeks<Cell extends { date: DateKey }>(
  today: DateKey,
  weekCount: number,
  makeCell: (date: DateKey) => Cell,
): { weeks: Cell[][]; monthLabels: MonthLabel[] } {
  const firstMonday = addDays(startOfWeek(today), -7 * (weekCount - 1));
  const weeks: Cell[][] = [];
  const monthLabels: MonthLabel[] = [];
  for (let week = 0; week < weekCount; week += 1) {
    const monday = addDays(firstMonday, week * 7);
    const cells = eachDay(monday, addDays(monday, 6)).map(makeCell);
    const firstOfMonth = cells.find((cell) => cell.date.endsWith("-01"));
    if (firstOfMonth) {
      monthLabels.push({ week, label: format(parseDateKey(firstOfMonth.date), "MMM") });
    }
    weeks.push(cells);
  }
  return { weeks, monthLabels };
}

const HABIT_LEVEL: Record<DayStatus, HeatmapLevel | null> = {
  full: 4,
  minimum: 2,
  skipped: 1,
  missed: 0,
  pending: 0,
  off: 0,
  inactive: null,
  future: null,
};

export type HabitHeatmapCell = HeatmapCell & { status: DayStatus };

export type HeatmapData = {
  /** Columns of seven days, Monday first. The last column is the current week. */
  weeks: HabitHeatmapCell[][];
  /** Short month names, placed on the column containing the 1st of that month. */
  monthLabels: MonthLabel[];
  totals: Record<"full" | "minimum" | "skipped" | "missed", number>;
};

/** One habit's year: done days brightest, the minimum version half as bright. */
export function buildHeatmap(
  habit: Habit,
  byDate: CompletionsByDate,
  today: DateKey,
  weekCount: number = HEATMAP_WEEKS,
): HeatmapData {
  const totals: HeatmapData["totals"] = { full: 0, minimum: 0, skipped: 0, missed: 0 };
  const { weeks, monthLabels } = buildWeeks(today, weekCount, (date) => {
    const status = getDayStatus(habit, byDate, date, today);
    if (status === "full" || status === "minimum" || status === "skipped" || status === "missed") {
      totals[status] += 1;
    }
    return {
      date,
      status,
      level: HABIT_LEVEL[status],
      description: dayStatusText(status, habit.schedule),
    };
  });
  return { weeks, monthLabels, totals };
}

/** How bright a day is in the combined heatmap, from the share of check-ins done. */
export function getDayLevel({ done, expected }: DaySummary): HeatmapLevel {
  if (expected === 0) return done > 0 ? 4 : 0;
  const share = done / expected;
  if (share >= 1) return 4;
  if (share >= 0.75) return 3;
  if (share >= 0.5) return 2;
  return share > 0 ? 1 : 0;
}

export type YearHeatmapData = {
  weeks: HeatmapCell[][];
  monthLabels: MonthLabel[];
  /** Days with everything due done, and days with only some of it. */
  totals: { fullDays: number; partialDays: number };
};

/** Every given habit's year in one grid, each day as bright as the share of check-ins done. */
export function buildYearHeatmap(
  habits: readonly Habit[],
  byHabit: ReadonlyMap<string, CompletionsByDate>,
  today: DateKey,
  weekCount: number = HEATMAP_WEEKS,
): YearHeatmapData {
  const totals = { fullDays: 0, partialDays: 0 };
  const firstDay = habits.reduce<DateKey | null>(
    (earliest, habit) =>
      earliest === null || habit.createdAt < earliest ? habit.createdAt : earliest,
    null,
  );
  const { weeks, monthLabels } = buildWeeks(today, weekCount, (date): HeatmapCell => {
    if (date > today || firstDay === null || date < firstDay) {
      return { date, level: null, description: "" };
    }
    const day = summarizeDay(habits, byHabit, date, today);
    const level = getDayLevel(day);
    if (level === 4 && day.expected > 0) totals.fullDays += 1;
    else if (level > 0) totals.partialDays += 1;
    return {
      date,
      level,
      description:
        day.expected === 0
          ? day.done > 0
            ? `${String(day.done)} done`
            : "Nothing due"
          : `${String(day.done)} of ${String(day.expected)} done`,
    };
  });
  return { weeks, monthLabels, totals };
}

export type MonthSummary = {
  /** Share of the month's expected check-ins that were done, 0 to 1, or null with none expected. */
  rate: number | null;
  /** Days on which everything due was done. */
  fullDays: number;
};

/** How a month went across the given habits, counting days up to `today`. */
export function summarizeMonth(
  habits: readonly Habit[],
  byHabit: ReadonlyMap<string, CompletionsByDate>,
  month: DateKey,
  today: DateKey,
): MonthSummary {
  let done = 0;
  let expected = 0;
  let fullDays = 0;
  for (const date of eachDay(startOfMonth(month), endOfMonth(month))) {
    if (date > today) break;
    const day = summarizeDay(habits, byHabit, date, today);
    done += day.done;
    expected += day.expected;
    if (day.expected > 0 && day.done === day.expected) fullDays += 1;
  }
  return { rate: expected > 0 ? done / expected : null, fullDays };
}

/** How many different days have at least one habit done. */
export function countLoggedDays(completions: readonly Completion[]): number {
  const days = new Set<DateKey>();
  for (const { date, kind } of completions) {
    if (kind !== "skipped") days.add(date);
  }
  return days.size;
}
