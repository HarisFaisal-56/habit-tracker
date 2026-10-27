import { habitColor, tint } from "../../components/habitColors";
import type { Habit } from "../../domain/habit";
import type { WeekProgress } from "../../domain/schedule";
import { formatWeekProgress } from "./statsData";

type WeekProgressBarProps = {
  habit: Habit;
  week: WeekProgress;
  /** Which week this is, e.g. "Last week". */
  label?: string;
};

/** A week's count and one segment per check-in due, lit in the habit's colour as they're done. */
export function WeekProgressBar({ habit, week, label = "This week" }: WeekProgressBarProps) {
  const text = formatWeekProgress(week, habit.schedule);
  const { value } = habitColor(habit.color);
  return (
    <div>
      <div className="mb-1.75 flex justify-between text-note">
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
          className="flex gap-0.75"
        >
          {Array.from({ length: week.target }, (_, index) => {
            const lit = index < week.done;
            return (
              <span
                key={index}
                className={lit ? "h-2 flex-1 rounded-xs" : "h-2 flex-1 rounded-xs bg-ink/7"}
                style={
                  lit ? { background: value, boxShadow: `0 0 8px ${tint(value, 0.45)}` } : undefined
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
