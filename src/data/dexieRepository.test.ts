import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDatabase, type HabitDatabase } from "./db";
import { createDexieRepository } from "./dexieRepository";
import type { HabitRepository, NewHabit } from "./repository";

const reading: NewHabit = {
  name: "Read",
  emoji: "📚",
  color: "emerald",
  schedule: { type: "daily" },
};
const walking: NewHabit = { name: "Walk", emoji: "🚶", color: "sky", schedule: { type: "daily" } };
const journaling: NewHabit = {
  name: "Journal",
  emoji: "📓",
  color: "amber",
  schedule: { type: "weekly", timesPerWeek: 3 },
};

let db: HabitDatabase;
let repo: HabitRepository;

beforeEach(() => {
  // A fresh in-memory IndexedDB per test keeps tests independent.
  db = createDatabase("test", { indexedDB: new IDBFactory(), IDBKeyRange });
  repo = createDexieRepository(db);
  // Only fake Date: fake-indexeddb relies on real timers.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2025, 0, 15, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
  db.close();
});

describe("habits", () => {
  it("creates a habit with an id, today's date, the next sort order and not archived", async () => {
    const first = await repo.createHabit({ ...reading, identity: "I am a reader" });
    const second = await repo.createHabit(walking);

    expect(first).toMatchObject({
      ...reading,
      identity: "I am a reader",
      createdAt: "2025-01-15",
      sortOrder: 0,
      archived: false,
    });
    expect(first.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(second.sortOrder).toBe(1);
    expect(second.id).not.toBe(first.id);
    expect(await repo.getHabit(first.id)).toEqual(first);
  });

  it("uses the local date for createdAt late in the evening", async () => {
    vi.setSystemTime(new Date(2025, 0, 31, 23, 45)); // already Feb 1 in UTC
    expect((await repo.createHabit(reading)).createdAt).toBe("2025-01-31");
  });

  it("returns undefined for an unknown habit", async () => {
    expect(await repo.getHabit("missing")).toBeUndefined();
  });

  it("lists habits in sort order, leaving out archived ones unless asked", async () => {
    const a = await repo.createHabit(reading);
    const b = await repo.createHabit(walking);
    const c = await repo.createHabit(journaling);
    await repo.setHabitArchived(b.id, true);

    expect((await repo.listHabits()).map((h) => h.id)).toEqual([a.id, c.id]);
    expect((await repo.listHabits({ includeArchived: true })).map((h) => h.id)).toEqual([
      a.id,
      b.id,
      c.id,
    ]);
  });

  it("restores an archived habit", async () => {
    const habit = await repo.createHabit(reading);
    await repo.setHabitArchived(habit.id, true);
    await repo.setHabitArchived(habit.id, false);

    expect((await repo.getHabit(habit.id))?.archived).toBe(false);
  });

  it("updates editable fields and keeps the rest", async () => {
    const habit = await repo.createHabit(reading);
    const updated = await repo.updateHabit(habit.id, {
      name: "Read fiction",
      schedule: { type: "days", days: [1, 3] },
      minimumVersion: "One page",
    });

    expect(updated).toEqual({
      ...habit,
      name: "Read fiction",
      schedule: { type: "days", days: [1, 3] },
      minimumVersion: "One page",
    });
    expect(await repo.getHabit(habit.id)).toEqual(updated);
  });

  it("clears an optional field when it is updated to undefined", async () => {
    const habit = await repo.createHabit({ ...reading, minimumVersion: "One page" });
    await repo.updateHabit(habit.id, { minimumVersion: undefined });

    expect((await repo.getHabit(habit.id))?.minimumVersion).toBeUndefined();
  });

  it("can't change protected fields through updateHabit", async () => {
    const habit = await repo.createHabit(reading);
    // Simulates untyped input, e.g. from a form or a future sync payload.
    const sneaky = { id: "other", createdAt: "2020-01-01", sortOrder: 9, archived: true };
    const updated = await repo.updateHabit(habit.id, sneaky as never);

    expect(updated).toEqual(habit);
  });

  it("throws when updating or archiving an unknown habit", async () => {
    await expect(repo.updateHabit("missing", { name: "x" })).rejects.toThrow("Habit not found");
    await expect(repo.setHabitArchived("missing", true)).rejects.toThrow("Habit not found");
  });

  it("reorders habits, ignoring unknown ids and keeping unlisted ones after", async () => {
    const a = await repo.createHabit(reading);
    const b = await repo.createHabit(walking);
    const c = await repo.createHabit(journaling);

    await repo.reorderHabits([c.id, "missing", a.id, c.id]);

    const habits = await repo.listHabits();
    expect(habits.map((h) => h.id)).toEqual([c.id, a.id, b.id]);
    expect(habits.map((h) => h.sortOrder)).toEqual([0, 1, 2]);
  });

  it("deletes a habit along with only its own completions", async () => {
    const a = await repo.createHabit(reading);
    const b = await repo.createHabit(walking);
    await repo.setCompletion({ habitId: a.id, date: "2025-01-14", kind: "full" });
    await repo.setCompletion({ habitId: a.id, date: "2025-01-15", kind: "full" });
    await repo.setCompletion({ habitId: b.id, date: "2025-01-15", kind: "full" });

    await repo.deleteHabit(a.id);

    expect(await repo.getHabit(a.id)).toBeUndefined();
    expect((await repo.listCompletions()).map((c) => c.habitId)).toEqual([b.id]);
  });
});

describe("completions", () => {
  it("sets a completion, then replaces it on the same day without duplicating", async () => {
    const habit = await repo.createHabit(reading);

    const first = await repo.setCompletion({
      habitId: habit.id,
      date: "2025-01-15",
      kind: "full",
      note: "Great chapter",
    });
    const second = await repo.setCompletion({
      habitId: habit.id,
      date: "2025-01-15",
      kind: "minimum",
    });

    expect(second).toEqual({
      id: first.id,
      habitId: habit.id,
      date: "2025-01-15",
      kind: "minimum",
    });
    expect(await repo.listCompletions()).toEqual([second]);
  });

  it("rejects completions for unknown habits or invalid dates", async () => {
    const habit = await repo.createHabit(reading);

    await expect(
      repo.setCompletion({ habitId: "missing", date: "2025-01-15", kind: "full" }),
    ).rejects.toThrow("Habit not found");
    await expect(
      repo.setCompletion({ habitId: habit.id, date: "2025-1-15", kind: "full" }),
    ).rejects.toThrow(RangeError);
    expect(await repo.listCompletions()).toEqual([]);
  });

  it("lists completions by habit and inclusive date range, sorted by date", async () => {
    const a = await repo.createHabit(reading);
    const b = await repo.createHabit(walking);
    for (const date of ["2025-01-03", "2025-01-01", "2025-01-02", "2025-01-04"]) {
      await repo.setCompletion({ habitId: a.id, date, kind: "full" });
    }
    await repo.setCompletion({ habitId: b.id, date: "2025-01-02", kind: "skipped" });

    const dates = (list: { date: string }[]) => list.map((c) => c.date);

    expect(dates(await repo.listCompletions({ habitId: a.id }))).toEqual([
      "2025-01-01",
      "2025-01-02",
      "2025-01-03",
      "2025-01-04",
    ]);
    expect(
      dates(await repo.listCompletions({ habitId: a.id, from: "2025-01-02", to: "2025-01-03" })),
    ).toEqual(["2025-01-02", "2025-01-03"]);
    expect(dates(await repo.listCompletions({ habitId: a.id, from: "2025-01-04" }))).toEqual([
      "2025-01-04",
    ]);
    expect(dates(await repo.listCompletions({ habitId: a.id, to: "2025-01-01" }))).toEqual([
      "2025-01-01",
    ]);

    const onSecond = await repo.listCompletions({ from: "2025-01-02", to: "2025-01-02" });
    expect(onSecond.map((c) => c.habitId).sort()).toEqual([a.id, b.id].sort());
    expect(dates(await repo.listCompletions())).toEqual([
      "2025-01-01",
      "2025-01-02",
      "2025-01-02",
      "2025-01-03",
      "2025-01-04",
    ]);
  });

  it("clears a completion, and clearing a missing one is a no-op", async () => {
    const habit = await repo.createHabit(reading);
    await repo.setCompletion({ habitId: habit.id, date: "2025-01-15", kind: "full" });

    await repo.clearCompletion(habit.id, "2025-01-15");
    await repo.clearCompletion(habit.id, "2025-01-15");

    expect(await repo.listCompletions()).toEqual([]);
  });

  it("enforces one completion per habit per day in the database itself", async () => {
    const habit = await repo.createHabit(reading);
    await db.completions.add({ id: "1", habitId: habit.id, date: "2025-01-15", kind: "full" });

    await expect(
      db.completions.add({ id: "2", habitId: habit.id, date: "2025-01-15", kind: "skipped" }),
    ).rejects.toThrow();
  });
});

describe("weekly reviews", () => {
  const review = { wins: "Read daily", struggles: "Late nights", intention: "Sleep by 11" };

  it("saves a review, then replaces it for the same week", async () => {
    const first = await repo.saveWeeklyReview({ weekStart: "2025-01-13", ...review });
    const second = await repo.saveWeeklyReview({
      weekStart: "2025-01-13",
      ...review,
      intention: "Walk after lunch",
    });

    expect(second.id).toBe(first.id);
    expect(await repo.listWeeklyReviews()).toEqual([second]);
    expect(await repo.getWeeklyReview("2025-01-13")).toEqual(second);
  });

  it("lists reviews newest week first", async () => {
    for (const weekStart of ["2025-01-06", "2025-01-20", "2025-01-13"]) {
      await repo.saveWeeklyReview({ weekStart, ...review });
    }

    expect((await repo.listWeeklyReviews()).map((r) => r.weekStart)).toEqual([
      "2025-01-20",
      "2025-01-13",
      "2025-01-06",
    ]);
  });

  it("returns undefined for a week without a review", async () => {
    expect(await repo.getWeeklyReview("2025-01-13")).toBeUndefined();
  });

  it("only accepts weeks starting on a Monday", async () => {
    await expect(repo.saveWeeklyReview({ weekStart: "2025-01-15", ...review })).rejects.toThrow(
      "Monday",
    );
    await expect(repo.saveWeeklyReview({ weekStart: "not-a-date", ...review })).rejects.toThrow(
      RangeError,
    );
    expect(await repo.listWeeklyReviews()).toEqual([]);
  });
});
