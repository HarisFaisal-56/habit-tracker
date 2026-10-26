import clsx from "clsx";
import { habitColor } from "../../components/habitColors";
import type { Habit } from "../../domain/habit";
import type { WeekProgress } from "../../domain/schedule";
import { formatWeekProgress } from "./statsData";

type WeekProgressBarProps = {
  habit: Habit;
  week: WeekProgress;
  /** Which week this is, e.g. "Last week". */
  label?: string;
};

/** A week's count and a bar in the habit's colour. */
export function WeekProgressBar({ habit, week, label = "This week" }: WeekProgressBarProps) {
  const text = formatWeekProgress(week, habit.schedule);
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-medium tabular-nums">{text}</span>
      </div>
      {week.target > 0 && (
        <div
          role="progressbar"
          aria-label={`${habit.name} ${label.toLowerCase()}`}
          aria-valuemin={0}
          aria-valuemax={week.target}
          aria-valuenow={Math.min(week.done, week.target)}
          aria-valuetext={text}
          className="h-2 overflow-hidden rounded-full bg-ink/10"
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
    </div>
  );
}
