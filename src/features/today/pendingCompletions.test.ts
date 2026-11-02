import { describe, expect, it } from "vitest";
import type { Completion } from "../../domain/habit";
import {
  applyPending,
  NO_PENDING,
  pendingKey,
  sameCompletions,
  settlePending,
  type PendingCompletion,
  type PendingCompletions,
} from "./pendingCompletions";

const saved: Completion[] = [
  { id: "1", habitId: "read", date: "2025-01-06", kind: "full" },
  { id: "2", habitId: "run", date: "2025-01-07", kind: "minimum", note: "Short" },
  { id: "3", habitId: "read", date: "2025-01-08", kind: "skipped" },
];

function pendingOf(...changes: PendingCompletion[]): PendingCompletions {
  return new Map(changes.map((change) => [pendingKey(change.habitId, change.date), change]));
}

const done = (
  habitId: string,
  date: string,
  extra: Partial<Completion> = {},
): PendingCompletion => ({
  habitId,
  date,
  completion: { id: `pending-${habitId}`, habitId, date, kind: "full", ...extra },
});
const cleared = (habitId: string, date: string): PendingCompletion => ({
  habitId,
  date,
  completion: null,
});

describe("applyPending", () => {
  it("returns the saved list itself when nothing is pending", () => {
    expect(applyPending(saved, NO_PENDING)).toBe(saved);
  });

  it("replaces a saved day, adds a new one and removes a cleared one, keeping date order", () => {
    const result = applyPending(
      saved,
      pendingOf(
        done("read", "2025-01-08"),
        done("run", "2025-01-05"),
        cleared("read", "2025-01-06"),
      ),
    );

    expect(result.map(({ habitId, date, kind }) => `${habitId} ${date} ${kind}`)).toEqual([
      "run 2025-01-05 full",
      "run 2025-01-07 minimum",
      "read 2025-01-08 full",
    ]);
  });

  it("leaves the saved list untouched", () => {
    const copy = structuredClone(saved);
    applyPending(saved, pendingOf(cleared("read", "2025-01-06")));
    expect(saved).toEqual(copy);
  });
});

describe("sameCompletions", () => {
  it("matches the same days in any order, ignoring ids", () => {
    const shuffled = [saved[2], saved[0], { ...saved[1], id: "pending-run" }] as Completion[];
    expect(sameCompletions(saved, shuffled)).toBe(true);
  });

  it("notices a different kind, note or day", () => {
    const changed = (index: number, change: Partial<Completion>) =>
      saved.map((completion, i) => (i === index ? { ...completion, ...change } : completion));

    expect(sameCompletions(saved, changed(0, { kind: "minimum" }))).toBe(false);
    expect(sameCompletions(saved, changed(1, { note: "Long" }))).toBe(false);
    expect(sameCompletions(saved, changed(1, { note: undefined }))).toBe(false);
    expect(sameCompletions(saved, changed(2, { date: "2025-01-09" }))).toBe(false);
    expect(sameCompletions(saved, saved.slice(1))).toBe(false);
  });

  it("doesn't treat a list with a day twice as equal", () => {
    const twice = [saved[0], saved[0], saved[1]] as Completion[];
    expect(sameCompletions(twice, [saved[0], saved[1], saved[2]] as Completion[])).toBe(false);
  });
});

describe("settlePending", () => {
  it("drops changes the saved completions now reflect", () => {
    const pending = pendingOf(
      done("read", "2025-01-06"), // saved as full
      cleared("run", "2025-01-01"), // nothing saved that day
      done("read", "2025-01-08"), // still skipped in the database
    );

    const settled = settlePending(pending, saved);

    expect([...settled.keys()]).toEqual([pendingKey("read", "2025-01-08")]);
  });

  it("compares the note as well as the kind", () => {
    const pending = pendingOf(done("run", "2025-01-07", { kind: "minimum", note: "Longer" }));

    expect(settlePending(pending, saved)).toBe(pending);
  });

  it("keeps a clear until the completion is gone", () => {
    const pending = pendingOf(cleared("read", "2025-01-06"));

    expect(settlePending(pending, saved)).toBe(pending);
    expect(settlePending(pending, saved.slice(1)).size).toBe(0);
  });

  it("returns the same map when nothing settles", () => {
    expect(settlePending(NO_PENDING, saved)).toBe(NO_PENDING);
  });
});
