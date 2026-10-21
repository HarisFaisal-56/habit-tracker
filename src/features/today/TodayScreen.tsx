import { format } from "date-fns";
import { useMemo, useState } from "react";
import { useToday } from "../../app/useToday";
import { EmptyState } from "../../components/EmptyState";
import { ProgressRing } from "../../components/ProgressRing";
import { Screen } from "../../components/Screen";
import { useRepository } from "../../data/RepositoryContext";
import { useCompletions, useHabits } from "../../data/useData";
import { isDone } from "../../domain/completions";
import { parseDateKey } from "../../domain/dates";
import type { TodayProgress } from "../../domain/stats";
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

  const list = useMemo(
    () => (habits && completions ? buildTodayList(habits, completions, today) : undefined),
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
    <ul className="flex flex-col gap-2">
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
    <Screen title="Today" subtitle={format(parseDateKey(today), "EEEE, d MMMM")}>
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
          <ProgressCard progress={list.progress} />
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
              <h2
                id="other-heading"
                className="text-sm font-semibold text-stone-500 dark:text-stone-400"
              >
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

function ProgressCard({ progress: { done, due } }: { progress: TodayProgress }) {
  let headline: string;
  let detail: string;
  if (due === 0) {
    headline = "Nothing due today";
    detail = "Enjoy the rest. You can still log anything below.";
  } else if (done === due) {
    headline = "All done for today";
    detail = "Nice work. See you tomorrow.";
  } else {
    headline = `${String(due - done)} to go`;
    detail = "Tap a habit when it’s done. Press and hold for more options.";
  }

  const ring = (
    <ProgressRing value={due === 0 ? 0 : done / due}>
      <span className="text-lg font-semibold tabular-nums" aria-hidden="true">
        {done}/{due}
      </span>
    </ProgressRing>
  );

  return (
    <div className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm dark:bg-stone-900">
      {due > 0 ? (
        <div
          role="progressbar"
          aria-label="Habits done today"
          aria-valuemin={0}
          aria-valuemax={due}
          aria-valuenow={done}
          aria-valuetext={`${String(done)} of ${String(due)} done`}
        >
          {ring}
        </div>
      ) : (
        ring
      )}
      <div aria-live="polite">
        <p className="font-semibold">{headline}</p>
        <p className="text-sm text-stone-500 dark:text-stone-400">{detail}</p>
      </div>
    </div>
  );
}
