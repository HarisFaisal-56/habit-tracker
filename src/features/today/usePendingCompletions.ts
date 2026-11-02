import { useCallback, useMemo, useState } from "react";
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

/**
 * After a write succeeds, how long a pending change may outlive it. Normally the
 * database reports the change back within milliseconds; this only matters if
 * something else changed the same day first, so the two never match.
 */
const SETTLE_TIMEOUT_MS = 3000;

type Result = {
  /** The saved completions with the user's latest changes applied, or undefined while loading. */
  completions: readonly Completion[] | undefined;
  /** Shows `change` now. It's dropped once `saved` reflects it, or straight away if `write` fails. */
  track: (change: PendingCompletion, write: Promise<unknown>) => void;
};

export function usePendingCompletions(saved: readonly Completion[] | undefined): Result {
  const [pending, setPending] = useState<PendingCompletions>(NO_PENDING);
  const [lastSaved, setLastSaved] = useState(saved);

  // New data from the database: forget the changes it now reflects. Adjusting
  // state during render (rather than in an effect) avoids a frame showing both.
  if (saved !== lastSaved) {
    setLastSaved(saved);
    if (saved) setPending(settlePending(pending, saved));
  }

  const merged = useMemo(() => saved && applyPending(saved, pending), [saved, pending]);

  // When the database reports back a tap that's already showing, keep the list
  // the screen already has, so nothing is recalculated or redrawn while the
  // orbit is still gliding.
  const [completions, setCompletions] = useState(merged);
  const unchanged =
    merged === completions ||
    (merged !== undefined && completions !== undefined && sameCompletions(merged, completions));
  if (!unchanged) setCompletions(merged);

  const track = useCallback((change: PendingCompletion, write: Promise<unknown>) => {
    const key = pendingKey(change.habitId, change.date);
    setPending((current) => new Map(current).set(key, change));
    const forget = () => {
      setPending((current) => {
        // A later change to the same day replaced this one; leave it be.
        if (current.get(key) !== change) return current;
        const next = new Map(current);
        next.delete(key);
        return next;
      });
    };
    write.then(
      () => {
        setTimeout(forget, SETTLE_TIMEOUT_MS);
      },
      // The caller reports the error; the day just shows what was saved.
      forget,
    );
  }, []);

  return { completions: unchanged ? completions : merged, track };
}
