import clsx from "clsx";
import { format } from "date-fns";
import { useLayoutEffect, useRef } from "react";
import { parseDateKey, type DateKey } from "../domain/dates";
import type { Schedule } from "../domain/habit";
import type { DayStatus } from "../domain/streaks";
import { dayStatusText } from "./dayStatusText";
import { habitColor } from "./habitColors";

// Geometry in CSS pixels. 53 weeks fit a desktop column; phones scroll sideways.
const CELL = 10;
const GAP = 2;
const STEP = CELL + GAP;
const LABEL_WIDTH = 26;
const LABEL_HEIGHT = 14;
const WEEKDAY_LABELS = [
  { row: 0, label: "Mon" },
  { row: 2, label: "Wed" },
  { row: 4, label: "Fri" },
];

// Done days use the habit's colour (currentColor); the rest are neutral greys.
const CELL_CLASS: Record<DayStatus, string | null> = {
  full: "fill-current",
  minimum: "fill-current opacity-40",
  skipped: "fill-stone-100 stroke-stone-400 dark:fill-stone-800 dark:stroke-stone-500",
  missed: "fill-stone-300 dark:fill-stone-600",
  pending: "fill-stone-100 stroke-current dark:fill-stone-800",
  off: "fill-stone-100 dark:fill-stone-800",
  inactive: null,
  future: null,
};

export type HeatmapCell = { date: DateKey; status: DayStatus };

type HeatmapProps = {
  /** Columns of seven days, Monday first. */
  weeks: readonly (readonly HeatmapCell[])[];
  monthLabels: readonly { week: number; label: string }[];
  color: string;
  schedule: Schedule;
  /** Accessible summary of the whole grid. */
  label: string;
};

/** A GitHub-style grid of days. Opens scrolled to the most recent week. */
export function Heatmap({ weeks, monthLabels, color, schedule, label }: HeatmapProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const width = LABEL_WIDTH + weeks.length * STEP - GAP;
  const height = LABEL_HEIGHT + 7 * STEP - GAP;

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
  }, []);

  return (
    <div
      ref={scrollRef}
      // Focusable so keyboard users can scroll it.
      tabIndex={0}
      role="group"
      aria-label="Last 12 months"
      className="overflow-x-auto overscroll-x-contain rounded-lg pb-1"
    >
      <svg
        role="img"
        aria-label={label}
        width={width}
        height={height}
        className={clsx("text-2xs", habitColor(color).accent)}
      >
        {monthLabels.map(({ week, label: month }) => (
          <text
            key={week}
            x={LABEL_WIDTH + week * STEP}
            y={LABEL_HEIGHT - 5}
            className="fill-stone-500 dark:fill-stone-400"
          >
            {month}
          </text>
        ))}
        {WEEKDAY_LABELS.map(({ row, label: weekday }) => (
          <text
            key={row}
            x={0}
            y={LABEL_HEIGHT + row * STEP + CELL - 1}
            className="fill-stone-500 dark:fill-stone-400"
          >
            {weekday}
          </text>
        ))}
        {weeks.map((week, column) =>
          week.map(({ date, status }, row) => {
            const cellClass = CELL_CLASS[status];
            if (cellClass === null) return null;
            return (
              <rect
                key={date}
                x={LABEL_WIDTH + column * STEP}
                y={LABEL_HEIGHT + row * STEP}
                width={CELL}
                height={CELL}
                rx={2}
                strokeWidth={1}
                className={cellClass}
              >
                <title>{`${format(parseDateKey(date), "EEE d MMM yyyy")}: ${dayStatusText(status, schedule)}`}</title>
              </rect>
            );
          }),
        )}
      </svg>
    </div>
  );
}

const LEGEND: { status: DayStatus; label: string }[] = [
  { status: "full", label: "Done" },
  { status: "minimum", label: "Minimum" },
  { status: "skipped", label: "Skipped" },
  { status: "missed", label: "Missed" },
  { status: "off", label: "Not scheduled" },
];

/** Explains the heatmap colours. Without a habit colour, done swatches are neutral. */
export function HeatmapLegend({ color }: { color?: string }) {
  return (
    <ul
      aria-label="Heatmap key"
      className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400"
    >
      {LEGEND.map(({ status, label }) => (
        <li key={status} className="flex items-center gap-1">
          <svg
            width={CELL}
            height={CELL}
            aria-hidden="true"
            className={color ? habitColor(color).accent : "text-stone-500 dark:text-stone-400"}
          >
            <rect
              x={0.5}
              y={0.5}
              width={CELL - 1}
              height={CELL - 1}
              rx={2}
              strokeWidth={1}
              className={CELL_CLASS[status] ?? undefined}
            />
          </svg>
          {label}
        </li>
      ))}
    </ul>
  );
}
