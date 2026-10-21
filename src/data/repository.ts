import type { DateKey } from "../domain/dates";
import type { Completion, CompletionKind, Habit, WeeklyReview } from "../domain/habit";

/** Fields the user chooses when creating a habit. The repository fills in the rest. */
export type NewHabit = Pick<Habit, "name" | "emoji" | "color" | "schedule"> &
  Partial<Pick<Habit, "identity" | "minimumVersion" | "reminderTime">>;

/** Editable habit fields. Ordering and archiving have their own methods. */
export type HabitChanges = Partial<Omit<Habit, "id" | "createdAt" | "sortOrder" | "archived">>;

export type CompletionInput = {
  habitId: string;
  date: DateKey;
  kind: CompletionKind;
  note?: string;
};

/** Filters for `listCompletions`. Date bounds are inclusive. */
export type CompletionQuery = {
  habitId?: string;
  from?: DateKey;
  to?: DateKey;
};

export type WeeklyReviewInput = Omit<WeeklyReview, "id">;

/** Everything the app stores, e.g. for backups. */
export type AppData = {
  habits: Habit[];
  completions: Completion[];
  weeklyReviews: WeeklyReview[];
};

/**
 * The only way the app reads or writes data. UI and stores depend on this type,
 * never on Dexie, so another implementation (e.g. sync) can be swapped in.
 */
export type HabitRepository = {
  /** Habits in display order. Archived habits are left out unless asked for. */
  listHabits(options?: { includeArchived?: boolean }): Promise<Habit[]>;
  getHabit(id: string): Promise<Habit | undefined>;
  /** Adds a habit created today, placed after all existing habits. */
  createHabit(input: NewHabit): Promise<Habit>;
  /** Throws if the habit doesn't exist. */
  updateHabit(id: string, changes: HabitChanges): Promise<Habit>;
  /** Throws if the habit doesn't exist. */
  setHabitArchived(id: string, archived: boolean): Promise<void>;
  /** Deletes the habit and all of its completions. */
  deleteHabit(id: string): Promise<void>;
  /**
   * Puts habits in the given order. Unknown ids are ignored; habits not listed
   * keep their relative order after the listed ones.
   */
  reorderHabits(orderedIds: readonly string[]): Promise<void>;

  /** Completions sorted by date. */
  listCompletions(query?: CompletionQuery): Promise<Completion[]>;
  /**
   * Sets the one completion for a habit on a day, replacing any existing one
   * (including its note). Throws for an unknown habit or an invalid date.
   */
  setCompletion(input: CompletionInput): Promise<Completion>;
  clearCompletion(habitId: string, date: DateKey): Promise<void>;

  /** Reviews, newest week first. */
  listWeeklyReviews(): Promise<WeeklyReview[]>;
  getWeeklyReview(weekStart: DateKey): Promise<WeeklyReview | undefined>;
  /** Creates or replaces the review for a week. `weekStart` must be a Monday. */
  saveWeeklyReview(input: WeeklyReviewInput): Promise<WeeklyReview>;

  /** All data, including archived habits. */
  exportData(): Promise<AppData>;
  /**
   * Replaces all data in one step. If anything fails, nothing changes.
   * The data must already be validated (see `parseBackup`).
   */
  replaceAllData(data: AppData): Promise<void>;
  /** Deletes everything. */
  clearAllData(): Promise<void>;
};
