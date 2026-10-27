import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
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
    <section aria-label="Manage habit" className="flex flex-col gap-2 border-t border-ink/5 pt-4">
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
                  variant="secondary"
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
              variant="danger-ghost"
              icon={Trash2}
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
          <p className="text-center text-note text-faint">
            Hides it from Today. Its history is kept and you can restore it any time.
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
