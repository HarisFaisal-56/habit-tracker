import { format } from "date-fns";
import { parseDateKey, type DateKey } from "../domain/dates";
import { habitColor } from "./habitColors";

// Measured from design/history.png: 53 weeks fill the width of a phone.
const CELL = 5;
const GAP = 1.3;
const STEP = CELL + GAP;
/** Columns kept free of other month labels before the current month's, at the right edge. */
const LAST_LABEL_WEEKS = 8;

/** Brightness of a day: 0 is nothing done, 4 is everything. */
export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

const LEVEL_OPACITY: Record<Exclude<HeatmapLevel, 0>, number> = { 1: 0.22, 2: 0.48, 3: 0.72, 4: 1 };

/** A day in the grid. `null` level days (before the start, or in the future) aren't drawn. */
export type HeatmapCell = { date: DateKey; level: HeatmapLevel | null; description: string };

type HeatmapProps = {
  /** Columns of seven days, Monday first. */
  weeks: readonly (readonly HeatmapCell[])[];
  monthLabels: readonly { week: number; label: string }[];
  /** A habit colour key; the accent when left out. */
  color?: string;
  /** Accessible summary of the whole grid. */
  label: string;
};

/** A GitHub-style grid of days that fits its container's width, with months underneath. */
export function Heatmap({ weeks, monthLabels, color, label }: HeatmapProps) {
  const width = weeks.length * STEP - GAP;
  const height = 7 * STEP - GAP;
  const fill = color ? habitColor(color).value : "var(--color-accent-mark)";
  // Every other month so the labels never run into each other, and always the
  // current month, pinned to the right edge (with room kept clear before it).
  const last = monthLabels.at(-1);
  const shownLabels = monthLabels.filter(
    (label, index) =>
      label === last || (index % 2 === 0 && label.week <= weeks.length - LAST_LABEL_WEEKS),
  );

  return (
    <div className="flex flex-col gap-2">
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${String(width)} ${String(height)}`}
        className="h-auto w-full"
      >
        {weeks.map((week, column) =>
          week.map(({ date, level, description }, row) => {
            if (level === null) return null;
            return (
              <rect
                key={date}
                x={column * STEP}
                y={row * STEP}
                width={CELL}
                height={CELL}
                rx={1.2}
                className={level === 0 ? "fill-ink/8" : undefined}
                style={level === 0 ? undefined : { fill, fillOpacity: LEVEL_OPACITY[level] }}
              >
                <title>{`${format(parseDateKey(date), "EEE d MMM yyyy")}: ${description}`}</title>
              </rect>
            );
          }),
        )}
      </svg>
      <div aria-hidden="true" className="relative h-3">
        {shownLabels.map((label) => (
          <span
            key={label.week}
            className="label absolute top-0 tracking-normal"
            style={
              label === last
                ? { right: 0 }
                : { left: `${String(((label.week * STEP) / width) * 100)}%` }
            }
          >
            {label.label}
          </span>
        ))}
      </div>
    </div>
  );
}
