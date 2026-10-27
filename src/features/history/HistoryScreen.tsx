import clsx from "clsx";
import { format } from "date-fns";
import { Check, Info, Moon } from "lucide-react";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useToday } from "../../app/useToday";
import { dayStatusText } from "../../components/dayStatusText";
import { EmptyState } from "../../components/EmptyState";
import { habitColor, tint } from "../../components/habitColors";
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
import type { Completion, Habit } from "../../domain/habit";
import { getBestRun } from "../../domain/stats";
import { getDayStatus } from "../../domain/streaks";
import { AddHabitLink } from "../habits/AddHabitLink";
import { LogSheet } from "../today/LogSheet";
import {
  buildHeatmap,
  buildYearHeatmap,
  countLoggedDays,
  describeDayVerdict,
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
      : {
          rate: `${String(Math.round(monthSummary.rate * 100))}%`,
          rest: `${String(monthSummary.fullDays)} full ${monthSummary.fullDays === 1 ? "day" : "days"}`,
        };

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
      gap="loose"
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

      <YearSection
        habit={habit}
        habits={shown}
        byHabit={byHabit}
        completions={completions}
        today={today}
      />
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
        className="card relative flex animate-rise flex-col gap-3.5 rounded-card p-4"
        style={{ animationDelay: "0.12s" }}
      >
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 id="day-heading" aria-live="polite" className="section-label">
              {/* Short on screen, as in the design; spelled out for screen readers. */}
              <span aria-hidden="true">
                {isToday ? `Today · ${format(day, "d MMM")}` : format(day, "EEE · d MMM")}
              </span>
              <span className="sr-only">{isToday ? "Today" : format(day, "EEEE d MMMM")}</span>
            </h2>
            {closed && (
              <p className="mt-1.5 text-md text-soft">{describeDayVerdict(closed, isToday)}</p>
            )}
          </div>
          {closed && closed.expected > 0 && (
            <p className="text-title leading-none font-extralight tabular-nums">
              <span aria-hidden="true">
                {closed.done}
                <span className="text-lead tracking-normal text-faint">/{closed.expected}</span>
              </span>
              <span className="sr-only">
                {closed.done} of {closed.expected} closed
              </span>
            </p>
          )}
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">No habits on this day yet.</p>
        ) : (
          <>
            <div aria-hidden="true" className="flex gap-1">
              {entries.map(({ habit, status }) => (
                <DaySegment key={habit.id} color={habit.color} status={status} />
              ))}
            </div>
            <ul className="flex flex-wrap gap-x-2 gap-y-2.25">
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
              <ul className="flex flex-col gap-1 border-t border-ink/5 pt-3 text-sm text-muted">
                {notes.map(({ habit, completion }) => (
                  <li key={habit.id}>
                    <span className="text-soft">{habit.name}:</span>{" "}
                    <span className="italic">“{completion?.note}”</span>
                  </li>
                ))}
              </ul>
            )}
            {!isToday && (
              <p className="flex items-center gap-1.75 text-note text-faint">
                <Info aria-hidden="true" className="size-3.25 shrink-0" />
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

/** One habit's share of the bar across the day card: lit when done, half lit at the minimum. */
function DaySegment({ color, status }: { color: string; status: DayEntry["status"] }) {
  const { value } = habitColor(color);
  let style: CSSProperties | undefined;
  if (status === "full") {
    style = { background: value, boxShadow: `0 0 10px ${tint(value, 0.55)}` };
  } else if (status === "minimum") {
    style = { background: `linear-gradient(90deg, ${value} 50%, ${tint(value, 0.2)} 50%)` };
  }
  return (
    <span
      className={clsx(
        "h-1.25 flex-1 rounded-xs motion-safe:transition-colors motion-safe:duration-300",
        !style && "bg-ink/7",
      )}
      style={style}
    />
  );
}

/**
 * A habit on the chosen day, as a pill: filled in its colour when done, tinted
 * for the minimum version, dashed when skipped, and struck through when missed.
 */
function DayChip({ entry, onLog }: { entry: DayEntry; onLog?: () => void }) {
  const { habit, status } = entry;
  const { value } = habitColor(habit.color);
  let tone = "border-line-strong bg-ink/1.5 font-medium text-soft";
  let style: CSSProperties | undefined;
  let icon: ReactNode = null;
  if (status === "full") {
    tone = "border-transparent pl-2.5 font-semibold text-accent-ink";
    style = {
      background: `radial-gradient(120% 140% at 30% 0%, #fff6, ${value} 55%)`,
      boxShadow: `0 8px 18px -8px ${tint(value, 0.8)}`,
    };
    icon = <Check className="size-3.5" strokeWidth={3} />;
  } else if (status === "minimum") {
    tone = "pl-2.5 font-semibold text-ink";
    style = { borderColor: tint(value, 0.8), backgroundColor: tint(value, 0.2) };
    icon = (
      <svg viewBox="0 0 12 12" className="size-2.75">
        <circle cx="6" cy="6" r="5.2" fill="none" stroke={value} strokeWidth="1.5" />
        <path d="M6 .8 A5.2 5.2 0 0 0 6 11.2 Z" fill={value} />
      </svg>
    );
  } else if (status === "missed") {
    tone = "border-dashed border-ink/25 font-medium text-muted line-through";
  } else if (status === "skipped") {
    tone = "border-dashed border-ink/25 pl-2.75 font-medium text-muted";
    icon = <Moon className="size-3" />;
  } else if (status === "off") {
    tone = "border-line font-medium text-dim";
  }

  const content = (
    <>
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{habit.name}</span>
      <span className="sr-only">, {dayStatusText(status, habit.schedule)}</span>
    </>
  );
  const chipClass = clsx(
    "flex h-8.5 items-center gap-1.5 rounded-full border pr-3.5 pl-3.5 text-md motion-safe:transition-all motion-safe:duration-250",
    tone,
  );

  return onLog ? (
    <button
      type="button"
      onClick={onLog}
      className={clsx("hover:brightness-110 active:scale-95", chipClass)}
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

type YearSectionProps = {
  /** The habit picked in the filter; all of `habits` otherwise. */
  habit: Habit | undefined;
  habits: readonly Habit[];
  byHabit: ReadonlyMap<string, CompletionsByDate>;
  completions: readonly Completion[];
  today: DateKey;
};

/** The year heatmap, with full days, partial days and the longest run underneath. */
function YearSection({ habit, habits, byHabit, completions, today }: YearSectionProps) {
  const longest = useMemo(
    () => getBestRun(habits, completions, today),
    [habits, completions, today],
  );
  const habitData = useMemo(
    () => (habit ? buildHeatmap(habit, byHabit.get(habit.id) ?? NO_COMPLETIONS, today) : null),
    [habit, byHabit, today],
  );
  const allData = useMemo(
    () => (!habit && habits.length > 0 ? buildYearHeatmap(habits, byHabit, today) : null),
    [habit, habits, byHabit, today],
  );

  let heatmap: ReactNode = null;
  let full = 0;
  let partial = 0;
  if (habit && habitData) {
    const { minimum, skipped, missed } = habitData.totals;
    full = habitData.totals.full;
    partial = minimum;
    heatmap = (
      <Heatmap
        weeks={habitData.weeks}
        monthLabels={habitData.monthLabels}
        color={habit.color}
        label={
          `${habit.name}, last 12 months: ${String(full)} done, ${String(minimum)} minimum, ` +
          `${String(skipped)} skipped, ${String(missed)} missed`
        }
      />
    );
  } else if (allData) {
    full = allData.totals.fullDays;
    partial = allData.totals.partialDays;
    heatmap = (
      <Heatmap
        weeks={allData.weeks}
        monthLabels={allData.monthLabels}
        label={`All habits, last 12 months: ${String(full)} full days, ${String(partial)} partial days`}
      />
    );
  }

  const fullColor = habit ? habitColor(habit.color).value : "var(--color-accent-text)";
  const tiles: { value: string; label: string; style?: CSSProperties }[] = [
    { value: String(full), label: "Full days", style: { color: fullColor } },
    { value: String(partial), label: "Partial" },
    { value: `${String(longest)}d`, label: "Longest run" },
  ];

  return (
    <section
      aria-labelledby="year-heading"
      className="flex animate-rise flex-col gap-3 px-1"
      style={{ animationDelay: "0.18s" }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="year-heading" className="text-heading font-medium">
          A year in orbit
        </h2>
        <p className="section-label">
          Longest run <span className="text-ink">{longest}d</span>
        </p>
      </div>
      {heatmap ?? (
        <p className="text-sm text-muted">
          All your habits are archived. Pick one above to see its history.
        </p>
      )}
      {heatmap && (
        <dl className="mt-1 grid grid-cols-3 gap-2">
          {tiles.map(({ value, label, style }) => (
            <div
              key={label}
              className="flex flex-col-reverse rounded-2xl border border-line bg-surface/60 px-3 py-2.5"
            >
              <dt className="mt-0.75 font-mono text-micro tracking-widest text-muted uppercase">
                {label}
              </dt>
              <dd className="text-xl font-light tabular-nums" style={style}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
