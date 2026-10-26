import { useId } from "react";

// Drawn in a 300-wide box that scales to the container, as in design/stats.png.
const WIDTH = 300;
const HEIGHT = 96;
const PAD_X = 2;
/** Room above 100% for the line and its end marker. */
const PAD_TOP = 6;
const GRID_LINES = 3;

type Point = { x: number; y: number };

type TrendChartProps = {
  /** Rates from 0 to 1, oldest first; null leaves a gap. */
  values: readonly (number | null)[];
  /** Accessible description of the whole chart. */
  label: string;
};

/**
 * A small area chart of the completion rate on a fixed 0 to 100% scale, so a
 * steady 80% looks steady rather than every wobble filling the chart.
 */
export function TrendChart({ values, label }: TrendChartProps) {
  const gradientId = useId();
  const step = (WIDTH - 2 * PAD_X) / Math.max(1, values.length - 1);

  const points: Point[] = [];
  values.forEach((value, index) => {
    if (value === null) return;
    points.push({ x: PAD_X + index * step, y: PAD_TOP + (1 - value) * (HEIGHT - PAD_TOP) });
  });

  const first = points[0];
  const last = points[points.length - 1];
  if (points.length < 2 || !first || !last) return null;
  const line = points.map(({ x, y }, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  const area = `${line.join(" ")} L${last.x.toFixed(1)} ${String(HEIGHT)} L${first.x.toFixed(1)} ${String(HEIGHT)} Z`;

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
      className="h-auto w-full overflow-visible text-accent-text"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: GRID_LINES }, (_, index) => {
        const y = PAD_TOP + ((index + 1) * (HEIGHT - PAD_TOP)) / (GRID_LINES + 1);
        return (
          <line
            key={index}
            x1={0}
            x2={WIDTH}
            y1={y}
            y2={y}
            strokeWidth="0.75"
            className="stroke-ink/10"
          />
        );
      })}
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={last.x}
        cy={last.y}
        r="4"
        className="fill-canvas"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
