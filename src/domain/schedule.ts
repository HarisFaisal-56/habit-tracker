import { isDone, type CompletionsByDate } from "./completions";
import { addDays, eachDay, getWeekday, maxDateKey, startOfWeek, type DateKey } from "./dates";
import type { Habit, Schedule } from "./habit";

/** A habit exists from its creation date onwards. */
export function isActiveOn(habit: Habit, date: DateKey): boolean {
  return date >= habit.createdAt;
}

/**
 * Whether the schedule expects the habit on this specific day. Weekly goals have
 * no fixed days, so this is always false for them; use `isDueOn` instead.
 */
export function isScheduledOn(schedule: Schedule, date: DateKey): boolean {
  switch (schedule.type) {
    case "daily":
      return true;
    case "days":
      return schedule.days.includes(getWeekday(date));
    case "weekly":
      return false;
  }
}

type Tally = { done: number; skipped: number };

function tally(byDate: CompletionsByDate, days: readonly DateKey[]): Tally {
  let done = 0;
  let skipped = 0;
  for (const day of days) {
    const completion = byDate.get(day);
    if (isDone(completion)) done += 1;
    else if (completion?.kind === "skipped") skipped += 1;
  }
  return { done, skipped };
}

export type WeekProgress = {
  weekStart: DateKey;
  /** Days done (full or minimum) so far this week, up to `today`. */
  done: number;
  /** Days skipped so far this week, up to `today`. */
  skipped: number;
  /** Days that need to be done by the end of the week. */
  target: number;
  met: boolean;
};

/**
 * Progress for the Monday-to-Sunday week containing `date`. Only days on or after
 * the habit's creation and on or before `today` count.
 *
 * - Weekly goals: target is `timesPerWeek`, lowered by one for each skipped day.
 * - Fixed schedules: target is the week's scheduled days, minus skipped ones.
 */
export function getWeekProgress(
  habit: Habit,
  byDate: CompletionsByDate,
  date: DateKey,
  today: DateKey,
): WeekProgress {
  const weekStart = startOfWeek(date);
  const weekEnd = addDays(weekStart, 6);
  const activeWeek = eachDay(maxDateKey(weekStart, habit.createdAt), weekEnd);
  const { done, skipped } = tally(
    byDate,
    activeWeek.filter((day) => day <= today),
  );

  let target: number;
  if (habit.schedule.type === "weekly") {
    target = Math.max(0, habit.schedule.timesPerWeek - skipped);
  } else {
    const { schedule } = habit;
    const scheduled = activeWeek.filter((day) => isScheduledOn(schedule, day));
    const skippedScheduled = scheduled.filter(
      (day) => day <= today && byDate.get(day)?.kind === "skipped",
    ).length;
    target = scheduled.length - skippedScheduled;
  }

  const met = target > 0 ? done >= target : done > 0;
  return { weekStart, done, skipped, target, met };
}

/**
 * Whether the habit should be done on `date`.
 *
 * - Archived habits and dates before creation are never due.
 * - Fixed schedules are due on their scheduled days.
 * - Weekly goals are due until the goal is met. Completions on `date` itself don't
 *   count towards that, so a habit stays due on the day it is checked off.
 */
export function isDueOn(habit: Habit, byDate: CompletionsByDate, date: DateKey): boolean {
  if (habit.archived || !isActiveOn(habit, date)) return false;
  if (habit.schedule.type !== "weekly") return isScheduledOn(habit.schedule, date);

  const weekSoFar = eachDay(maxDateKey(startOfWeek(date), habit.createdAt), date);
  const { done: doneBefore } = tally(byDate, weekSoFar.slice(0, -1));
  const { skipped } = tally(byDate, weekSoFar);
  return doneBefore < habit.schedule.timesPerWeek - skipped;
}
