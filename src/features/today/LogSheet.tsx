import clsx from "clsx";
import { useId, useState } from "react";
import { Button } from "../../components/Button";
import { CompletionMark } from "../../components/CompletionMark";
import { Sheet } from "../../components/Sheet";
import { useRepository } from "../../data/RepositoryContext";
import type { DateKey } from "../../domain/dates";
import type { CompletionKind } from "../../domain/habit";
import type { TodayItem } from "./todayList";

const NOTE_MAX_LENGTH = 200;

type LogSheetProps = {
  /** The habit being logged; the sheet is closed when undefined. */
  item: TodayItem | undefined;
  date: DateKey;
  onClose: () => void;
};

/** Options for logging a habit beyond a simple tap: minimum version, skip, note. */
export function LogSheet({ item, date, onClose }: LogSheetProps) {
  return (
    <Sheet
      open={item !== undefined}
      onClose={onClose}
      title={item && `${item.habit.emoji} ${item.habit.name}`}
    >
      {item && <LogOptions item={item} date={date} onDone={onClose} />}
    </Sheet>
  );
}

function LogOptions({
  item,
  date,
  onDone,
}: {
  item: TodayItem;
  date: DateKey;
  onDone: () => void;
}) {
  const repository = useRepository();
  const { habit, completion } = item;
  const [note, setNote] = useState(completion?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const noteId = useId();

  const options: { kind: CompletionKind; label: string; description: string }[] = [
    { kind: "full", label: "Done", description: "Did the whole thing." },
    {
      kind: "minimum",
      label: "Minimum version",
      description: habit.minimumVersion
        ? `“${habit.minimumVersion}” still counts towards your streak.`
        : "A smaller version still counts towards your streak.",
    },
    {
      kind: "skipped",
      label: "Skip today",
      description: "Sick or away? Skipping won’t break your streak.",
    },
  ];

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      onDone();
    } catch (caught) {
      console.error("Couldn't log habit", caught);
      setError("Couldn't save. Please try again.");
    }
  }

  const trimmedNote = note.trim() === "" ? undefined : note.trim();
  const log = (kind: CompletionKind) =>
    run(() => repository.setCompletion({ habitId: habit.id, date, kind, note: trimmedNote }));

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Log today" className="flex flex-col gap-2">
        {options.map(({ kind, label, description }) => {
          const current = completion?.kind === kind;
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={current}
              onClick={() => void log(kind)}
              className={clsx(
                "flex min-h-14 items-center gap-3 rounded-2xl border-2 p-3 text-left motion-safe:transition-colors",
                current
                  ? "border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950"
                  : "border-stone-200 hover:bg-stone-50 active:bg-stone-100 dark:border-stone-800 dark:hover:bg-stone-800 dark:active:bg-stone-800",
              )}
            >
              <CompletionMark kind={kind} color={habit.color} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{label}</span>
                <span className="block text-sm text-stone-500 dark:text-stone-400">
                  {description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <label htmlFor={noteId} className="mb-1 block text-sm font-medium">
          Note <span className="font-normal text-stone-500">(optional)</span>
        </label>
        <textarea
          id={noteId}
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
          }}
          rows={2}
          maxLength={NOTE_MAX_LENGTH}
          placeholder="How did it go?"
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 placeholder:text-stone-400 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
        />
        {!completion && (
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Saved when you choose an option above.
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}

      {completion && (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => void run(() => repository.clearCompletion(habit.id, date))}
          >
            Clear today
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            disabled={trimmedNote === completion.note}
            onClick={() => void log(completion.kind)}
          >
            Save note
          </Button>
        </div>
      )}
    </div>
  );
}
