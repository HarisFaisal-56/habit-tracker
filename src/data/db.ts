import { Dexie, type DexieOptions, type EntityTable } from "dexie";
import type { Completion, Habit, WeeklyReview } from "../domain/habit";

export const DB_NAME = "habit-tracker";

export type HabitDatabase = Dexie & {
  habits: EntityTable<Habit, "id">;
  completions: EntityTable<Completion, "id">;
  weeklyReviews: EntityTable<WeeklyReview, "id">;
};

/**
 * Opens (lazily) the IndexedDB database. Every schema change must be a new
 * `db.version(n)` block with an upgrade, never an edit to an existing version.
 * Pass `options.indexedDB` / `options.IDBKeyRange` to use another backend (tests).
 */
export function createDatabase(name: string = DB_NAME, options?: DexieOptions): HabitDatabase {
  const db = new Dexie(name, options) as HabitDatabase;

  db.version(1).stores({
    // Booleans can't be indexed in IndexedDB, so archived habits are filtered in memory.
    habits: "id, sortOrder",
    // One completion per habit per day, enforced by the unique compound index.
    completions: "id, &[habitId+date], habitId, date",
    weeklyReviews: "id, &weekStart",
  });

  return db;
}
