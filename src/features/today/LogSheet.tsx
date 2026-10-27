import clsx from "clsx";
import { format } from "date-fns";
import { useId, useState } from "react";
import { Button } from "../../components/Button";
import { CompletionMark } from "../../components/CompletionMark";
import { HabitIcon } from "../../components/HabitIcon";
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
      title={item && `${item.habit.name}${dateSuffix}`}
      icon={item && <HabitIcon emoji={item.habit.emoji} color={item.habit.color} size="xl" />}
      subtitle={item?.habit.identity && `“${item.habit.identity}”`}
      color={item?.habit.color}
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
      <div role="group" aria-label={`Log ${day}`} className="flex flex-col gap-2">
        {options.map(({ kind, label, description }, index) => {
          const current = completion?.kind === kind;
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={current}
              onClick={() => void log(kind)}
              className={clsx(
                "flex min-h-16 animate-rise items-center gap-3.25 rounded-tile border px-3.5 py-3 text-left active:scale-98 motion-safe:transition",
                current
                  ? "border-accent-text/60 bg-accent/7 shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_5%,transparent)]"
                  : "border-line bg-ink/1.5 hover:bg-raised/60",
              )}
              style={{ animationDelay: `${String(0.06 + index * 0.05)}s` }}
            >
              <CompletionMark kind={kind} color={habit.color} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{label}</span>
                <span className="mt-0.5 block text-note text-muted">{description}</span>
              </span>
              {current && (
                <span className="rounded-md bg-accent/10 px-1.75 py-0.75 font-mono text-micro tracking-widest text-accent-text">
                  NOW
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-field border border-line bg-well px-3.5 py-3 focus-within:border-accent-text/50">
        <label htmlFor={noteId} className="label mb-1.5 block">
          Note <span className="text-dim">· optional</span>
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
          className="block w-full resize-none bg-transparent text-base leading-snug text-ink focus:outline-none"
        />
        {!completion && (
          <p className="mt-1 text-note text-faint">Saved when you choose an option above.</p>
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
