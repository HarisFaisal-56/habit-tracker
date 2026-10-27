import { format, getDayOfYear } from "date-fns";
import { useMemo, useState } from "react";
import { useToday } from "../../app/useToday";
import { EmptyState } from "../../components/EmptyState";
import { OrbitRings } from "../../components/OrbitRings";
import { Screen } from "../../components/Screen";
import { useRepository } from "../../data/RepositoryContext";
import { useCompletions, useHabits } from "../../data/useData";
import { isDone } from "../../domain/completions";
import { parseDateKey } from "../../domain/dates";
import { getLongestCurrentRun, type TodayProgress } from "../../domain/stats";
import { useSettings } from "../../store/settingsStore";
import { AddHabitLink } from "../habits/AddHabitLink";
import { ReviewPrompt } from "../review/ReviewPrompt";
import { HabitTile } from "./HabitTile";
import { LogSheet } from "./LogSheet";
import { Welcome } from "./Welcome";
import { buildTodayList, type TodayItem } from "./todayList";

export function TodayScreen() {
  const today = useToday();
  const habits = useHabits();
  const completions = useCompletions();
  const repository = useRepository();
  const welcomeDismissed = useSettings((state) => state.welcomeDismissed);
  const [optionsFor, setOptionsFor] = useState<string | null>(null);

  const date = parseDateKey(today);
  const list = useMemo(
    () => (habits && completions ? buildTodayList(habits, completions, today) : undefined),
    [habits, completions, today],
  );
  const run = useMemo(
    () => (habits && completions ? getLongestCurrentRun(habits, completions, today) : 0),
    [habits, completions, today],
  );
  const optionsItem = list && [...list.due, ...list.other].find((i) => i.habit.id === optionsFor);

  const toggle = ({ habit, completion }: TodayItem) => {
    const change = isDone(completion)
      ? repository.clearCompletion(habit.id, today)
      : repository.setCompletion({
          habitId: habit.id,
          date: today,
          kind: "full",
          note: completion?.note,
        });
    change.catch((error: unknown) => {
      console.error("Couldn't update habit", error);
    });
  };

  const renderTiles = (items: TodayItem[]) => (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <HabitTile
          key={item.habit.id}
          item={item}
          onToggle={() => {
            toggle(item);
          }}
          onOpenOptions={() => {
            setOptionsFor(item.habit.id);
          }}
        />
      ))}
    </ul>
  );

  return (
    <Screen
      title="Today’s orbit"
      subtitle={`${format(date, "EEE · d MMM")} · Day ${String(getDayOfYear(date))}`}
      actions={run > 0 && <RunBadge days={run} />}
      actionsAt="top"
      glow="today"
    >
      {list &&
        habits?.length === 0 &&
        (welcomeDismissed ? (
          <EmptyState action={<AddHabitLink />}>
            Nothing to track yet. Add a habit and it will show up here every day it’s due.
          </EmptyState>
        ) : (
          <Welcome />
        ))}

      {list && habits && habits.length > 0 && (
        <>
          <OrbitCard items={list.due} progress={list.progress} />
          <ReviewPrompt today={today} />

          {list.due.length > 0 && (
            <section aria-labelledby="due-heading" className="flex flex-col gap-2">
              <h2 id="due-heading" className="sr-only">
                Due today
              </h2>
              {renderTiles(list.due)}
            </section>
          )}

          {list.other.length > 0 && (
            <section aria-labelledby="other-heading" className="mt-2 flex flex-col gap-2">
              <h2 id="other-heading" className="label">
                Not due today
              </h2>
              {renderTiles(list.other)}
            </section>
          )}
        </>
      )}

      <LogSheet
        item={optionsItem}
        date={today}
        today={today}
        onClose={() => {
          setOptionsFor(null);
        }}
      />
    </Screen>
  );
}

function RunBadge({ days }: { days: number }) {
  return (
    <p className="flex items-center gap-2.5 rounded-full border border-accent/35 bg-accent/10 py-1 pr-4 pl-3 text-sm text-soft">
      <OrbitIcon />
      <span>
        <span className="mr-1 text-base font-semibold text-accent-text tabular-nums">{days}</span>
        day run
      </span>
    </p>
  );
}

/** A ring with a planet on it, as on the run badge in the designs. */
function OrbitIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4.5 text-accent-text">
      <circle cx="10" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="10" cy="4" r="2.5" fill="currentColor" />
    </svg>
  );
}

function OrbitCard({
  items,
  progress: { closed, minimum, due },
}: {
  items: TodayItem[];
  progress: TodayProgress;
}) {
  // Only full completions close an orbit; the minimum version counts for the
  // streak but is shown separately.
  const open = due - closed - minimum;
  const keptAtMinimum = minimum > 0 ? `${String(minimum)} kept at minimum` : null;

  let status: string;
  if (due === 0) {
    status = "Nothing due today";
  } else if (open === 0) {
    status = "All done for today";
  } else {
    status = `${String(open)} ${open === 1 ? "orbit" : "orbits"} still open`;
  }
  if (due > 0 && keptAtMinimum) status += ` · ${keptAtMinimum}`;

  const rings = (
    <OrbitRings
      rings={items.map(({ habit, completion }) => ({
        id: habit.id,
        color: habit.color,
        kind: completion?.kind,
      }))}
    >
      <span aria-hidden="true" className="text-6xl leading-none font-extralight tabular-nums">
        {due === 0 ? "–" : closed}
        {due > 0 && <span className="text-2xl font-light text-muted">/{due}</span>}
      </span>
      <span aria-hidden="true" className="label mt-3">
        {due === 0 ? "Rest day" : "Closed"}
      </span>
    </OrbitRings>
  );

  return (
    <div className="flex flex-col gap-2">
      {due > 0 ? (
        <div
          role="progressbar"
          aria-label="Habits closed today"
          aria-valuemin={0}
          aria-valuemax={due}
          aria-valuenow={closed}
          aria-valuetext={`${String(closed)} of ${String(due)} closed${keptAtMinimum ? `, ${keptAtMinimum}` : ""}`}
        >
          {rings}
        </div>
      ) : (
        rings
      )}
      <p aria-live="polite" className="text-center leading-snug text-soft">
        {status}
      </p>
    </div>
  );
}
