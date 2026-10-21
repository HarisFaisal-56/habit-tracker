import { Dexie } from "dexie";
import { isDateKey, startOfWeek, today } from "../domain/dates";
import type { Completion, Habit, WeeklyReview } from "../domain/habit";
import type { HabitDatabase } from "./db";
import type { CompletionQuery, HabitRepository } from "./repository";

function assertDateKey(value: string): void {
  if (!isDateKey(value)) {
    throw new RangeError(`Invalid date: "${value}"`);
  }
}

function notFound(habitId: string): Error {
  return new Error(`Habit not found: ${habitId}`);
}

export function createDexieRepository(db: HabitDatabase): HabitRepository {
  function queryCompletions({ habitId, from, to }: CompletionQuery) {
    if (habitId !== undefined) {
      return db.completions
        .where("[habitId+date]")
        .between([habitId, from ?? Dexie.minKey], [habitId, to ?? Dexie.maxKey], true, true);
    }
    if (from !== undefined || to !== undefined) {
      return db.completions
        .where("date")
        .between(from ?? Dexie.minKey, to ?? Dexie.maxKey, true, true);
    }
    return db.completions.toCollection();
  }

  return {
    async listHabits({ includeArchived = false } = {}) {
      const habits = await db.habits.orderBy("sortOrder").toArray();
      return includeArchived ? habits : habits.filter((habit) => !habit.archived);
    },

    getHabit(id) {
      return db.habits.get(id);
    },

    createHabit(input) {
      return db.transaction("rw", db.habits, async () => {
        const last = await db.habits.orderBy("sortOrder").last();
        const habit: Habit = {
          ...input,
          id: crypto.randomUUID(),
          sortOrder: last ? last.sortOrder + 1 : 0,
          createdAt: today(),
          archived: false,
        };
        await db.habits.add(habit);
        return habit;
      });
    },

    updateHabit(id, changes) {
      return db.transaction("rw", db.habits, async () => {
        const existing = await db.habits.get(id);
        if (!existing) throw notFound(id);
        const updated: Habit = {
          ...existing,
          ...changes,
          id: existing.id,
          createdAt: existing.createdAt,
          sortOrder: existing.sortOrder,
          archived: existing.archived,
        };
        await db.habits.put(updated);
        return updated;
      });
    },

    setHabitArchived(id, archived) {
      return db.transaction("rw", db.habits, async () => {
        if (!(await db.habits.get(id))) throw notFound(id);
        await db.habits.update(id, { archived });
      });
    },

    deleteHabit(id) {
      return db.transaction("rw", db.habits, db.completions, async () => {
        await db.completions.where("habitId").equals(id).delete();
        await db.habits.delete(id);
      });
    },

    reorderHabits(orderedIds) {
      return db.transaction("rw", db.habits, async () => {
        const habits = await db.habits.orderBy("sortOrder").toArray();
        const byId = new Map(habits.map((habit) => [habit.id, habit]));
        const listed = [...new Set(orderedIds)].filter((id) => byId.has(id));
        const listedSet = new Set(listed);
        const unlisted = habits.filter((habit) => !listedSet.has(habit.id)).map((h) => h.id);
        await db.habits.bulkUpdate(
          [...listed, ...unlisted].map((id, index) => ({ key: id, changes: { sortOrder: index } })),
        );
      });
    },

    listCompletions(query = {}) {
      return queryCompletions(query).sortBy("date");
    },

    async setCompletion({ habitId, date, kind, note }) {
      assertDateKey(date);
      return db.transaction("rw", db.habits, db.completions, async () => {
        if (!(await db.habits.get(habitId))) throw notFound(habitId);
        const existing = await db.completions.where({ habitId, date }).first();
        const completion: Completion = {
          id: existing?.id ?? crypto.randomUUID(),
          habitId,
          date,
          kind,
          ...(note === undefined ? {} : { note }),
        };
        await db.completions.put(completion);
        return completion;
      });
    },

    async clearCompletion(habitId, date) {
      await db.completions.where({ habitId, date }).delete();
    },

    listWeeklyReviews() {
      return db.weeklyReviews.orderBy("weekStart").reverse().toArray();
    },

    getWeeklyReview(weekStart) {
      return db.weeklyReviews.where("weekStart").equals(weekStart).first();
    },

    async saveWeeklyReview(input) {
      assertDateKey(input.weekStart);
      if (startOfWeek(input.weekStart) !== input.weekStart) {
        throw new RangeError(`Week must start on a Monday: "${input.weekStart}"`);
      }
      return db.transaction("rw", db.weeklyReviews, async () => {
        const existing = await db.weeklyReviews.where("weekStart").equals(input.weekStart).first();
        const review: WeeklyReview = { ...input, id: existing?.id ?? crypto.randomUUID() };
        await db.weeklyReviews.put(review);
        return review;
      });
    },
  };
}
