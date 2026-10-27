import clsx from "clsx";
import { format } from "date-fns";
import { useMemo, useState, type CSSProperties } from "react";
import { useToday } from "../../app/useToday";
import { dayStatusText } from "../../components/dayStatusText";
import { EmptyState } from "../../components/EmptyState";
import { habitColor } from "../../components/habitColors";
import { Heatmap } from "../../components/Heatmap";
import { PillSelect } from "../../components/PillSelect";
import { Screen } from "../../components/Screen";
import { useCompletions, useHabits } from "../../data/useData";
import {
  BACKFILL_DAYS,
  canLogOn,
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
import { getBestRun } from "../../domain/stats";
import { getDayStatus } from "../../domain/streaks";
import { AddHabitLink } from "../habits/AddHabitLink";
import { LogSheet } from "../today/LogSheet";
import {
  buildHeatmap,
  buildYearHeatmap,
  countLoggedDays,
  getDayEntries,
  summarizeDay,
  summarizeMonth,
  type DayEntry,
} from "./historyData";
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

  if (!habits || !completions || !byHabit) return <Screen title="History" />;

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
      const description = dayStatusText(status, habit.schedule);
      const color = habit.color;
      switch (status) {
        case "full":
          return { progress: 1, complete: true, color, description };
        case "minimum":
          return { progress: 0.5, color, description };
        case "skipped":
          return { progress: 0, skipped: true, color, description };
        default:
          return { progress: 0, color, description };
      }
    }
    const { done, expected } = summarizeDay(shown, byHabit, date, today);
    if (expected === 0) {
      return {
        progress: done > 0 ? 1 : 0,
        complete: done > 0,
        description: done > 0 ? `${String(done)} done` : "Nothing due",
      };
    }
    return {
      progress: done / expected,
      complete: done === expected,
      description: `${String(done)} of ${String(expected)} done`,
    };
  };

  const monthSummary = summarizeMonth(shown, byHabit, visibleMonth, today);
  const caption =
    monthSummary.rate === null
      ? undefined
      : `${String(Math.round(monthSummary.rate * 100))}% · ${String(monthSummary.fullDays)} full ${monthSummary.fullDays === 1 ? "day" : "days"}`;

  const filterSelect = (
    <PillSelect label="Habit" value={habit ? habit.id : ALL_HABITS} onChange={setFilter}>
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
    </PillSelect>
  );

  return (
    <Screen
      title="History"
      subtitle={`${String(countLoggedDays(completions))} days logged`}
      actions={filterSelect}
      glow="history"
    >
      <MonthCalendar
        month={visibleMonth}
        caption={caption}
        today={today}
        selected={selected}
        canGoBack={visibleMonth > firstMonth}
        canGoForward={visibleMonth < currentMonth}
        onMonthChange={setMonth}
        onSelect={setSelected}
        getDay={getDay}
      />

      <DayDetails habits={shown} byHabit={byHabit} date={selected} today={today} />

      <section aria-labelledby="year-heading" className="flex flex-col gap-3 px-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="year-heading" className="text-xl font-medium">
            A year in orbit
          </h2>
          <p className="section-label">Longest run {getBestRun(shown, completions, today)}d</p>
        </div>
        {shown.length === 0 && (
          <p className="text-sm text-muted">
            All your habits are archived. Pick one above to see its history.
          </p>
        )}
        {shown.length > 0 && habit && (
          <HabitHeatmap
            habit={habit}
            byDate={byHabit.get(habit.id) ?? NO_COMPLETIONS}
            today={today}
          />
        )}
        {shown.length > 0 && !habit && (
          <YearHeatmap habits={shown} byHabit={byHabit} today={today} />
        )}
      </section>
    </Screen>
  );
}

type DayDetailsProps = {
  habits: readonly Habit[];
  byHabit: ReadonlyMap<string, CompletionsByDate>;
  date: DateKey;
  today: DateKey;
};

function DayDetails({ habits, byHabit, date, today }: DayDetailsProps) {
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const entries = getDayEntries(habits, byHabit, date, today);
  const isToday = date === today;
  const day = parseDateKey(date);
  const loggable = canLogOn(date, today);
  const logging = entries.find((entry) => entry.habit.id === loggingId);
  const closed = entries.length > 0 ? summarizeDay(habits, byHabit, date, today) : undefined;
  const notes = entries.filter((entry) => entry.completion?.note);

  return (
    <>
      <section
        aria-labelledby="day-heading"
        className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-4"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="day-heading" aria-live="polite" className="section-label">
            {/* Short on screen, as in the designs; spelled out for screen readers. */}
            <span aria-hidden="true">
              {isToday ? `Today · ${format(day, "d MMM")}` : format(day, "EEE · d MMM")}
            </span>
            <span className="sr-only">{isToday ? "Today" : format(day, "EEEE d MMMM")}</span>
          </h2>
          {closed && closed.expected > 0 && (
            <p className="text-lg font-medium">
              {closed.done} of {closed.expected} closed
            </p>
          )}
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">No habits on this day yet.</p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-x-2 gap-y-2.5">
              {entries.map((entry) => (
                <li key={entry.habit.id}>
                  <DayChip
                    entry={entry}
                    onLog={
                      loggable && !entry.habit.archived
                        ? () => {
                            setLoggingId(entry.habit.id);
                          }
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
            {notes.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm text-muted">
                {notes.map(({ habit, completion }) => (
                  <li key={habit.id}>
                    <span className="text-soft">{habit.name}:</span>{" "}
                    <span className="italic">“{completion?.note}”</span>
                  </li>
                ))}
              </ul>
            )}
            {!isToday && (
              <p className="text-sm text-muted">
                {loggable
                  ? "Forgot to log? Tap a habit to update this day."
                  : `Only the last ${String(BACKFILL_DAYS)} days can be changed.`}
              </p>
            )}
          </>
        )}
      </section>
      <LogSheet
        item={logging}
        date={date}
        today={today}
        onClose={() => {
          setLoggingId(null);
        }}
      />
    </>
  );
}

/**
 * A habit on the chosen day, as a pill: filled in its colour when done, tinted
 * for the minimum version, dashed when skipped, and struck through when missed.
 */
function DayChip({ entry, onLog }: { entry: DayEntry; onLog?: () => void }) {
  const { habit, status } = entry;
  const { value } = habitColor(habit.color);
  let tone = "border-line-strong text-soft";
  let style: CSSProperties | undefined;
  if (status === "full") {
    tone = "border-transparent font-semibold text-on-habit";
    style = { backgroundColor: value };
  } else if (status === "minimum") {
    tone = "font-semibold text-ink";
    style = {
      borderColor: value,
      backgroundColor: `color-mix(in oklab, ${value} 22%, transparent)`,
    };
  } else if (status === "missed") {
    tone = "border-dashed border-ink/30 text-muted line-through";
  } else if (status === "skipped") {
    tone = "border-dashed border-ink/30 text-muted";
  } else if (status === "off") {
    tone = "border-line text-muted";
  }

  const content = (
    <>
      <span>{habit.name}</span>
      <span className="sr-only">, {dayStatusText(status, habit.schedule)}</span>
    </>
  );
  const chipClass = clsx("flex h-7.5 items-center rounded-full border px-3", tone);

  return onLog ? (
    <button
      type="button"
      onClick={onLog}
      className={clsx("touch-target hover:brightness-110", chipClass)}
      style={style}
    >
      {content}
    </button>
  ) : (
    <span className={chipClass} style={style}>
      {content}
    </span>
  );
}

type YearHeatmapProps = {
  habits: readonly Habit[];
  byHabit: ReadonlyMap<string, CompletionsByDate>;
  today: DateKey;
};

/** All habits in one grid, in the accent colour. */
function YearHeatmap({ habits, byHabit, today }: YearHeatmapProps) {
  const data = useMemo(() => buildYearHeatmap(habits, byHabit, today), [habits, byHabit, today]);
  const { fullDays, partialDays } = data.totals;
  return (
    <Heatmap
      weeks={data.weeks}
      monthLabels={data.monthLabels}
      label={`All habits, last 12 months: ${String(fullDays)} full days, ${String(partialDays)} partial days`}
    />
  );
}

type HabitHeatmapProps = {
  habit: Habit;
  byDate: CompletionsByDate;
  today: DateKey;
};

/** One habit's year, in its colour. */
function HabitHeatmap({ habit, byDate, today }: HabitHeatmapProps) {
  const data = useMemo(() => buildHeatmap(habit, byDate, today), [habit, byDate, today]);
  const { full, minimum, skipped, missed } = data.totals;
  const summary =
    `${habit.name}, last 12 months: ${String(full)} done, ${String(minimum)} minimum, ` +
    `${String(skipped)} skipped, ${String(missed)} missed`;
  return (
    <Heatmap
      weeks={data.weeks}
      monthLabels={data.monthLabels}
      color={habit.color}
      label={summary}
    />
  );
}
