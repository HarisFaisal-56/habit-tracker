import clsx from "clsx";
import { ArrowDown, ArrowUp, BellOff, BellRing, GripVertical, Plus, Repeat2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useToday } from "../../app/useToday";
import { Button, IconButton } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { habitCardStyle, habitColor, tint } from "../../components/habitColors";
import { HabitIcon } from "../../components/HabitIcon";
import { IdentityStatement } from "../../components/IdentityStatement";
import { Screen } from "../../components/Screen";
import { SegmentedControl } from "../../components/SegmentedControl";
import { useRepository } from "../../data/RepositoryContext";
import { useCompletions, useHabits } from "../../data/useData";
import {
  indexCompletionsByHabit,
  NO_COMPLETIONS,
  type CompletionsByDate,
} from "../../domain/completions";
import type { DateKey } from "../../domain/dates";
import type { Habit } from "../../domain/habit";
import { getStreak } from "../../domain/streaks";
import { formatReminderTime } from "../reminders/reminderText";
import { describeScheduleChip, summarizeHabits } from "./describeSchedule";
import { HabitSheet } from "./HabitSheet";
import { WeekDots } from "./WeekDots";

/** Opening /habits?new shows the add-habit sheet straight away. */
export const NEW_HABIT_PARAM = "new";

type SheetState = { mode: "closed" } | { mode: "new" } | { mode: "edit"; habitId: string };

type View = "active" | "archived";

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
  const [view, setView] = useState<View>("active");

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
      variant="cta"
      className="min-h-11.5 text-sm"
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
        !reordering &&
        view === "active" && (
          <IconButton
            label="Add habit"
            icon={Plus}
            variant="primary"
            strokeWidth={2.25}
            onClick={() => {
              setSheet({ mode: "new" });
            }}
          />
        )
      }
    >
      {habits && (
        <div
          className="flex animate-rise items-center justify-between gap-2"
          style={{ animationDelay: "0.05s" }}
        >
          <SegmentedControl
            label="Show"
            variant="pill"
            value={view}
            options={[
              { value: "active", label: "Active", count: active.length },
              { value: "archived", label: "Archived", count: archived.length },
            ]}
            onChange={(next: View) => {
              setView(next);
              setReordering(false);
            }}
          />
          {reordering && view === "active" && (
            <Button
              className="min-h-10 rounded-full"
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
              index={index}
              byDate={byHabit.get(habit.id) ?? NO_COMPLETIONS}
              today={today}
              onEdit={edit(habit)}
              onStartReorder={
                active.length > 1 && !reordering
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
          {archived.map((habit, index) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              index={index}
              byDate={byHabit.get(habit.id) ?? NO_COMPLETIONS}
              today={today}
              onEdit={edit(habit)}
            />
          ))}
        </ul>
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
  /** Position in the list, to stagger the entrance. */
  index: number;
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

/**
 * A habit as a card washed in its colour: emoji, name and identity, this week's
 * dots with the current run, and a footer with the schedule and reminder.
 */
function HabitRow({ habit, index, byDate, today, onEdit, onStartReorder, reorder }: HabitRowProps) {
  const { value } = habitColor(habit.color);
  const streak = getStreak(habit, byDate, today);
  const glow = tint(value, 0.55);

  const summary = (
    <span className={clsx("flex items-start gap-3.25", onStartReorder && "pr-8.5")}>
      <HabitIcon emoji={habit.emoji} color={habit.color} size="lg" glow />
      <span className="min-w-0 flex-1 pt-0.5">
        <span className="block truncate text-lg leading-tight font-medium tracking-tight">
          {habit.name}
        </span>
        <IdentityStatement
          identity={habit.identity}
          className="mt-1 truncate text-sm leading-snug"
        />
      </span>
    </span>
  );

  return (
    <li
      className={clsx("card relative animate-rise rounded-card", habit.archived && "opacity-60")}
      style={{
        ...habitCardStyle(habit.color, 0.1, 0.4),
        boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.04), 0 20px 40px -30px ${glow}`,
        animationDelay: `${String(0.08 + index * 0.05)}s`,
      }}
    >
      {reorder ? (
        <div className="flex flex-col px-4 pt-4 pb-3.5">
          {summary}
          <div className="-mt-2 flex justify-end gap-1.5">
            <IconButton
              label={`Move ${habit.name} up`}
              icon={ArrowUp}
              variant="round"
              disabled={!reorder.canMoveUp}
              onClick={() => {
                reorder.onMove(-1);
              }}
            />
            <IconButton
              label={`Move ${habit.name} down`}
              icon={ArrowDown}
              variant="round"
              disabled={!reorder.canMoveDown}
              onClick={() => {
                reorder.onMove(1);
              }}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onEdit}
          className="flex w-full flex-col rounded-card text-left active:scale-99 motion-safe:transition-transform"
        >
          <span className="flex w-full flex-col gap-3.5 px-4 pt-4">
            {summary}
            <span className="flex items-end justify-between gap-3">
              <WeekDots habit={habit} byDate={byDate} today={today} />
              <span className="flex flex-col items-end gap-0.75">
                <span
                  className="text-3xl leading-none font-extralight tracking-tight tabular-nums"
                  style={{ color: value, textShadow: `0 0 18px ${glow}` }}
                >
                  {habit.archived ? "–" : streak.current}
                </span>
                <span className="font-mono text-micro tracking-[0.12em] text-muted uppercase">
                  {streak.unit === "weeks" ? "week run" : "day run"}
                </span>
              </span>
            </span>
          </span>
          <span className="mt-3.5 flex w-full items-center justify-between gap-2.5 border-t border-ink/5 px-4 pt-2.75 pb-3 font-mono text-caption tracking-[0.08em] text-soft uppercase">
            <span className="flex min-w-0 items-center gap-1.75 overflow-hidden whitespace-nowrap">
              <Repeat2 aria-hidden="true" className="size-3 shrink-0 text-muted" />
              <span className="truncate">{describeScheduleChip(habit)}</span>
            </span>
            {habit.reminderTime ? (
              <span className="flex shrink-0 items-center gap-1.25 text-accent-text">
                <BellRing aria-hidden="true" className="size-3" />
                <span className="sr-only">Reminder at </span>
                {formatReminderTime(habit.reminderTime)}
              </span>
            ) : (
              <span className="flex shrink-0 items-center gap-1.25 text-dim">
                <BellOff aria-hidden="true" className="size-3" />
                No reminder
              </span>
            )}
          </span>
        </button>
      )}
      {onStartReorder && (
        <IconButton
          label="Reorder habits"
          icon={GripVertical}
          onClick={onStartReorder}
          className="absolute top-2.5 right-2 text-faint hover:bg-transparent [&_svg]:size-4"
        />
      )}
    </li>
  );
}
