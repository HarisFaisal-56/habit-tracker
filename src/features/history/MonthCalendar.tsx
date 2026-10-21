import clsx from "clsx";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "../../components/Button";
import { addMonths, parseDateKey, type DateKey } from "../../domain/dates";
import { WEEKDAY_NAMES, WEEKDAYS_MONDAY_FIRST } from "../habits/describeSchedule";
import { getMonthGrid } from "./historyData";

export type CalendarDay = {
  /** A small visual for the day; decorative. */
  mark: ReactNode;
  /** Read after the date by screen readers, e.g. "2 of 3 done". */
  description: string;
};

type MonthCalendarProps = {
  /** The first day of the month to show. */
  month: DateKey;
  today: DateKey;
  selected: DateKey;
  canGoBack: boolean;
  canGoForward: boolean;
  onMonthChange: (month: DateKey) => void;
  onSelect: (date: DateKey) => void;
  getDay: (date: DateKey) => CalendarDay;
};

export function MonthCalendar({
  month,
  today,
  selected,
  canGoBack,
  canGoForward,
  onMonthChange,
  onSelect,
  getDay,
}: MonthCalendarProps) {
  const title = format(parseDateKey(month), "MMMM yyyy");

  return (
    <div className="rounded-3xl bg-white p-3 shadow-sm dark:bg-stone-900">
      <div className="mb-2 flex items-center justify-between">
        <IconButton
          label="Previous month"
          icon={ChevronLeft}
          disabled={!canGoBack}
          onClick={() => {
            onMonthChange(addMonths(month, -1));
          }}
        />
        <h2 aria-live="polite" className="font-semibold">
          {title}
        </h2>
        <IconButton
          label="Next month"
          icon={ChevronRight}
          disabled={!canGoForward}
          onClick={() => {
            onMonthChange(addMonths(month, 1));
          }}
        />
      </div>

      <div
        aria-hidden="true"
        className="grid grid-cols-7 text-center text-xs font-medium text-stone-500 dark:text-stone-400"
      >
        {WEEKDAYS_MONDAY_FIRST.map((day) => (
          <span key={day} className="py-1">
            {WEEKDAY_NAMES[day].charAt(0)}
          </span>
        ))}
      </div>

      <div role="group" aria-label={title} className="grid grid-cols-7 gap-y-1">
        {getMonthGrid(month)
          .flat()
          .map((date, index) => {
            if (date === null) return <span key={`blank-${String(index)}`} />;
            const { mark, description } = getDay(date);
            const isToday = date === today;
            const isSelected = date === selected;
            return (
              <button
                key={date}
                type="button"
                disabled={date > today}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                aria-label={`${format(parseDateKey(date), "EEEE d MMMM")}${isToday ? " (today)" : ""}, ${description}`}
                onClick={() => {
                  onSelect(date);
                }}
                className={clsx(
                  "flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-sm tabular-nums motion-safe:transition-colors disabled:opacity-35",
                  isSelected
                    ? "bg-emerald-50 ring-2 ring-emerald-600 dark:bg-emerald-950 dark:ring-emerald-500"
                    : "hover:bg-stone-100 active:bg-stone-100 dark:hover:bg-stone-800 dark:active:bg-stone-800",
                )}
              >
                <span
                  className={clsx(isToday && "font-bold text-emerald-700 dark:text-emerald-400")}
                >
                  {parseDateKey(date).getDate()}
                </span>
                <span className="flex h-6 items-center justify-center">{mark}</span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
