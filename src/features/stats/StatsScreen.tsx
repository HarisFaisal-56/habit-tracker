import clsx from "clsx";
import { useMemo, useState, type ReactNode } from "react";
import { useToday } from "../../app/useToday";
import { EmptyState } from "../../components/EmptyState";
import { habitColor } from "../../components/habitColors";
import { HabitIcon } from "../../components/HabitIcon";
import { IdentityStatement } from "../../components/IdentityStatement";
import { Screen } from "../../components/Screen";
import { SegmentedControl } from "../../components/SegmentedControl";
import { useCompletions, useHabits } from "../../data/useData";
import { COMPLETION_RATE_WINDOWS } from "../../domain/stats";
import { AddHabitLink } from "../habits/AddHabitLink";
import { describeSchedule } from "../habits/describeSchedule";
import {
  buildStats,
  formatRate,
  formatRateChange,
  formatStreak,
  type HabitStats,
} from "./statsData";
import { TrendChart } from "./TrendChart";
import { WeekProgressBar } from "./WeekProgressBar";

type RateWindow = (typeof COMPLETION_RATE_WINDOWS)[number];

const WINDOW_OPTIONS = COMPLETION_RATE_WINDOWS.map((days) => ({
  value: days,
  label: `${String(days)}D`,
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
  const { rate } = stats.overall;
  const change = formatRateChange(rate, stats.previous.rate);
  const { current, best } = stats.run;
  const known = stats.trend.filter((value): value is number => value !== null);

  return (
    <Screen
      title="Stats"
      subtitle="Trajectory"
      glow="chart"
      actions={
        <SegmentedControl
          label="Time range"
          options={WINDOW_OPTIONS}
          value={windowDays}
          onChange={setWindowDays}
          variant="accent"
        />
      }
    >
      <section aria-label="Completion rate" className="flex flex-col gap-2 px-1">
        <p className="text-hero font-light tabular-nums" aria-live="polite">
          {rate === null ? "–" : Math.round(rate * 100)}
          {rate !== null && <span className="ml-1 text-3xl font-light text-muted">%</span>}
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-md text-soft">
            {rate === null
              ? "Nothing was due in this period yet."
              : `of planned check-ins kept · last ${String(windowDays)} days`}
          </p>
          {change && (
            <p className="label shrink-0 rounded-full bg-accent/15 px-3 py-1.5 text-accent-text">
              {change}
            </p>
          )}
        </div>
        {known.length > 1 && (
          <div className="mt-4">
            <TrendChart
              values={stats.trend}
              label={`Completion rate over the last ${String(windowDays)} days, from ${formatRate(known[0] ?? null)} to ${formatRate(known[known.length - 1] ?? null)}`}
            />
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <RunCard label="Current run" days={current}>
          <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-accent-text"
              style={{ width: `${String(best > 0 ? Math.min(100, (current / best) * 100) : 0)}%` }}
            />
          </div>
        </RunCard>
        <RunCard label="Best run" days={best}>
          <p className="leading-tight text-soft">
            {best > current ? `${String(best - current)} days to beat it` : "Your best yet"}
          </p>
        </RunCard>
      </div>

      {active.length > 0 && (
        <section aria-labelledby="by-orbit-heading" className="flex flex-col gap-4 px-1">
          <h2 id="by-orbit-heading" className="section-label">
            By orbit
          </h2>
          <ul aria-label="Completion by habit" className="flex flex-col gap-3.5">
            {active.map(({ habit, rate: habitRate }) => (
              <li key={habit.id} className="flex flex-col gap-2">
                <p className="flex justify-between gap-3 leading-tight">
                  <span className="truncate">
                    {habit.name}
                    {habit.schedule.type === "weekly" &&
                      ` · ${String(habit.schedule.timesPerWeek)}× a week`}
                  </span>
                  <span className="tabular-nums">{formatRate(habitRate.rate)}</span>
                </p>
                <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-ink/8">
                  <div
                    className={clsx("h-full rounded-full", habitColor(habit.color).swatch)}
                    style={{ width: `${String(Math.round((habitRate.rate ?? 0) * 100))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {active.length > 0 && (
        <section aria-labelledby="details-heading" className="flex flex-col gap-3">
          <h2 id="details-heading" className="section-label px-1">
            Streaks and weeks
          </h2>
          <ul aria-label="Active habits" className="flex flex-col gap-3">
            {active.map((habitStats) => (
              <HabitStatsCard
                key={habitStats.habit.id}
                stats={habitStats}
                windowDays={windowDays}
              />
            ))}
          </ul>
        </section>
      )}

      {archived.length > 0 && (
        <section aria-labelledby="archived-stats-heading" className="mt-2 flex flex-col gap-3">
          <h2 id="archived-stats-heading" className="section-label px-1">
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

function RunCard({ label, days, children }: { label: string; days: number; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-3xl border border-line bg-surface px-4 pt-4.5 pb-4">
      <p className="section-label">{label}</p>
      <p className="text-stat font-light tabular-nums">
        {days}
        <span className="ml-2 text-lg font-normal text-muted">{days === 1 ? "day" : "days"}</span>
      </p>
      {children}
    </div>
  );
}

function HabitStatsCard({ stats, windowDays }: { stats: HabitStats; windowDays: number }) {
  const { habit, streak, rate, week } = stats;
  const atRisk = streak.unit === "days" && streak.atRisk;

  return (
    <li
      className={clsx(
        "flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4",
        habit.archived && "opacity-80",
      )}
    >
      <div className="flex items-center gap-3">
        <HabitIcon emoji={habit.emoji} color={habit.color} />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-medium">{habit.name}</h3>
          <p className="label">{describeSchedule(habit.schedule)}</p>
          <IdentityStatement identity={habit.identity} />
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
          <WeekProgressBar habit={habit} week={week} />
          {atRisk && (
            <p className="mt-2 text-sm text-habit-amber">
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
    <div className="flex flex-col-reverse gap-1 rounded-2xl bg-canvas p-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
