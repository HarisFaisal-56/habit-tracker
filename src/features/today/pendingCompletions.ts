import type { DateKey } from "../../domain/dates";
import type { Completion } from "../../domain/habit";

// A tap shows straight away: the change is laid over the saved completions until
// the database reports it back. Writing to IndexedDB and re-reading every
// completion takes long enough on a phone to make the orbit feel slow to respond.

/** A change to one habit's day that the database hasn't reported back yet. */
export type PendingCompletion = {
  habitId: string;
  date: DateKey;
  /** The day's completion once saved, or null when it's being cleared. */
  completion: Completion | null;
};

export type PendingCompletions = ReadonlyMap<string, PendingCompletion>;

export const NO_PENDING: PendingCompletions = new Map();

export function pendingKey(habitId: string, date: DateKey): string {
  return `${habitId}|${date}`;
}

/**
 * The saved completions with pending changes applied, still sorted by date.
 * Returns `saved` itself when nothing is pending, so memoised work isn't redone.
 */
export function applyPending(
  saved: readonly Completion[],
  pending: PendingCompletions,
): readonly Completion[] {
  if (pending.size === 0) return saved;
  const result = saved.filter(({ habitId, date }) => !pending.has(pendingKey(habitId, date)));
  for (const { completion } of pending.values()) {
    if (completion) result.push(completion);
  }
  // Stable, so same-day completions keep their saved order.
  return result.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

function describe({ kind, note }: Completion): string {
  return note === undefined ? kind : `${kind}:${note}`;
}

/**
 * Whether two lists hold the same completions: the same kind and note for each
 * habit and day, in any order. Ids are ignored (a pending completion has a
 * stand-in id until it's saved); the Today screen never uses them.
 */
export function sameCompletions(a: readonly Completion[], b: readonly Completion[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  const byKey = new Map<string, string>();
  for (const completion of a) {
    byKey.set(pendingKey(completion.habitId, completion.date), describe(completion));
  }
  // A day listed twice: don't try to be clever.
  if (byKey.size !== a.length) return false;
  return b.every(
    (completion) =>
      byKey.get(pendingKey(completion.habitId, completion.date)) === describe(completion),
  );
}

function matches(saved: Completion | undefined, expected: Completion | null): boolean {
  if (!saved || !expected) return !saved && !expected;
  return saved.kind === expected.kind && saved.note === expected.note;
}

/**
 * Drops the pending changes that the saved completions now reflect. Returns
 * `pending` itself when nothing was dropped.
 */
export function settlePending(
  pending: PendingCompletions,
  saved: readonly Completion[],
): PendingCompletions {
  if (pending.size === 0) return pending;
  const savedByKey = new Map<string, Completion>();
  for (const completion of saved) {
    const key = pendingKey(completion.habitId, completion.date);
    if (pending.has(key)) savedByKey.set(key, completion);
  }
  let next: Map<string, PendingCompletion> | undefined;
  for (const [key, change] of pending) {
    if (matches(savedByKey.get(key), change.completion)) {
      next ??= new Map(pending);
      next.delete(key);
    }
  }
  return next ?? pending;
}
