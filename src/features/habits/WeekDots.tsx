import clsx from "clsx";
import { habitColor, tint } from "../../components/habitColors";
import type { CompletionsByDate } from "../../domain/completions";
import { addDays, startOfWeek, type DateKey } from "../../domain/dates";
import type { Habit } from "../../domain/habit";
import { getDayStatus, type DayStatus } from "../../domain/streaks";

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

const isDoneStatus = (status: DayStatus | undefined) => status === "full" || status === "minimum";

type WeekDotsProps = {
  habit: Habit;
  byDate: CompletionsByDate;
  today: DateKey;
};

/**
 * This week, Monday to Sunday, one dot per day under its letter. Today's column
 * is lit, and runs of done days are joined by a line. Decorative.
 */
export function WeekDots({ habit, byDate, today }: WeekDotsProps) {
  const weekStart = startOfWeek(today);
  const { value } = habitColor(habit.color);
  const days = LETTERS.map((letter, index) => {
    const date = addDays(weekStart, index);
    return { letter, date, status: getDayStatus(habit, byDate, date, today) };
  });
  const showToday = !habit.archived;

  return (
    <span aria-hidden="true" className="flex gap-2">
      {days.map(({ letter, date, status }, index) => {
        const isToday = showToday && date === today;
        const joined = isDoneStatus(status) && isDoneStatus(days[index + 1]?.status);
        return (
          <span key={date} className="relative flex w-3.25 flex-col items-center gap-1.75">
            {isToday && (
              <span className="absolute -inset-x-1.25 -inset-y-1.5 rounded-[10px] bg-ink/5 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-ink)_6%,transparent)]" />
            )}
            <span
              className={clsx(
                "relative font-mono text-micro leading-none",
                isToday ? "font-bold text-ink" : "text-muted",
              )}
            >
              {letter}
            </span>
            <span className="relative flex size-3.25 items-center justify-center">
              {joined && (
                <span
                  className="absolute top-[5.5px] left-2.5 h-0.5 w-2.75 rounded-xs"
                  style={{
                    background: `linear-gradient(90deg, ${tint(value, 0.8)}, ${tint(value, 0.4)})`,
                  }}
                />
              )}
              <DayDot status={status} color={value} isToday={isToday} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

type DayDotProps = { status: DayStatus; color: string; isToday: boolean };

function DayDot({ status, color, isToday }: DayDotProps) {
  const dot = "relative size-3.25 shrink-0 rounded-full";
  switch (status) {
    case "full":
      return (
        <span
          className={dot}
          style={{
            background: `radial-gradient(circle at 35% 30%, #fff8 0, ${color} 55%)`,
            boxShadow: `0 0 9px ${tint(color, 0.55)}`,
          }}
        />
      );
    case "minimum":
      // Left half filled, like the minimum mark on Today.
      return (
        <svg
          viewBox="0 0 12 12"
          className="relative block size-3.25 shrink-0"
          style={{ filter: `drop-shadow(0 0 4px ${tint(color, 0.4)})` }}
        >
          <circle cx="6" cy="6" r="5.25" stroke={color} strokeWidth="1.5" className="fill-canvas" />
          <path d="M6 .75 A5.25 5.25 0 0 0 6 11.25 Z" fill={color} />
        </svg>
      );
    case "skipped":
      return (
        <svg viewBox="0 0 12 12" className="relative block size-3.25 shrink-0 text-muted">
          <circle
            cx="6"
            cy="6"
            r="5.25"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="2.2 1.9"
          />
        </svg>
      );
    case "pending":
    case "missed":
      // Today still to do: a ring in the habit's colour inside a thin outer ring.
      return isToday ? (
        <span
          className={clsx(dot, "border-2 bg-canvas outline-1 outline-offset-2")}
          style={{
            borderColor: color,
            outlineColor: tint(color, 0.45),
            boxShadow: `0 0 10px ${tint(color, 0.35)}`,
          }}
        />
      ) : (
        <span className={clsx(dot, "border-2 border-ink/22 bg-canvas")} />
      );
    case "off":
      return <span className="relative h-0.75 w-3 shrink-0 rounded-xs bg-ink/20" />;
    default:
      return <span className={clsx(dot, "bg-ink/7")} />;
  }
}
