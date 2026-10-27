import clsx from "clsx";
import { format, getDayOfYear } from "date-fns";
import { Check } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useToday } from "../../app/useToday";
import { EmptyState } from "../../components/EmptyState";
import type { StyleWithVars } from "../../components/habitColors";
import { OrbitRings } from "../../components/OrbitRings";
import { Screen } from "../../components/Screen";
import { useReducedMotion } from "../../components/useReducedMotion";
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
import { buildTodayList, getDayPercent, type TodayItem } from "./todayList";

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

  const renderTiles = (items: TodayItem[], firstDelay: number) => (
    <ul className="flex flex-col gap-2.5">
      {items.map((item, index) => (
        <HabitTile
          key={item.habit.id}
          item={item}
          delay={firstDelay + index * 0.05}
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
      subtitle={
        <>
          <span
            aria-hidden="true"
            className="size-1.5 animate-blink rounded-full bg-accent-mark shadow-[0_0_8px_var(--color-accent-mark)]"
          />
          {`${format(date, "EEE · d MMM")} · Day ${String(getDayOfYear(date))}`}
        </>
      }
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
            <section aria-labelledby="due-heading" className="mt-0.5 flex flex-col gap-2">
              <h2 id="due-heading" className="sr-only">
                Due today
              </h2>
              {renderTiles(list.due, 0.14)}
            </section>
          )}

          {list.other.length > 0 && (
            <section aria-labelledby="other-heading" className="mt-2 flex flex-col gap-3">
              <h2 id="other-heading" className="section-label px-1">
                Not due today
              </h2>
              {renderTiles(list.other, 0.14 + list.due.length * 0.05)}
            </section>
          )}

          <p
            aria-hidden="true"
            className="mt-1 flex items-center justify-center gap-2 font-mono text-micro tracking-[0.12em] text-dim uppercase"
          >
            <span className="h-px w-4.5 bg-line-strong" />
            Tap to close · Hold for more
            <span className="h-px w-4.5 bg-line-strong" />
          </p>
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

/** The longest current run, in a pill with a spinning lime edge. */
function RunBadge({ days }: { days: number }) {
  return (
    <div className="relative overflow-hidden rounded-full p-px whitespace-nowrap shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--color-accent)_55%,transparent)]">
      <span aria-hidden="true" className="conic-accent absolute -inset-[60%] animate-orbit" />
      <p className="lime-tint relative flex items-center gap-2.25 rounded-full py-1.5 pr-3.75 pl-2.5 text-sm text-soft">
        <OrbitIcon />
        <span>
          <span className="mr-1 text-lead font-semibold text-accent-text tabular-nums">{days}</span>
          day run
        </span>
      </p>
    </div>
  );
}

/** A ring with a planet circling it, as on the run badge in the design. */
function OrbitIcon() {
  const reduced = useReducedMotion();
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4.5 overflow-visible text-accent-text drop-shadow-[0_0_4px_color-mix(in_oklab,var(--color-accent)_60%,transparent)]"
    >
      <circle cx="10" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <g>
        <circle cx="10" cy="4" r="2.5" fill="currentColor" />
        {!reduced && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 10 11"
            to="360 10 11"
            dur="9s"
            repeatCount="indefinite"
          />
        )}
      </g>
    </svg>
  );
}

const SPARK_COLORS = [
  "var(--color-accent-mark)",
  "var(--color-habit-orange)",
  "var(--color-habit-violet)",
  "var(--color-habit-sky)",
  "var(--color-habit-teal)",
  "var(--color-habit-rose)",
];
const SPARKS = Array.from({ length: 22 }, (_, index) => ({
  angle: `${String((index / 22) * 360)}deg`,
  delay: `${String((index % 4) * 0.04)}s`,
  color: SPARK_COLORS[index % SPARK_COLORS.length] ?? "var(--color-accent-mark)",
}));

/** Sparks flying out of the middle of the rings when the last orbit closes. */
function Burst() {
  return (
    <div aria-hidden="true" className="absolute top-1/2 left-1/2 size-0">
      {SPARKS.map(({ angle, delay, color }) => {
        const style: StyleWithVars = {
          "--angle": angle,
          animationDelay: delay,
          background: color,
          boxShadow: `0 0 8px ${color}`,
        };
        return (
          <span
            key={angle}
            className="absolute -top-2 -left-px h-4 w-0.5 animate-burst rounded-xs"
            style={style}
          />
        );
      })}
    </div>
  );
}

function OrbitCard({ items, progress }: { items: TodayItem[]; progress: TodayProgress }) {
  const { closed, minimum, due } = progress;
  // Only full completions close an orbit; the minimum version counts for the
  // streak but is shown separately.
  const open = due - closed - minimum;
  const allClosed = due > 0 && open === 0;
  const percent = getDayPercent(progress);
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
    <div className={clsx("relative -mt-1 -mb-1.5", allClosed && "animate-breathe")}>
      <OrbitRings
        progress={percent}
        rings={items.map(({ habit, completion }) => ({
          id: habit.id,
          color: habit.color,
          kind: completion?.kind,
        }))}
      >
        {allClosed ? (
          <>
            <span className="flex size-16 animate-pop items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,var(--color-accent-hi),var(--color-accent)_55%,var(--color-accent-lo))] text-accent-ink shadow-[0_0_40px_color-mix(in_oklab,var(--color-accent)_60%,transparent),inset_0_-4px_10px_rgb(0_0_0/0.15)]">
              <Check aria-hidden="true" className="size-8" strokeWidth={3} />
            </span>
            <span className="mt-3.5 font-mono text-caption tracking-[0.16em] text-accent-text">
              ALL ORBITS CLOSED
            </span>
          </>
        ) : (
          <>
            <span
              aria-hidden="true"
              className="text-gradient text-ring font-extralight tabular-nums [--text-gradient-stop:40%]"
            >
              {due === 0 ? "–" : closed}
              {due > 0 && (
                <span className="text-2xl font-light tracking-normal text-faint">/{due}</span>
              )}
            </span>
            <span
              aria-hidden="true"
              className="mt-3 font-mono text-caption tracking-[0.16em] text-muted uppercase"
            >
              {due === 0 ? "Rest day" : "Closed"}
            </span>
          </>
        )}
        {due > 0 && (
          <span
            aria-hidden="true"
            className="mt-2 font-mono text-2xs tracking-[0.08em] text-dim tabular-nums"
          >
            {Math.round(percent * 100)}% OF TODAY
          </span>
        )}
      </OrbitRings>
      {allClosed && <Burst />}
    </div>
  );

  return (
    <div
      className="relative flex animate-rise flex-col items-center"
      style={{ animationDelay: "0.08s" }}
    >
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
      <p aria-live="polite" className="sr-only">
        {status}
      </p>
      {due > 0 && <ProgressStrip closed={closed} minimum={minimum} open={open} />}
    </div>
  );
}

/** Closed, minimum and open counts under the rings. */
function ProgressStrip({ closed, minimum, open }: Record<"closed" | "minimum" | "open", number>) {
  const cells: { count: number; label: string; mark: ReactNode }[] = [
    {
      count: closed,
      label: "Closed",
      mark: (
        <span className="size-2.5 rounded-full bg-accent-mark shadow-[0_0_8px_var(--color-accent-mark)]" />
      ),
    },
    {
      count: minimum,
      label: "Minimum",
      mark: (
        <svg viewBox="0 0 12 12" className="size-2.5 text-soft">
          <circle cx="6" cy="6" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 .75 A5.25 5.25 0 0 0 6 11.25 Z" fill="currentColor" />
        </svg>
      ),
    },
    {
      count: open,
      label: "Open",
      mark: <span className="size-2.5 rounded-full border-[1.5px] border-ink/35" />,
    },
  ];
  return (
    <div aria-hidden="true" className="card grid w-full grid-cols-3 rounded-tile backdrop-blur-md">
      {cells.map(({ count, label, mark }, index) => (
        <div
          key={label}
          className={clsx(
            "flex items-center gap-2.5 px-3.5 py-3",
            index > 0 && "border-l border-ink/5",
          )}
        >
          {mark}
          <div>
            <p
              className={clsx(
                "text-xl leading-none font-light tabular-nums",
                label === "Open" && count === 0 ? "text-muted" : "text-ink",
              )}
            >
              {count}
            </p>
            <p className="mt-1 font-mono text-micro tracking-widest text-muted uppercase">
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
