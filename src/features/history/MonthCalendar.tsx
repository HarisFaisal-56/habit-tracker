import clsx from "clsx";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "../../components/Button";
import { habitColor } from "../../components/habitColors";
import { addMonths, parseDateKey, type DateKey } from "../../domain/dates";
import { WEEKDAY_NAMES, WEEKDAYS_MONDAY_FIRST } from "../habits/describeSchedule";
import { getMonthGrid } from "./historyData";

export type CalendarDay = {
  /** How much of the day's ring is drawn, 0 to 1. */
  progress: number;
  /** The day is wrapped up: everything due was done. */
  complete?: boolean;
  /** Skipped days get a dashed ring. */
  skipped?: boolean;
  /** Habit colour for a single-habit view; the accent otherwise. */
  color?: string;
  /** Read after the date by screen readers, e.g. "2 of 3 done". */
  description: string;
};

type MonthCalendarProps = {
  /** The first day of the month to show. */
  month: DateKey;
  today: DateKey;
  selected: DateKey;
  /** A short summary under the month name, e.g. "84% · 17 full days". */
  caption?: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onMonthChange: (month: DateKey) => void;
  onSelect: (date: DateKey) => void;
  getDay: (date: DateKey) => CalendarDay;
};

// Each day is a 36px ring drawn in a 40 x 40 box, as in design/history.png.
const STROKE = 3.3;
const RING_RADIUS = 20 - STROKE / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

export function MonthCalendar({
  month,
  today,
  selected,
  caption,
  canGoBack,
  canGoForward,
  onMonthChange,
  onSelect,
  getDay,
}: MonthCalendarProps) {
  const title = format(parseDateKey(month), "MMMM yyyy");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <IconButton
          label="Previous month"
          icon={ChevronLeft}
          variant="tile"
          disabled={!canGoBack}
          onClick={() => {
            onMonthChange(addMonths(month, -1));
          }}
        />
        <div className="text-center">
          <h2 aria-live="polite" className="text-xl font-medium">
            {title}
          </h2>
          {caption && <p className="section-label mt-1">{caption}</p>}
        </div>
        <IconButton
          label="Next month"
          icon={ChevronRight}
          variant="tile"
          disabled={!canGoForward}
          onClick={() => {
            onMonthChange(addMonths(month, 1));
          }}
        />
      </div>

      <div aria-hidden="true" className="label grid grid-cols-7 text-center">
        {WEEKDAYS_MONDAY_FIRST.map((day) => (
          <span key={day}>{WEEKDAY_NAMES[day].charAt(0)}</span>
        ))}
      </div>

      <div role="group" aria-label={title} className="-mt-1 grid grid-cols-7">
        {getMonthGrid(month)
          .flat()
          .map((date, index) => {
            if (date === null) return <span key={`blank-${String(index)}`} />;
            return (
              <DayCell
                key={date}
                date={date}
                day={getDay(date)}
                isToday={date === today}
                isSelected={date === selected}
                isFuture={date > today}
                onSelect={onSelect}
              />
            );
          })}
      </div>
    </div>
  );
}

type DayCellProps = {
  date: DateKey;
  day: CalendarDay;
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
  onSelect: (date: DateKey) => void;
};

/**
 * One day: a ring that fills as habits are done, an olive disc once everything
 * is, solid lime for today, and a dim ring with a dot on top for days to come.
 * The selected day's empty part of the ring turns white.
 */
function DayCell({ date, day, isToday, isSelected, isFuture, onSelect }: DayCellProps) {
  const { progress, complete, skipped, color, description } = day;
  const tint = color ? habitColor(color).value : undefined;
  const fillStyle = tint ? { fill: tint } : undefined;
  const strokeStyle = tint ? { stroke: tint } : undefined;

  return (
    <button
      type="button"
      disabled={isFuture}
      aria-pressed={isSelected}
      aria-current={isToday ? "date" : undefined}
      aria-label={`${format(parseDateKey(date), "EEEE d MMMM")}${isToday ? " (today)" : ""}, ${description}`}
      onClick={() => {
        onSelect(date);
      }}
      className="relative mx-auto flex h-12 w-full items-center justify-center rounded-full tabular-nums"
    >
      <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute size-9">
        {isToday ? (
          <circle cx="20" cy="20" r="20" className="fill-accent" style={fillStyle} />
        ) : (
          <>
            {complete && <circle cx="20" cy="20" r={RING_RADIUS} className="fill-accent-mark/12" />}
            <circle
              cx="20"
              cy="20"
              r={RING_RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeDasharray={skipped ? "3 3" : undefined}
              className={isSelected ? "stroke-ink/85" : "stroke-ink/10"}
            />
            {!skipped && progress > 0 && (
              <circle
                cx="20"
                cy="20"
                r={RING_RADIUS}
                fill="none"
                strokeWidth={STROKE}
                strokeLinecap={progress < 1 ? "round" : undefined}
                strokeDasharray={RING_LENGTH}
                strokeDashoffset={RING_LENGTH * (1 - Math.min(1, progress))}
                transform="rotate(-90 20 20)"
                className="stroke-accent-mark"
                style={strokeStyle}
              />
            )}
          </>
        )}
      </svg>
      {(isFuture || isToday) && (
        <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute size-9 overflow-visible">
          <circle cx="20" cy="-1.5" r="1.8" className="fill-accent-mark" style={fillStyle} />
        </svg>
      )}
      <span
        className={clsx(
          "relative text-base font-semibold",
          isToday && "text-accent-ink",
          isFuture && "font-normal text-muted",
        )}
      >
        {parseDateKey(date).getDate()}
      </span>
    </button>
  );
}
