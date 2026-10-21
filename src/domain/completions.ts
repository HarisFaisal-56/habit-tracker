import type { DateKey } from "./dates";
import type { Completion, CompletionKind } from "./habit";

/** One habit's completions keyed by date. */
export type CompletionsByDate = ReadonlyMap<DateKey, Completion>;

// If a day somehow has several completions (e.g. a merged import), the strongest kind wins.
const KIND_PRIORITY: Record<CompletionKind, number> = { full: 3, minimum: 2, skipped: 1 };

export const NO_COMPLETIONS: CompletionsByDate = new Map();

/** Full and minimum completions count as done; skips are neutral. */
export function isDone(completion: Completion | undefined): boolean {
  return completion?.kind === "full" || completion?.kind === "minimum";
}

function addToIndex(index: Map<DateKey, Completion>, completion: Completion): void {
  const existing = index.get(completion.date);
  if (!existing || KIND_PRIORITY[completion.kind] > KIND_PRIORITY[existing.kind]) {
    index.set(completion.date, completion);
  }
}

/** Index one habit's completions by date, ignoring other habits' completions. */
export function indexCompletions(
  habitId: string,
  completions: readonly Completion[],
): CompletionsByDate {
  const index = new Map<DateKey, Completion>();
  for (const completion of completions) {
    if (completion.habitId === habitId) {
      addToIndex(index, completion);
    }
  }
  return index;
}

/** Index completions for every habit at once: habit id -> date -> completion. */
export function indexCompletionsByHabit(
  completions: readonly Completion[],
): ReadonlyMap<string, CompletionsByDate> {
  const byHabit = new Map<string, Map<DateKey, Completion>>();
  for (const completion of completions) {
    let index = byHabit.get(completion.habitId);
    if (!index) {
      index = new Map();
      byHabit.set(completion.habitId, index);
    }
    addToIndex(index, completion);
  }
  return byHabit;
}
