import { format } from "date-fns";
import { useState, type PointerEvent } from "react";
import { parseDateKey, type DateKey } from "../domain/dates";
import { habitColor } from "./habitColors";

// From design/orbit-upgrade/OrbitApp2.dc.html: 53 weeks of round dots fill the width of a phone.
const CELL = 5.2;
const GAP = 1.4;
const STEP = CELL + GAP;
/** Columns kept free of other month labels before the current month's, at the right edge. */
const LAST_LABEL_WEEKS = 8;
/** How much the dot under the pointer grows. */
const HOVER_SCALE = 1.6;

/** Brightness of a day: 0 is nothing done, 4 is everything. */
export type HeatmapLevel = 0 | 1 | 2 | 3 | 4;

const LEVEL_OPACITY: Record<Exclude<HeatmapLevel, 0>, number> = { 1: 0.2, 2: 0.42, 3: 0.68, 4: 1 };

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

type Spot = { column: number; row: number };

/**
 * A GitHub-style grid of days as dots that fits its container's width, with months
 * underneath. Pointing at a dot (or dragging a finger along the grid) shows that
 * day in a tooltip.
 */
export function Heatmap({ weeks, monthLabels, color, label }: HeatmapProps) {
  const [spot, setSpot] = useState<Spot | null>(null);
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

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const column = Math.floor((((event.clientX - box.left) / box.width) * width) / STEP);
    const row = Math.floor((((event.clientY - box.top) / box.height) * height) / STEP);
    const cell = weeks[column]?.[row];
    setSpot(cell && cell.level !== null ? { column, row } : null);
  };

  const hovered = spot && weeks[spot.column]?.[spot.row];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <svg
          role="img"
          aria-label={label}
          viewBox={`0 0 ${String(width)} ${String(height)}`}
          className="h-auto w-full touch-pan-y overflow-visible"
          onPointerDown={pick}
          onPointerMove={pick}
          onPointerLeave={() => {
            setSpot(null);
          }}
        >
          {weeks.map((week, column) =>
            week.map(({ date, level }, row) => {
              if (level === null) return null;
              const isHovered = spot?.column === column && spot.row === row;
              return (
                <circle
                  key={date}
                  data-date={date}
                  cx={column * STEP + CELL / 2}
                  cy={row * STEP + CELL / 2}
                  r={(CELL / 2) * (isHovered ? HOVER_SCALE : 1)}
                  className={level === 0 ? "fill-ink/6" : undefined}
                  style={{
                    ...(level === 0 ? undefined : { fill, fillOpacity: LEVEL_OPACITY[level] }),
                    ...(isHovered ? { stroke: "#fff", strokeWidth: 0.75 } : undefined),
                  }}
                />
              );
            }),
          )}
        </svg>
        {spot && hovered && (
          <div
            aria-hidden="true"
            data-testid="heatmap-tooltip"
            className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 animate-fade rounded-lg border border-line-strong bg-raised/95 px-2.5 py-1.5 text-xs whitespace-nowrap text-ink shadow-[0_10px_24px_rgb(0_0_0/0.5)]"
            style={{
              left: `clamp(60px, ${String(((spot.column + 0.5) / weeks.length) * 100)}%, calc(100% - 60px))`,
            }}
          >
            <span className="mr-1.5 font-mono text-2xs tracking-wide text-muted uppercase">
              {format(parseDateKey(hovered.date), "EEE d MMM")}
            </span>
            {hovered.description}
          </div>
        )}
      </div>
      <div aria-hidden="true" className="relative h-3">
        {shownLabels.map((label) => (
          <span
            key={label.week}
            className="absolute top-0 font-mono text-2xs tracking-wide text-faint uppercase"
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
