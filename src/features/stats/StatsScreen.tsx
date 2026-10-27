import clsx from "clsx";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Trophy,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useToday } from "../../app/useToday";
import { EmptyState } from "../../components/EmptyState";
import { habitCardStyle, habitColor, tint } from "../../components/habitColors";
import { HabitIcon } from "../../components/HabitIcon";
import { Screen } from "../../components/Screen";
import { SegmentedControl } from "../../components/SegmentedControl";
import { useTween } from "../../components/useTween";
import { useCompletions, useHabits } from "../../data/useData";
import { COMPLETION_RATE_WINDOWS } from "../../domain/stats";
import { AddHabitLink } from "../habits/AddHabitLink";
import { describeSchedule } from "../habits/describeSchedule";
import {
  buildStats,
  formatRate,
  formatRateChange,
  formatStreak,
  getRateChange,
  getTrendLabels,
  rankByRate,
  type HabitStats,
} from "./statsData";
import { TrendChart } from "./TrendChart";
import { WeekProgressBar } from "./WeekProgressBar";

type RateWindow = (typeof COMPLETION_RATE_WINDOWS)[number];

const WINDOW_OPTIONS = COMPLETION_RATE_WINDOWS.map((days) => ({
  value: days,
  label: `${String(days)}D`,
}));

/** Ticks in the current run card's bar: one per day, up to a month. */
const RUN_TICKS = 31;

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
  const points = getRateChange(rate, stats.previous.rate) ?? 0;
  const { current, best } = stats.run;
  const known = stats.trend.filter((value): value is number => value !== null);
  const [trendStart, trendMiddle] = getTrendLabels(today, windowDays);

  return (
    <Screen
      title="Stats"
      subtitle="Trajectory"
      glow="stats"
      gap="loose"
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
      <section
        aria-label="Completion rate"
        className="flex animate-rise flex-col gap-2 pr-5 pl-1"
        style={{ animationDelay: "0.06s" }}
      >
        <p className="flex items-start text-hero font-extralight tabular-nums" aria-live="polite">
          {rate === null ? (
            "–"
          ) : (
            <>
              <CountUp value={Math.round(rate * 100)} />
              <span className="mt-3 ml-1.5 text-3xl font-light tracking-normal text-faint">%</span>
              <span className="sr-only">{formatRate(rate)}</span>
            </>
          )}
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-md text-soft">
            {rate === null
              ? "Nothing was due in this period yet."
              : `of planned check-ins kept · last ${String(windowDays)} days`}
          </p>
          {change && (
            <p
              className={clsx(
                "flex shrink-0 items-center gap-1 rounded-full border py-1.25 pr-2.75 pl-2 font-mono text-caption tracking-[0.08em] uppercase",
                points < 0
                  ? "border-danger/25 bg-danger/12 text-danger"
                  : "border-accent-text/25 bg-accent/12 text-accent-text shadow-[0_0_20px_-6px_color-mix(in_oklab,var(--color-accent)_40%,transparent)]",
              )}
            >
              {points < 0 ? (
                <TrendingDown aria-hidden="true" className="size-3.25" strokeWidth={2.2} />
              ) : (
                <TrendingUp aria-hidden="true" className="size-3.25" strokeWidth={2.2} />
              )}
              {change}
            </p>
          )}
        </div>
        {known.length > 1 && (
          <>
            <div className="mt-5.5">
              <TrendChart
                values={stats.trend}
                today={today}
                label={`Completion rate over the last ${String(windowDays)} days, from ${formatRate(known[0] ?? null)} to ${formatRate(known[known.length - 1] ?? null)}`}
              />
            </div>
            <div
              aria-hidden="true"
              className="mt-1.5 flex justify-between font-mono text-micro tracking-[0.08em] text-faint"
            >
              <span>{trendStart}</span>
              <span>{trendMiddle}</span>
              <span className="text-accent-text">TODAY</span>
            </div>
          </>
        )}
      </section>

      <div className="grid animate-rise grid-cols-2 gap-3" style={{ animationDelay: "0.12s" }}>
        <RunCard
          label="Current run"
          days={current}
          accent
          footer={
            <>
              <RunTicks current={current} />
              <p className="font-mono text-micro tracking-[0.08em] text-muted">
                {best > current
                  ? `${String(Math.round((current / best) * 100))}% OF YOUR BEST`
                  : "YOUR BEST YET"}
              </p>
            </>
          }
        />
        <RunCard
          label="Best run"
          days={best}
          icon={
            <Trophy
              aria-hidden="true"
              className="absolute top-4 right-4 size-4.5 text-habit-amber drop-shadow-[0_0_8px_color-mix(in_oklab,var(--color-habit-amber)_45%,transparent)]"
              strokeWidth={1.75}
            />
          }
          footer={
            <p className="mt-1.5 text-md leading-tight text-soft">
              {best > current ? (
                <>
                  <span className="font-medium text-ink">
                    {best - current} {best - current === 1 ? "day" : "days"}
                  </span>{" "}
                  to beat it
                </>
              ) : (
                "Your best yet"
              )}
            </p>
          }
        />
      </div>

      {active.length > 0 && (
        <section
          aria-labelledby="by-orbit-heading"
          className="flex animate-rise flex-col gap-4 px-1"
          style={{ animationDelay: "0.18s" }}
        >
          <div className="flex items-center justify-between">
            <h2 id="by-orbit-heading" className="section-label">
              By orbit
            </h2>
            <span
              aria-hidden="true"
              className="flex items-center gap-1.5 font-mono text-micro tracking-[0.06em] text-faint"
            >
              <span className="h-2.5 w-0.5 rounded-xs bg-ink/40" />
              PREV {windowDays}D
            </span>
          </div>
          <ul aria-label="Completion by habit" className="flex flex-col gap-4.5">
            {rankByRate(active).map((habitStats, index) => (
              <OrbitBar key={habitStats.habit.id} stats={habitStats} rank={index + 1} />
            ))}
          </ul>
        </section>
      )}

      {active.length > 0 && (
        <section
          aria-labelledby="details-heading"
          className="flex animate-rise flex-col gap-3"
          style={{ animationDelay: "0.24s" }}
        >
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

/** A number that counts up to `value` when it changes. Decorative; pair it with real text. */
function CountUp({ value }: { value: number }) {
  const shown = useTween(value, 0);
  return (
    <span aria-hidden="true" className="text-gradient [--text-gradient-stop:35%]">
      {Math.round(shown)}
    </span>
  );
}

type RunCardProps = {
  label: string;
  days: number;
  /** Lit in the accent, for the current run. */
  accent?: boolean;
  icon?: ReactNode;
  footer: ReactNode;
};

function RunCard({ label, days, accent = false, icon, footer }: RunCardProps) {
  return (
    <div
      className={clsx(
        "card relative flex flex-col gap-2.5 overflow-hidden rounded-card px-4 pt-4.5 pb-4",
        accent &&
          "[--card-edge:color-mix(in_oklab,var(--color-accent)_35%,transparent)] [--card-wash:radial-gradient(120%_80%_at_0%_0%,color-mix(in_oklab,var(--color-accent)_10%,transparent),transparent_60%)]",
      )}
    >
      {icon}
      <p className="section-label text-caption">{label}</p>
      <p className="text-stat font-extralight tabular-nums">
        {days}
        <span className="ml-1.75 text-lead font-normal tracking-normal text-muted">
          {days === 1 ? "day" : "days"}
        </span>
      </p>
      {footer}
    </div>
  );
}

/** A month of ticks, rising and lit for each day of the current run. */
function RunTicks({ current }: { current: number }) {
  const lit = Math.min(current, RUN_TICKS);
  return (
    <div aria-hidden="true" className="mt-1.5 flex h-3 items-end gap-0.5">
      {Array.from({ length: RUN_TICKS }, (_, index) => {
        const on = index < lit;
        return (
          <span
            key={index}
            className={clsx("flex-1 rounded-xs", on ? "bg-accent-mark" : "bg-ink/10")}
            style={{
              height: on ? `${String(7 + (lit > 1 ? index / (lit - 1) : 1) * 5)}px` : "4px",
              boxShadow: on && index === lit - 1 ? "0 0 10px var(--color-accent-mark)" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

/** A habit's rate as a glowing bar, with a marker where it was in the previous window. */
function OrbitBar({ stats, rank }: { stats: HabitStats; rank: number }) {
  const { habit, rate, previous } = stats;
  const { value } = habitColor(habit.color);
  const percent = Math.round((rate.rate ?? 0) * 100);
  const delta = getRateChange(rate.rate, previous.rate);
  let deltaIcon = <Minus aria-hidden="true" className="size-2.75" strokeWidth={2.5} />;
  let deltaTone = "text-muted";
  if (delta !== null && delta > 0) {
    deltaIcon = <ArrowUpRight aria-hidden="true" className="size-3" strokeWidth={2.5} />;
    deltaTone = "text-accent-text";
  } else if (delta !== null && delta < 0) {
    deltaIcon = <ArrowDownRight aria-hidden="true" className="size-3" strokeWidth={2.5} />;
    deltaTone = "text-danger";
  }

  return (
    <li className="flex flex-col gap-2.25">
      <p className="flex items-center justify-between gap-3 leading-tight">
        <span className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="font-mono text-2xs text-dim">
            {String(rank).padStart(2, "0")}
          </span>
          <span aria-hidden="true" className="text-md">
            {habit.emoji}
          </span>
          <span className="truncate text-md">
            {habit.name}
            {habit.schedule.type === "weekly" && ` · ${String(habit.schedule.timesPerWeek)}×/wk`}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2.5">
          {delta !== null && (
            <span className={clsx("flex items-center gap-0.5 font-mono text-caption", deltaTone)}>
              {deltaIcon}
              <span className="sr-only">{delta >= 0 ? "up" : "down"} </span>
              {Math.abs(delta)}
              <span className="sr-only"> points</span>
            </span>
          )}
          <span className="min-w-10.5 text-right text-base font-medium tabular-nums">
            {rate.rate === null ? (
              "–"
            ) : (
              <>
                {percent}
                <span className="font-normal text-faint">%</span>
              </>
            )}
          </span>
        </span>
      </p>
      <div aria-hidden="true" className="relative h-1.5 rounded-full bg-ink/6">
        <div
          className="absolute inset-y-0 left-0 rounded-full motion-safe:transition-[width] motion-safe:duration-600"
          style={{
            width: `${String(percent)}%`,
            background: `linear-gradient(90deg, ${tint(value, 0.45)}, ${value})`,
            boxShadow: `0 0 14px ${tint(value, 0.4)}`,
          }}
        >
          {percent > 0 && (
            <span
              className="absolute top-1/2 -right-px -mt-1.25 size-2.5 rounded-full bg-white"
              style={{ boxShadow: `0 0 0 3px ${tint(value, 0.3)}, 0 0 10px ${value}` }}
            />
          )}
        </div>
        {previous.rate !== null && (
          <span
            className="absolute -inset-y-1 w-0.5 rounded-xs bg-ink/40 motion-safe:transition-[left] motion-safe:duration-600"
            style={{ left: `calc(${String(Math.round(previous.rate * 100))}% - 1px)` }}
          />
        )}
      </div>
    </li>
  );
}

function HabitStatsCard({ stats, windowDays }: { stats: HabitStats; windowDays: number }) {
  const { habit, streak, rate, week } = stats;
  const atRisk = streak.unit === "days" && streak.atRisk;
  const { value } = habitColor(habit.color);

  return (
    <li
      className={clsx(
        "card flex flex-col gap-3.5 rounded-card p-4",
        habit.archived && "opacity-80",
      )}
      style={habitCardStyle(habit.color, 0.09, 0.35)}
    >
      <div className="flex items-center gap-3">
        <HabitIcon emoji={habit.emoji} color={habit.color} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lead font-medium tracking-tight">{habit.name}</h3>
          <p className="mt-0.75 font-mono text-2xs tracking-[0.08em] text-muted uppercase">
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
        <Stat
          label={`${String(windowDays)}-day rate`}
          value={formatRate(rate.rate)}
          color={value}
        />
      </dl>

      {!habit.archived && (
        <div>
          <WeekProgressBar habit={habit} week={week} />
          {atRisk && (
            <p className="mt-3 flex items-start gap-2.25 rounded-icon border border-habit-amber/20 bg-habit-amber/7 px-3 py-2.5 text-note text-habit-amber">
              <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
              Missed last time. Don’t miss twice and the streak carries on.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col-reverse gap-0.75 rounded-2xl bg-well/80 px-1.5 py-2.5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.04)]">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </dd>
    </div>
  );
}
