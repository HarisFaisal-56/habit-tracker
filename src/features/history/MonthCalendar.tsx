import clsx from "clsx";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "../../components/Button";
import { habitColor, tint } from "../../components/habitColors";
import { useReducedMotion } from "../../components/useReducedMotion";
import { addMonths, getWeekday, parseDateKey, type DateKey } from "../../domain/dates";
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
  /** A summary under the month name: the rate (in the accent) and the rest, e.g. "84%", "17 full days". */
  caption?: { rate: string; rest: string };
  canGoBack: boolean;
  canGoForward: boolean;
  onMonthChange: (month: DateKey) => void;
  onSelect: (date: DateKey) => void;
  getDay: (date: DateKey) => CalendarDay;
};

// Each day is a 36px ring drawn in a 40 x 40 box, as in the design's dayRing.
const STROKE = 3.2;
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
  const todayWeekday = getWeekday(today);

  return (
    <div className="flex animate-rise flex-col gap-3.5" style={{ animationDelay: "0.06s" }}>
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
          <h2 aria-live="polite" className="text-heading font-medium">
            {title}
          </h2>
          {caption && (
            <p className="section-label mt-1.25">
              <span className="text-accent-text">{caption.rate}</span> · {caption.rest}
            </p>
          )}
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

      <div
        aria-hidden="true"
        className="grid grid-cols-7 text-center font-mono text-caption tracking-[0.06em] text-faint"
      >
        {WEEKDAYS_MONDAY_FIRST.map((day) => (
          <span key={day} className={clsx(day === todayWeekday && "text-accent-text")}>
            {WEEKDAY_NAMES[day].charAt(0)}
          </span>
        ))}
      </div>

      <div role="group" aria-label={title} className="-mt-1.5 flex flex-col">
        {getMonthGrid(month).map((week, row) => (
          <div
            key={row}
            className={clsx("grid grid-cols-7 rounded-full", week.includes(today) && "week-band")}
          >
            {week.map((date, index) => {
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
        ))}
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
 * One day: a ring that fills as habits are done, with a tinted disc once
 * everything is; solid and pulsing for today; and a dim ring with a dot on top
 * for days to come. The selected day's ring turns white and grows a little.
 */
function DayCell({ date, day, isToday, isSelected, isFuture, onSelect }: DayCellProps) {
  const reduced = useReducedMotion();
  const { progress, complete, skipped, color, description } = day;
  const ringColor = color ? habitColor(color).value : "var(--color-accent-mark)";
  const selected = isSelected && !isToday;

  let filter: string | undefined;
  if (isToday) filter = `drop-shadow(0 0 12px ${tint(ringColor, 0.6)})`;
  else if (complete) filter = `drop-shadow(0 0 6px ${tint(ringColor, 0.35)})`;

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
      className={clsx(
        "relative flex h-12 items-center justify-center rounded-full tabular-nums motion-safe:transition-transform motion-safe:duration-250 motion-safe:ease-spring",
        selected && "scale-106",
      )}
    >
      <svg
        viewBox="0 0 40 40"
        aria-hidden="true"
        className="absolute size-9 overflow-visible"
        style={{ filter }}
      >
        {isToday ? (
          <>
            {!reduced && (
              <circle cx="20" cy="20" r="20" fill="none" stroke={ringColor} strokeWidth="1.2">
                <animate attributeName="r" from="20" to="27" dur="2.2s" repeatCount="indefinite" />
                <animate
                  attributeName="opacity"
                  from="0.6"
                  to="0"
                  dur="2.2s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            <circle cx="20" cy="20" r="20" fill={ringColor} />
          </>
        ) : (
          <>
            {complete && <circle cx="20" cy="20" r={RING_RADIUS} fill={tint(ringColor, 0.16)} />}
            <circle
              cx="20"
              cy="20"
              r={RING_RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeDasharray={skipped ? "3 3" : undefined}
              className={selected ? "stroke-ink/92" : "stroke-ink/8"}
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
                stroke={ringColor}
                strokeOpacity={complete ? 1 : 0.85}
              />
            )}
          </>
        )}
        {(isFuture || isToday) && (
          <circle cx="20" cy="-1.5" r="1.6" fill={ringColor} opacity={isToday ? 1 : 0.6} />
        )}
      </svg>
      <span
        className={clsx(
          "relative text-md",
          isFuture ? "font-normal text-dim" : "font-semibold",
          isToday && "text-accent-ink",
          selected && "text-ink",
        )}
      >
        {parseDateKey(date).getDate()}
      </span>
    </button>
  );
}
