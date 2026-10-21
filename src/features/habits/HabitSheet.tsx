import { Archive, ArchiveRestore, Trash } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/Button";
import { Sheet } from "../../components/Sheet";
import { useRepository } from "../../data/RepositoryContext";
import type { Habit } from "../../domain/habit";
import { HabitForm } from "./HabitForm";

type HabitSheetProps = {
  open: boolean;
  /** The habit to edit; omit to create a new one. */
  habit?: Habit;
  onClose: () => void;
};

export function HabitSheet({ open, habit, onClose }: HabitSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={habit ? "Edit habit" : "New habit"}>
      <HabitForm habit={habit} onDone={onClose} />
      {habit && <ManageHabit habit={habit} onDone={onClose} />}
    </Sheet>
  );
}

function ManageHabit({ habit, onDone }: { habit: Habit; onDone: () => void }) {
  const repository = useRepository();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    try {
      await action();
      onDone();
    } catch (caught) {
      console.error("Couldn't update habit", caught);
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <section
      aria-label="Manage habit"
      className="flex flex-col gap-2 border-t border-stone-200 pt-4 dark:border-stone-800"
    >
      {habit.archived ? (
        <>
          <Button
            variant="secondary"
            icon={ArchiveRestore}
            onClick={() => void run(() => repository.setHabitArchived(habit.id, false))}
          >
            Restore habit
          </Button>
          {confirmingDelete ? (
            <div role="group" aria-label="Confirm delete" className="flex flex-col gap-2">
              <p className="text-sm">
                Delete “{habit.name}” and all of its history? This can’t be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setConfirmingDelete(false);
                  }}
                >
                  Keep it
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => void run(() => repository.deleteHabit(habit.id))}
                >
                  Delete forever
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="danger"
              icon={Trash}
              onClick={() => {
                setConfirmingDelete(true);
              }}
            >
              Delete habit
            </Button>
          )}
        </>
      ) : (
        <>
          <Button
            variant="secondary"
            icon={Archive}
            onClick={() => void run(() => repository.setHabitArchived(habit.id, true))}
          >
            Archive habit
          </Button>
          <p className="text-center text-sm text-stone-500 dark:text-stone-400">
            Hides it from Today. Its history is kept and you can restore it any time.
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
          {error}
        </p>
      )}
    </section>
  );
}
