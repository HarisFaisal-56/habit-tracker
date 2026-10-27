import clsx from "clsx";
import { format } from "date-fns";
import { useId, useState, type PointerEvent } from "react";
import { useReducedMotion } from "../../components/useReducedMotion";
import { addDays, parseDateKey, type DateKey } from "../../domain/dates";
import { smoothPath } from "./statsData";

// Drawn in a 300-wide box that scales to the container, as in the design's trendSvg.
const WIDTH = 300;
const HEIGHT = 110;
const PAD_X = 2;
/** Room above 100% for the line and its marker. */
const PAD_TOP = 8;
/** Gridlines at 100, 75, 50 and 25%. */
const GRID_LINES = 4;
const LINE = "var(--color-accent-mark)";

type Point = { x: number; y: number; index: number; value: number };

type TrendChartProps = {
  /** Rates from 0 to 1, oldest first, the last one today; null days are skipped. */
  values: readonly (number | null)[];
  today: DateKey;
  /** Accessible description of the whole chart. */
  label: string;
};

/**
 * A glowing area chart of the completion rate on a fixed 0 to 100% scale, so a
 * steady 80% looks steady rather than every wobble filling the chart. Moving a
 * pointer (or a finger) along it shows that day's value; it rests on today.
 */
export function TrendChart({ values, today, label }: TrendChartProps) {
  const ids = useId();
  const reduced = useReducedMotion();
  const [scrub, setScrub] = useState<number | null>(null);
  const step = (WIDTH - 2 * PAD_X) / Math.max(1, values.length - 1);

  const points: Point[] = [];
  values.forEach((value, index) => {
    if (value === null) return;
    points.push({
      x: PAD_X + index * step,
      y: PAD_TOP + (1 - value) * (HEIGHT - PAD_TOP),
      index,
      value,
    });
  });

  const first = points[0];
  const last = points.at(-1);
  if (points.length < 2 || !first || !last) return null;

  // The point nearest the pointer, or today's.
  const current =
    scrub === null
      ? last
      : points.reduce((best, point) =>
          Math.abs(point.index - scrub) < Math.abs(best.index - scrub) ? point : best,
        );
  const isLast = current === last;
  const line = smoothPath(points);
  const area = `${line} L${last.x.toFixed(1)} ${String(HEIGHT)} L${first.x.toFixed(1)} ${String(HEIGHT)} Z`;
  const share = current.x / WIDTH;
  const date = addDays(today, current.index - (values.length - 1));

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0) return;
    const x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
    setScrub(Math.round(x * (values.length - 1)));
  };

  return (
    <div
      className="relative cursor-crosshair touch-pan-y"
      onPointerDown={pick}
      onPointerMove={pick}
      onPointerLeave={() => {
        setScrub(null);
      }}
    >
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
        className="block h-auto w-full overflow-visible"
      >
        <defs>
          <linearGradient id={`${ids}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={LINE} stopOpacity="0.34" />
            <stop offset="0.6" stopColor={LINE} stopOpacity="0.06" />
            <stop offset="1" stopColor={LINE} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${ids}-line`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={LINE} stopOpacity="0.35" />
            <stop offset="0.5" stopColor={LINE} stopOpacity="0.9" />
            <stop offset="1" stopColor={LINE} stopOpacity="1" />
          </linearGradient>
          <filter id={`${ids}-glow`} x="-10%" y="-50%" width="120%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {Array.from({ length: GRID_LINES }, (_, index) => {
          const y = PAD_TOP + (index * (HEIGHT - PAD_TOP)) / GRID_LINES;
          return (
            <g key={index}>
              <line
                x1={0}
                x2={WIDTH}
                y1={y}
                y2={y}
                strokeWidth="0.5"
                strokeDasharray="1.5 3"
                className="stroke-ink/7"
              />
              <text
                x={WIDTH + 5}
                y={y + 2.4}
                fontSize="6.5"
                className="fill-dim font-mono"
                aria-hidden="true"
              >
                {100 - index * 25}
              </text>
            </g>
          );
        })}
        <path d={area} fill={`url(#${ids}-area)`} />
        <path
          d={line}
          fill="none"
          stroke={`url(#${ids}-line)`}
          strokeWidth="2.2"
          strokeLinecap="round"
          filter={`url(#${ids}-glow)`}
        />
        <line
          x1={current.x}
          x2={current.x}
          y1={0}
          y2={HEIGHT}
          stroke={LINE}
          strokeOpacity="0.4"
          strokeWidth="0.8"
          strokeDasharray="2 2"
        />
        {isLast && !reduced && (
          <circle cx={current.x} cy={current.y} r="4" fill="none" stroke={LINE} strokeWidth="1.2">
            <animate attributeName="r" from="4" to="14" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.7" to="0" dur="2s" repeatCount="indefinite" />
          </circle>
        )}
        <circle
          cx={current.x}
          cy={current.y}
          r="4.2"
          stroke={LINE}
          strokeWidth="2.2"
          className="fill-canvas"
          style={{ filter: `drop-shadow(0 0 6px ${LINE})` }}
        />
      </svg>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -mt-3 rounded-xl border border-line-strong bg-surface/92 px-2.5 py-1.75 whitespace-nowrap shadow-[0_12px_28px_rgb(0_0_0/0.55)] backdrop-blur-sm motion-safe:transition-[left,top] motion-safe:duration-75 motion-safe:ease-linear"
        style={{
          left: `${String(share * 100)}%`,
          top: `${String((current.y / HEIGHT) * 100)}%`,
          transform: `translate(${share > 0.8 ? "-100%" : share < 0.2 ? "0%" : "-50%"}, -100%)`,
        }}
      >
        <p className="text-base font-medium tabular-nums">
          {Math.round(current.value * 100)}
          <span className="font-normal text-muted">%</span>
        </p>
        <p
          className={clsx(
            "mt-0.5 font-mono text-micro tracking-[0.08em] uppercase",
            isLast ? "text-accent-text" : "text-muted",
          )}
        >
          {isLast ? "Today" : format(parseDateKey(date), "EEE d MMM")}
        </p>
      </div>
    </div>
  );
}
