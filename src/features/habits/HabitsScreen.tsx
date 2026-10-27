import clsx from "clsx";
import { ArrowDown, ArrowUp, GripVertical, Plus } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { useToday } from "../../app/useToday";
import { Button, IconButton } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { HabitIcon } from "../../components/HabitIcon";
import { IdentityStatement } from "../../components/IdentityStatement";
import { Screen } from "../../components/Screen";
import { useRepository } from "../../data/RepositoryContext";
import { useCompletions, useHabits } from "../../data/useData";
import {
  indexCompletionsByHabit,
  NO_COMPLETIONS,
  type CompletionsByDate,
} from "../../domain/completions";
import type { DateKey } from "../../domain/dates";
import type { Habit } from "../../domain/habit";
import { formatReminderTime } from "../reminders/reminderText";
import { describeScheduleShort, summarizeHabits } from "./describeSchedule";
import { HabitSheet } from "./HabitSheet";
import { WeekDots } from "./WeekDots";

/** Opening /habits?new shows the add-habit sheet straight away. */
export const NEW_HABIT_PARAM = "new";

type SheetState = { mode: "closed" } | { mode: "new" } | { mode: "edit"; habitId: string };

export function HabitsScreen() {
  const habits = useHabits({ includeArchived: true });
  const completions = useCompletions();
  const today = useToday();
  const repository = useRepository();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sheet, setSheet] = useState<SheetState>(() =>
    searchParams.has(NEW_HABIT_PARAM) ? { mode: "new" } : { mode: "closed" },
  );
  const [reordering, setReordering] = useState(false);
  const [view, setView] = useState<"active" | "archived">("active");

  const byHabit = useMemo(() => indexCompletionsByHabit(completions ?? []), [completions]);
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

  const edit = (habit: Habit) => () => {
    setSheet({ mode: "edit", habitId: habit.id });
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
      title="Your habits"
      subtitle={habits && summarizeHabits(active)}
      glow="habits"
      actions={
        habits &&
        active.length > 0 &&
        !reordering && (
          <IconButton
            label="Add habit"
            icon={Plus}
            variant="primary"
            onClick={() => {
              setSheet({ mode: "new" });
            }}
          />
        )
      }
    >
      <div className="flex flex-col gap-4">
        {habits && (
          <div className="flex items-center justify-between gap-2">
            <div role="group" aria-label="Show" className="flex gap-2">
              <FilterPill
                selected={view === "active"}
                onClick={() => {
                  setView("active");
                }}
              >
                Active
              </FilterPill>
              <FilterPill
                selected={view === "archived"}
                onClick={() => {
                  setView("archived");
                  setReordering(false);
                }}
              >
                Archived · {archived.length}
              </FilterPill>
            </div>
            {reordering && (
              <Button
                variant="ghost"
                onClick={() => {
                  setReordering(false);
                }}
              >
                Done
              </Button>
            )}
          </div>
        )}

        {habits && view === "active" && active.length === 0 && (
          <EmptyState action={addButton}>
            No habits yet. Start with something small you want to do regularly.
          </EmptyState>
        )}

        {view === "active" && active.length > 0 && (
          <ul className="flex flex-col gap-3" aria-label="Your habits">
            {active.map((habit, index) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                byDate={byHabit.get(habit.id) ?? NO_COMPLETIONS}
                today={today}
                onEdit={edit(habit)}
                onStartReorder={
                  active.length > 1
                    ? () => {
                        setReordering(true);
                      }
                    : undefined
                }
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

        {habits && view === "archived" && archived.length === 0 && (
          <EmptyState>
            Nothing archived. Archive a habit to keep its history without seeing it every day.
          </EmptyState>
        )}

        {view === "archived" && archived.length > 0 && (
          <ul className="flex flex-col gap-3" aria-label="Archived habits">
            {archived.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                byDate={byHabit.get(habit.id) ?? NO_COMPLETIONS}
                today={today}
                onEdit={edit(habit)}
              />
            ))}
          </ul>
        )}
      </div>

      <HabitSheet
        open={sheet.mode === "new" || editing !== undefined}
        habit={editing}
        onClose={closeSheet}
      />
    </Screen>
  );
}

type FilterPillProps = {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
};

function FilterPill({ selected, onClick, children }: FilterPillProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        "touch-target h-9 rounded-full border border-line-strong px-4 font-medium motion-safe:transition-colors",
        selected ? "bg-raised text-soft" : "text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

type HabitRowProps = {
  habit: Habit;
  byDate: CompletionsByDate;
  today: DateKey;
  onEdit: () => void;
  /** Shows the grip that switches the list into reorder mode. */
  onStartReorder?: () => void;
  reorder?: {
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMove: (offset: number) => void;
  };
};

function HabitRow({ habit, byDate, today, onEdit, onStartReorder, reorder }: HabitRowProps) {
  const summary = (
    <span className="flex min-w-0 flex-1 items-start gap-3">
      <HabitIcon emoji={habit.emoji} color={habit.color} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg leading-tight font-medium">{habit.name}</span>
        <IdentityStatement
          identity={habit.identity}
          className="mt-1 truncate text-base leading-snug"
        />
      </span>
    </span>
  );
  const chip = [
    describeScheduleShort(habit.schedule),
    habit.minimumVersion && `Min ${habit.minimumVersion}`,
    habit.reminderTime && `reminder ${formatReminderTime(habit.reminderTime)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      className={clsx(
        "relative rounded-3xl border border-line bg-surface",
        habit.archived && "opacity-70",
      )}
    >
      {reorder ? (
        <div className="flex min-h-16 items-center gap-2 p-3.75 pr-2">
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
        <>
          <button
            type="button"
            onClick={onEdit}
            className="flex w-full flex-col gap-3 rounded-3xl p-3.75 pb-3 text-left"
          >
            <span className={clsx("flex", onStartReorder && "pr-8")}>{summary}</span>
            <span className="flex items-center justify-between gap-3">
              <WeekDots habit={habit} byDate={byDate} today={today} />
              <span className="label min-w-0 truncate rounded-full border border-line-strong px-3 py-1.5 text-soft">
                {chip}
              </span>
            </span>
          </button>
          {onStartReorder && (
            <IconButton
              label="Reorder habits"
              icon={GripVertical}
              onClick={onStartReorder}
              className="absolute top-2.5 right-2 [&_svg]:size-4"
            />
          )}
        </>
      )}
    </li>
  );
}
