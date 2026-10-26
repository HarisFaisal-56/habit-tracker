import clsx from "clsx";
import { habitColor } from "../../components/habitColors";
import type { CompletionsByDate } from "../../domain/completions";
import { addDays, startOfWeek, type DateKey } from "../../domain/dates";
import type { Habit } from "../../domain/habit";
import { getDayStatus, type DayStatus } from "../../domain/streaks";

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

type WeekDotsProps = {
  habit: Habit;
  byDate: CompletionsByDate;
  today: DateKey;
};

/** This week, Monday to Sunday, one dot per day. Decorative. */
export function WeekDots({ habit, byDate, today }: WeekDotsProps) {
  const weekStart = startOfWeek(today);
  return (
    <span aria-hidden="true" className="flex gap-1.75">
      {LETTERS.map((letter, index) => {
        const date = addDays(weekStart, index);
        const isToday = date === today;
        return (
          <span key={date} className="flex w-3 flex-col items-center gap-1.5">
            <span className={clsx("label text-2xs", isToday && "font-bold text-soft")}>
              {letter}
            </span>
            <span className="flex size-3 items-center justify-center">
              <DayDot
                status={getDayStatus(habit, byDate, date, today)}
                color={habit.color}
                isToday={isToday}
              />
            </span>
          </span>
        );
      })}
    </span>
  );
}

type DayDotProps = { status: DayStatus; color: string; isToday: boolean };

function DayDot({ status, color, isToday }: DayDotProps) {
  const { accent } = habitColor(color);
  switch (status) {
    case "full":
      return <span className={clsx("size-3 shrink-0 rounded-full bg-current", accent)} />;
    case "minimum":
      // Left half filled, like the minimum mark on Today.
      return (
        <svg viewBox="0 0 12 12" className={clsx("size-3 shrink-0", accent)}>
          <circle cx="6" cy="6" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 .75 A5.25 5.25 0 0 0 6 11.25 Z" fill="currentColor" />
        </svg>
      );
    case "skipped":
      return (
        <svg viewBox="0 0 12 12" className="size-3 shrink-0 text-muted">
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
          className={clsx(
            "size-3 shrink-0 rounded-full border-2 border-current outline-1 outline-offset-2 outline-soft/80",
            accent,
          )}
        />
      ) : (
        <span className="size-3 shrink-0 rounded-full border-2 border-ink/25" />
      );
    case "off":
      return <span className="h-1 w-3 shrink-0 rounded-full bg-ink/20" />;
    default:
      return <span className="size-3 shrink-0 rounded-full bg-ink/10" />;
  }
}
