import { useLiveQuery } from "dexie-react-hooks";
import type { Completion, Habit, WeeklyReview } from "../domain/habit";
import { useRepository } from "./RepositoryContext";

// These hooks re-run whenever the underlying Dexie tables change. A non-Dexie
// repository would need its own change notifications here; the UI wouldn't change.

/** Habits in display order, or undefined while loading. */
export function useHabits({ includeArchived = false } = {}): Habit[] | undefined {
  const repository = useRepository();
  return useLiveQuery(
    () => repository.listHabits({ includeArchived }),
    [repository, includeArchived],
  );
}

/** Weekly reviews, newest week first, or undefined while loading. */
export function useWeeklyReviews(): WeeklyReview[] | undefined {
  const repository = useRepository();
  return useLiveQuery(() => repository.listWeeklyReviews(), [repository]);
}

/** Every completion, sorted by date, or undefined while loading. */
export function useCompletions(): Completion[] | undefined {
  const repository = useRepository();
  return useLiveQuery(() => repository.listCompletions(), [repository]);
}
