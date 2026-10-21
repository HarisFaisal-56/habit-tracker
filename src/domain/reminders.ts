import { indexCompletionsByHabit, NO_COMPLETIONS } from "./completions";
import type { DateKey } from "./dates";
import type { Completion, Habit } from "./habit";
import { isDueOn } from "./schedule";

/** A local time of day as `HH:mm` (24-hour). Compares chronologically as a string. */
export type TimeOfDay = string;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isTimeOfDay(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export type ReminderPlanItem = { habit: Habit; time: TimeOfDay };

/**
 * Reminders still to come today, earliest first: habits that have a reminder
 * time, are due today, haven't been logged today (done or skipped), and whose
 * time is after `now`. Reminders whose time has passed are not sent late.
 */
export function getRemindersForToday(
  habits: readonly Habit[],
  completions: readonly Completion[],
  today: DateKey,
  now: TimeOfDay,
): ReminderPlanItem[] {
  const byHabit = indexCompletionsByHabit(completions);
  const plan: ReminderPlanItem[] = [];
  for (const habit of habits) {
    const time = habit.reminderTime;
    if (time === undefined || !isTimeOfDay(time) || time <= now) continue;
    const byDate = byHabit.get(habit.id) ?? NO_COMPLETIONS;
    if (byDate.has(today) || !isDueOn(habit, byDate, today)) continue;
    plan.push({ habit, time });
  }
  return plan.sort((a, b) => a.time.localeCompare(b.time));
}
