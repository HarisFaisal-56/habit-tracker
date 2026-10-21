import { describe, expect, it } from "vitest";
import { makeCompletions } from "../test/factories";
import { indexCompletions, indexCompletionsByHabit, isDone } from "./completions";
import type { Completion } from "./habit";

const completion = (overrides: Partial<Completion>): Completion => ({
  id: "c",
  habitId: "a",
  date: "2025-01-01",
  kind: "full",
  ...overrides,
});

describe("isDone", () => {
  it("counts full and minimum, not skipped or missing", () => {
    expect(isDone(completion({ kind: "full" }))).toBe(true);
    expect(isDone(completion({ kind: "minimum" }))).toBe(true);
    expect(isDone(completion({ kind: "skipped" }))).toBe(false);
    expect(isDone(undefined)).toBe(false);
  });
});

describe("indexCompletions", () => {
  it("keys one habit's completions by date and ignores other habits", () => {
    const completions = [
      ...makeCompletions("a", { "2025-01-01": "full", "2025-01-02": "skipped" }),
      ...makeCompletions("b", { "2025-01-03": "full" }),
    ];

    const index = indexCompletions("a", completions);

    expect([...index.keys()]).toEqual(["2025-01-01", "2025-01-02"]);
    expect(index.get("2025-01-02")?.kind).toBe("skipped");
    expect(index.has("2025-01-03")).toBe(false);
  });

  it("keeps the strongest kind when a day has duplicates", () => {
    const index = indexCompletions("a", [
      completion({ id: "1", kind: "skipped" }),
      completion({ id: "2", kind: "full" }),
      completion({ id: "3", kind: "minimum" }),
    ]);

    expect(index.get("2025-01-01")?.id).toBe("2");
  });
});

describe("indexCompletionsByHabit", () => {
  it("groups completions per habit", () => {
    const byHabit = indexCompletionsByHabit([
      ...makeCompletions("a", { "2025-01-01": "full" }),
      ...makeCompletions("b", { "2025-01-01": "minimum", "2025-01-02": "full" }),
    ]);

    expect(byHabit.get("a")?.size).toBe(1);
    expect(byHabit.get("b")?.get("2025-01-01")?.kind).toBe("minimum");
    expect(byHabit.get("c")).toBeUndefined();
  });

  it("resolves duplicates the same way as indexCompletions", () => {
    const byHabit = indexCompletionsByHabit([
      completion({ id: "1", kind: "minimum" }),
      completion({ id: "2", kind: "skipped" }),
    ]);

    expect(byHabit.get("a")?.get("2025-01-01")?.id).toBe("1");
  });
});
