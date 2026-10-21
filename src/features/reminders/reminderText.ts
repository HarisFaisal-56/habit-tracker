import { format, parse } from "date-fns";
import type { Habit } from "../../domain/habit";
import type { TimeOfDay } from "../../domain/reminders";
import type { AppNotification } from "../../platform/notifications";

/** "8:30 AM", in the user's usual clock style for English. */
export function formatReminderTime(time: TimeOfDay): string {
  return format(parse(time, "HH:mm", new Date(0)), "h:mm a");
}

/** The reminder for a habit: a nudge that offers the minimum version on busy days. */
export function reminderNotification(habit: Habit): AppNotification {
  let body: string;
  if (habit.minimumVersion) {
    body = `Short on time? “${habit.minimumVersion}” still counts.`;
  } else if (habit.identity) {
    body = `${habit.identity}.`;
  } else {
    body = "A small step today keeps your streak going.";
  }
  return { title: `${habit.emoji} Time for ${habit.name}`, body, tag: `reminder-${habit.id}` };
}
