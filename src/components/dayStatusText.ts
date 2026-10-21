import type { Schedule } from "../domain/habit";
import type { DayStatus } from "../domain/streaks";

const TEXT: Record<DayStatus, string> = {
  full: "Done",
  minimum: "Minimum version",
  skipped: "Skipped",
  missed: "Missed",
  pending: "Not done yet",
  off: "Not scheduled",
  inactive: "Before this habit started",
  future: "Upcoming",
};

/** How a day went, in words. Weekly goals have no fixed days, so their empty days are "Not logged". */
export function dayStatusText(status: DayStatus, schedule: Schedule): string {
  if (status === "off" && schedule.type === "weekly") return "Not logged";
  return TEXT[status];
}
