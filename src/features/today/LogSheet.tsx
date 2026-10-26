import clsx from "clsx";
import { format } from "date-fns";
import { useId, useState } from "react";
import { Button } from "../../components/Button";
import { CompletionMark } from "../../components/CompletionMark";
import { IdentityStatement } from "../../components/IdentityStatement";
import { Sheet } from "../../components/Sheet";
import { useRepository } from "../../data/RepositoryContext";
import { parseDateKey, type DateKey } from "../../domain/dates";
import type { Completion, CompletionKind, Habit } from "../../domain/habit";

/** The habit being logged and its existing completion on that date, if any. */
export type LogTarget = { habit: Habit; completion: Completion | undefined };

const NOTE_MAX_LENGTH = 200;

type LogSheetProps = {
  /** The habit being logged; the sheet is closed when undefined. */
  item: LogTarget | undefined;
  date: DateKey;
  today: DateKey;
  onClose: () => void;
};

/** Options for logging a habit beyond a simple tap: minimum version, skip, note. */
export function LogSheet({ item, date, today, onClose }: LogSheetProps) {
  const isToday = date === today;
  const dateSuffix = isToday ? "" : ` · ${format(parseDateKey(date), "EEE d MMM")}`;
  return (
    <Sheet
      open={item !== undefined}
      onClose={onClose}
      title={item && `${item.habit.emoji} ${item.habit.name}${dateSuffix}`}
    >
      {item && <LogOptions item={item} date={date} isToday={isToday} onDone={onClose} />}
    </Sheet>
  );
}

function LogOptions({
  item,
  date,
  isToday,
  onDone,
}: {
  item: LogTarget;
  date: DateKey;
  isToday: boolean;
  onDone: () => void;
}) {
  const day = isToday ? "today" : "this day";
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
      label: `Skip ${day}`,
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
      <IdentityStatement identity={habit.identity} className="-mt-2" />
      <div role="group" aria-label={`Log ${day}`} className="flex flex-col gap-2">
        {options.map(({ kind, label, description }) => {
          const current = completion?.kind === kind;
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={current}
              onClick={() => void log(kind)}
              className={clsx(
                "flex min-h-14 items-center gap-3 rounded-2xl border p-3 text-left motion-safe:transition-colors",
                current
                  ? "border-accent-text bg-accent/10"
                  : "border-line hover:bg-raised active:bg-raised",
              )}
            >
              <CompletionMark kind={kind} color={habit.color} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{label}</span>
                <span className="block text-sm text-muted">{description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <label htmlFor={noteId} className="mb-1 block text-sm font-medium">
          Note <span className="font-normal text-muted">(optional)</span>
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
          className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-base text-ink placeholder:text-muted"
        />
        {!completion && (
          <p className="mt-1 text-sm text-muted">Saved when you choose an option above.</p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
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
            Clear {day}
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
