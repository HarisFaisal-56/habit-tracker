import { format } from "date-fns";
import { useMemo, useState } from "react";
import { useToday } from "../../app/useToday";
import { CompletionMark } from "../../components/CompletionMark";
import { dayStatusText } from "../../components/dayStatusText";
import { EmptyState } from "../../components/EmptyState";
import { HabitIcon } from "../../components/HabitIcon";
import { Heatmap, HeatmapLegend } from "../../components/Heatmap";
import { ProgressRing } from "../../components/ProgressRing";
import { Screen } from "../../components/Screen";
import { useCompletions, useHabits } from "../../data/useData";
import {
  indexCompletionsByHabit,
  NO_COMPLETIONS,
  type CompletionsByDate,
} from "../../domain/completions";
import {
  maxDateKey,
  minDateKey,
  parseDateKey,
  startOfMonth,
  type DateKey,
} from "../../domain/dates";
import type { Habit } from "../../domain/habit";
import { getDayStatus, type DayStatus } from "../../domain/streaks";
import { AddHabitLink } from "../habits/AddHabitLink";
import { buildHeatmap, getDayEntries, summarizeDay } from "./historyData";
import { MonthCalendar, type CalendarDay } from "./MonthCalendar";

const ALL_HABITS = "all";

export function HistoryScreen() {
  const today = useToday();
  const habits = useHabits({ includeArchived: true });
  const completions = useCompletions();
  const [filter, setFilter] = useState(ALL_HABITS);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState(today);

  const byHabit = useMemo(
    () => (completions ? indexCompletionsByHabit(completions) : undefined),
    [completions],
  );

  if (!habits || !byHabit) return <Screen title="History" />;

  if (habits.length === 0) {
    return (
      <Screen title="History">
        <EmptyState action={<AddHabitLink />}>
          Your calendar and year heatmaps will fill in as you check off habits.
        </EmptyState>
      </Screen>
    );
  }

  const active = habits.filter((habit) => !habit.archived);
  const archived = habits.filter((habit) => habit.archived);
  // A deleted habit falls back to showing everything.
  const habit = habits.find((h) => h.id === filter);
  const shown = habit ? [habit] : active;

  // Months before the earliest habit have nothing to show.
  const currentMonth = startOfMonth(today);
  const firstMonth = shown.reduce(
    (earliest, h) => minDateKey(earliest, startOfMonth(h.createdAt)),
    currentMonth,
  );
  const visibleMonth = minDateKey(maxDateKey(month, firstMonth), currentMonth);

  const getDay = (date: DateKey): CalendarDay => {
    if (habit) {
      const status = getDayStatus(habit, byHabit.get(habit.id) ?? NO_COMPLETIONS, date, today);
      return {
        mark: <StatusMark status={status} color={habit.color} />,
        description: dayStatusText(status, habit.schedule),
      };
    }
    const { done, expected } = summarizeDay(shown, byHabit, date, today);
    if (expected === 0) {
      return { mark: null, description: done > 0 ? `${String(done)} done` : "Nothing due" };
    }
    return {
      mark: <ProgressRing size="sm" value={done / expected} />,
      description: `${String(done)} of ${String(expected)} done`,
    };
  };

  return (
    <Screen title="History">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Habit
        <select
          value={habit ? habit.id : ALL_HABITS}
          onChange={(event) => {
            setFilter(event.target.value);
          }}
          className="min-h-11 rounded-xl border border-stone-300 bg-white px-3 text-base font-normal text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        >
          <option value={ALL_HABITS}>All habits</option>
          {active.map((h) => (
            <option key={h.id} value={h.id}>
              {h.emoji} {h.name}
            </option>
          ))}
          {archived.length > 0 && (
            <optgroup label="Archived">
              {archived.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.emoji} {h.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>

      <MonthCalendar
        month={visibleMonth}
        today={today}
        selected={selected}
        canGoBack={visibleMonth > firstMonth}
        canGoForward={visibleMonth < currentMonth}
        onMonthChange={setMonth}
        onSelect={setSelected}
        getDay={getDay}
      />

      <DayDetails habits={shown} byHabit={byHabit} date={selected} today={today} />

      <section aria-labelledby="year-heading" className="flex flex-col gap-3">
        <h2 id="year-heading" className="text-lg font-semibold">
          Last 12 months
        </h2>
        {shown.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            All your habits are archived. Pick one above to see its history.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {shown.map((h) => (
              <HabitHeatmap
                key={h.id}
                habit={h}
                byDate={byHabit.get(h.id) ?? NO_COMPLETIONS}
                today={today}
              />
            ))}
          </ul>
        )}
        <HeatmapLegend color={habit?.color} />
      </section>
    </Screen>
  );
}

function StatusMark({ status, color }: { status: DayStatus; color: string }) {
  switch (status) {
    case "full":
    case "minimum":
    case "skipped":
      return <CompletionMark kind={status} color={color} size="sm" />;
    case "pending":
      return <CompletionMark kind={undefined} color={color} size="sm" />;
    case "missed":
      return <span aria-hidden="true" className="size-1.5 rounded-full bg-stone-400" />;
    default:
      return null;
  }
}

type DayDetailsProps = {
  habits: readonly Habit[];
  byHabit: ReadonlyMap<string, CompletionsByDate>;
  date: DateKey;
  today: DateKey;
};

function DayDetails({ habits, byHabit, date, today }: DayDetailsProps) {
  const entries = getDayEntries(habits, byHabit, date, today);
  const heading = date === today ? "Today" : format(parseDateKey(date), "EEEE d MMMM");

  return (
    <section aria-labelledby="day-heading" className="flex flex-col gap-2">
      <h2 id="day-heading" aria-live="polite" className="text-lg font-semibold">
        {heading}
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">No habits on this day yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map(({ habit, status, completion }) => (
            <li
              key={habit.id}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm dark:bg-stone-900"
            >
              <HabitIcon emoji={habit.emoji} color={habit.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{habit.name}</p>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {dayStatusText(status, habit.schedule)}
                </p>
                {completion?.note && (
                  <p className="text-sm text-stone-500 italic dark:text-stone-400">
                    “{completion.note}”
                  </p>
                )}
              </div>
              <StatusMark status={status} color={habit.color} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HabitHeatmap({
  habit,
  byDate,
  today,
}: {
  habit: Habit;
  byDate: CompletionsByDate;
  today: DateKey;
}) {
  const data = useMemo(() => buildHeatmap(habit, byDate, today), [habit, byDate, today]);
  const { full, minimum, skipped, missed } = data.totals;
  const summary =
    `${habit.name}, last 12 months: ${String(full)} done, ${String(minimum)} minimum, ` +
    `${String(skipped)} skipped, ${String(missed)} missed`;

  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm dark:bg-stone-900">
      <div className="flex items-center gap-2">
        <span aria-hidden="true">{habit.emoji}</span>
        <h3 className="truncate font-medium">{habit.name}</h3>
        <span className="ml-auto shrink-0 text-sm text-stone-500 tabular-nums dark:text-stone-400">
          {full + minimum} done
        </span>
      </div>
      <Heatmap
        weeks={data.weeks}
        monthLabels={data.monthLabels}
        color={habit.color}
        schedule={habit.schedule}
        label={summary}
      />
    </li>
  );
}
