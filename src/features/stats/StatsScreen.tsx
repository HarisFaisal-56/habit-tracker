import clsx from "clsx";
import { useMemo, useState } from "react";
import { useToday } from "../../app/useToday";
import { EmptyState } from "../../components/EmptyState";
import { HabitIcon } from "../../components/HabitIcon";
import { habitColor } from "../../components/habitColors";
import { Screen } from "../../components/Screen";
import { SegmentedControl } from "../../components/SegmentedControl";
import { useCompletions, useHabits } from "../../data/useData";
import { COMPLETION_RATE_WINDOWS } from "../../domain/stats";
import { AddHabitLink } from "../habits/AddHabitLink";
import { describeSchedule } from "../habits/describeSchedule";
import { buildStats, formatRate, formatStreak, type HabitStats } from "./statsData";

type RateWindow = (typeof COMPLETION_RATE_WINDOWS)[number];

const WINDOW_OPTIONS = COMPLETION_RATE_WINDOWS.map((days) => ({
  value: days,
  label: `${String(days)} days`,
}));

export function StatsScreen() {
  const today = useToday();
  const habits = useHabits({ includeArchived: true });
  const completions = useCompletions();
  const [windowDays, setWindowDays] = useState<RateWindow>(30);

  const stats = useMemo(
    () => (habits && completions ? buildStats(habits, completions, today, windowDays) : undefined),
    [habits, completions, today, windowDays],
  );

  if (!stats) return <Screen title="Stats" />;

  if (stats.habits.length === 0) {
    return (
      <Screen title="Stats">
        <EmptyState action={<AddHabitLink />}>
          Streaks and completion rates will show up here once you have a habit.
        </EmptyState>
      </Screen>
    );
  }

  const active = stats.habits.filter((s) => !s.habit.archived);
  const archived = stats.habits.filter((s) => s.habit.archived);

  return (
    <Screen title="Stats">
      <SegmentedControl
        label="Time range"
        options={WINDOW_OPTIONS}
        value={windowDays}
        onChange={setWindowDays}
      />

      <div className="rounded-3xl bg-white p-4 shadow-sm dark:bg-stone-900">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Completion rate, last {windowDays} days
        </p>
        <p className="text-4xl font-semibold tabular-nums" aria-live="polite">
          {formatRate(stats.overall.rate)}
        </p>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {stats.overall.rate === null
            ? "Nothing was due in this period yet."
            : `Across ${String(active.length)} active habit${active.length === 1 ? "" : "s"}. Skipped days don’t count against you.`}
        </p>
      </div>

      {active.length > 0 && (
        <ul aria-label="Active habits" className="flex flex-col gap-3">
          {active.map((habitStats) => (
            <HabitStatsCard key={habitStats.habit.id} stats={habitStats} windowDays={windowDays} />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <section aria-labelledby="archived-stats-heading" className="mt-2 flex flex-col gap-2">
          <h2
            id="archived-stats-heading"
            className="text-sm font-semibold text-stone-500 dark:text-stone-400"
          >
            Archived
          </h2>
          <ul aria-label="Archived habits" className="flex flex-col gap-3">
            {archived.map((habitStats) => (
              <HabitStatsCard
                key={habitStats.habit.id}
                stats={habitStats}
                windowDays={windowDays}
              />
            ))}
          </ul>
        </section>
      )}
    </Screen>
  );
}

function HabitStatsCard({ stats, windowDays }: { stats: HabitStats; windowDays: number }) {
  const { habit, streak, rate, week } = stats;
  const isWeekly = habit.schedule.type === "weekly";
  const atRisk = streak.unit === "days" && streak.atRisk;

  let weekText: string;
  if (week.target === 0) {
    weekText = isWeekly ? "Excused this week" : "Nothing due this week";
  } else {
    weekText = `${String(week.done)} of ${String(week.target)} ${isWeekly ? "times" : "days"}`;
  }

  return (
    <li
      className={clsx(
        "flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900",
        habit.archived && "opacity-80",
      )}
    >
      <div className="flex items-center gap-3">
        <HabitIcon emoji={habit.emoji} color={habit.color} />
        <div className="min-w-0">
          <h3 className="truncate font-medium">{habit.name}</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {describeSchedule(habit.schedule)}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat
          label="Current streak"
          value={habit.archived ? "–" : formatStreak(streak.current, streak.unit)}
        />
        <Stat label="Best streak" value={formatStreak(streak.best, streak.unit)} />
        <Stat label={`${String(windowDays)}-day rate`} value={formatRate(rate.rate)} />
      </dl>

      {!habit.archived && (
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-stone-500 dark:text-stone-400">This week</span>
            <span className="font-medium tabular-nums">{weekText}</span>
          </div>
          {week.target > 0 && (
            <div
              role="progressbar"
              aria-label={`${habit.name} this week`}
              aria-valuemin={0}
              aria-valuemax={week.target}
              aria-valuenow={Math.min(week.done, week.target)}
              aria-valuetext={weekText}
              className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
            >
              <div
                className={clsx(
                  "h-full rounded-full bg-current motion-safe:transition-[width]",
                  habitColor(habit.color).accent,
                )}
                style={{ width: `${String(Math.min(100, (week.done / week.target) * 100))}%` }}
              />
            </div>
          )}
          {atRisk && (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
              Missed last time. Don’t miss twice and the streak carries on.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse gap-0.5 rounded-xl bg-stone-50 p-2 dark:bg-stone-950">
      <dt className="text-xs text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
