import { format } from "date-fns";
import { useEffect } from "react";
import { useToday } from "../../app/useToday";
import { useCompletions, useHabits } from "../../data/useData";
import { parseDateKey, type DateKey } from "../../domain/dates";
import { getRemindersForToday, type TimeOfDay } from "../../domain/reminders";
import {
  cancelScheduledNotifications,
  getNotificationPermission,
  scheduleNotifications,
} from "../../platform/notifications";
import { useSettings } from "../../store/settingsStore";
import { reminderNotification } from "./reminderText";

function atTime(date: DateKey, time: TimeOfDay): Date {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const at = parseDateKey(date);
  at.setHours(hours, minutes, 0, 0);
  return at;
}

/**
 * Keeps today's reminder schedule in step with the data: re-plans whenever a
 * habit or check-off changes, and at midnight. Logging a habit cancels its
 * reminder for the day.
 */
export function useReminders(): void {
  const enabled = useSettings((state) => state.remindersEnabled);
  const habits = useHabits();
  const completions = useCompletions();
  const today = useToday();

  useEffect(() => {
    if (!enabled || !habits || !completions || getNotificationPermission() !== "granted") {
      cancelScheduledNotifications();
      return;
    }
    const now = format(new Date(), "HH:mm");
    const plan = getRemindersForToday(habits, completions, today, now);
    scheduleNotifications(
      plan.map(({ habit, time }) => ({ ...reminderNotification(habit), at: atTime(today, time) })),
    );
    return cancelScheduledNotifications;
  }, [enabled, habits, completions, today]);
}
