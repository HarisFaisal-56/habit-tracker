import clsx from "clsx";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { Button, IconButton } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { HabitIcon } from "../../components/HabitIcon";
import { Screen } from "../../components/Screen";
import { useRepository } from "../../data/RepositoryContext";
import { useHabits } from "../../data/useData";
import type { Habit } from "../../domain/habit";
import { describeSchedule } from "./describeSchedule";
import { HabitSheet } from "./HabitSheet";

/** Opening /habits?new shows the add-habit sheet straight away. */
export const NEW_HABIT_PARAM = "new";

type SheetState = { mode: "closed" } | { mode: "new" } | { mode: "edit"; habitId: string };

export function HabitsScreen() {
  const habits = useHabits({ includeArchived: true });
  const repository = useRepository();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sheet, setSheet] = useState<SheetState>(() =>
    searchParams.has(NEW_HABIT_PARAM) ? { mode: "new" } : { mode: "closed" },
  );
  const [reordering, setReordering] = useState(false);

  const active = habits?.filter((habit) => !habit.archived) ?? [];
  const archived = habits?.filter((habit) => habit.archived) ?? [];
  const editing = sheet.mode === "edit" ? habits?.find((h) => h.id === sheet.habitId) : undefined;

  const closeSheet = () => {
    setSheet({ mode: "closed" });
    if (searchParams.has(NEW_HABIT_PARAM)) setSearchParams({}, { replace: true });
  };

  const move = (index: number, offset: number) => {
    const ids = active.map((habit) => habit.id);
    const [moved] = ids.splice(index, 1);
    if (moved === undefined) return;
    ids.splice(index + offset, 0, moved);
    repository.reorderHabits(ids).catch((error: unknown) => {
      console.error("Couldn't reorder habits", error);
    });
  };

  const addButton = (
    <Button
      icon={Plus}
      onClick={() => {
        setSheet({ mode: "new" });
      }}
    >
      Add habit
    </Button>
  );

  return (
    <Screen
      title="Habits"
      actions={
        habits &&
        active.length > 0 && (
          <>
            {active.length > 1 && (
              <Button
                variant="ghost"
                icon={reordering ? undefined : ArrowUpDown}
                aria-pressed={reordering}
                onClick={() => {
                  setReordering((value) => !value);
                }}
              >
                {reordering ? "Done" : "Reorder"}
              </Button>
            )}
            {!reordering && (
              <IconButton
                label="Add habit"
                icon={Plus}
                onClick={() => {
                  setSheet({ mode: "new" });
                }}
                className="bg-emerald-700 text-white hover:bg-emerald-800 active:bg-emerald-800 dark:bg-emerald-600 dark:text-white"
              />
            )}
          </>
        )
      }
    >
      {habits && active.length === 0 && (
        <EmptyState action={addButton}>
          No habits yet. Start with something small you want to do regularly.
        </EmptyState>
      )}

      {active.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Your habits">
          {active.map((habit, index) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              onEdit={() => {
                setSheet({ mode: "edit", habitId: habit.id });
              }}
              reorder={
                reordering
                  ? {
                      canMoveUp: index > 0,
                      canMoveDown: index < active.length - 1,
                      onMove: (offset) => {
                        move(index, offset);
                      },
                    }
                  : undefined
              }
            />
          ))}
        </ul>
      )}

      {archived.length > 0 && !reordering && (
        <section aria-labelledby="archived-heading" className="mt-4 flex flex-col gap-2">
          <h2
            id="archived-heading"
            className="text-sm font-semibold text-stone-500 dark:text-stone-400"
          >
            Archived
          </h2>
          <ul className="flex flex-col gap-2" aria-label="Archived habits">
            {archived.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                onEdit={() => {
                  setSheet({ mode: "edit", habitId: habit.id });
                }}
              />
            ))}
          </ul>
        </section>
      )}

      <HabitSheet
        open={sheet.mode === "new" || editing !== undefined}
        habit={editing}
        onClose={closeSheet}
      />
    </Screen>
  );
}

type HabitRowProps = {
  habit: Habit;
  onEdit: () => void;
  reorder?: {
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMove: (offset: number) => void;
  };
};

function HabitRow({ habit, onEdit, reorder }: HabitRowProps) {
  const summary = (
    <>
      <HabitIcon emoji={habit.emoji} color={habit.color} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{habit.name}</span>
        <span className="block truncate text-sm text-stone-500 dark:text-stone-400">
          {describeSchedule(habit.schedule)}
        </span>
      </span>
    </>
  );

  return (
    <li
      className={clsx(
        "flex items-center rounded-2xl bg-white shadow-sm dark:bg-stone-900",
        habit.archived && "opacity-70",
      )}
    >
      {reorder ? (
        <div className="flex min-h-16 flex-1 items-center gap-3 p-3 pr-1">
          {summary}
          <IconButton
            label={`Move ${habit.name} up`}
            icon={ArrowUp}
            disabled={!reorder.canMoveUp}
            onClick={() => {
              reorder.onMove(-1);
            }}
          />
          <IconButton
            label={`Move ${habit.name} down`}
            icon={ArrowDown}
            disabled={!reorder.canMoveDown}
            onClick={() => {
              reorder.onMove(1);
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-16 flex-1 items-center gap-3 rounded-2xl p-3 text-left"
        >
          {summary}
          <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-stone-400" />
        </button>
      )}
    </li>
  );
}
