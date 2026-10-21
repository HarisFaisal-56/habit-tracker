import { indexCompletions, type CompletionsByDate } from "../domain/completions";
import type { DateKey } from "../domain/dates";
import type { Completion, CompletionKind, Habit } from "../domain/habit";

export function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "habit-1",
    name: "Read",
    emoji: "📚",
    color: "emerald",
    schedule: { type: "daily" },
    sortOrder: 0,
    createdAt: "2025-01-01",
    archived: false,
    ...overrides,
  };
}

/** Builds completions from a `{ date: kind }` map. */
export function makeCompletions(
  habitId: string,
  days: Record<DateKey, CompletionKind>,
): Completion[] {
  return Object.entries(days).map(([date, kind]) => ({
    id: `${habitId}:${date}`,
    habitId,
    date,
    kind,
  }));
}

/** Builds a habit's date index from a `{ date: kind }` map. */
export function makeIndex(habit: Habit, days: Record<DateKey, CompletionKind>): CompletionsByDate {
  return indexCompletions(habit.id, makeCompletions(habit.id, days));
}

/** `{ date: kind }` with the same kind on every listed date. */
export function on(kind: CompletionKind, ...dates: DateKey[]): Record<DateKey, CompletionKind> {
  return Object.fromEntries(dates.map((date) => [date, kind]));
}
