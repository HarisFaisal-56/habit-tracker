/** Tailwind classes for one entry in the fixed habit palette. */
export type HabitColorStyle = {
  /** Name for screen readers. */
  label: string;
  /** Solid fill, e.g. for colour swatches and dots. */
  swatch: string;
  /** Light tint behind a habit's emoji. */
  soft: string;
  /** Text colour; SVG marks draw with `currentColor`. */
  accent: string;
  /** The colour itself, for SVG strokes and inline styles. */
  value: string;
};

// Full class names (not built from strings) so Tailwind can find them. The
// colours live in src/index.css and differ between light and dark.
export const HABIT_COLORS = {
  emerald: {
    label: "Green",
    swatch: "bg-habit-emerald",
    soft: "bg-habit-emerald/15",
    accent: "text-habit-emerald",
    value: "var(--color-habit-emerald)",
  },
  teal: {
    label: "Mint",
    swatch: "bg-habit-teal",
    soft: "bg-habit-teal/15",
    accent: "text-habit-teal",
    value: "var(--color-habit-teal)",
  },
  sky: {
    label: "Blue",
    swatch: "bg-habit-sky",
    soft: "bg-habit-sky/15",
    accent: "text-habit-sky",
    value: "var(--color-habit-sky)",
  },
  indigo: {
    label: "Indigo",
    swatch: "bg-habit-indigo",
    soft: "bg-habit-indigo/15",
    accent: "text-habit-indigo",
    value: "var(--color-habit-indigo)",
  },
  violet: {
    label: "Purple",
    swatch: "bg-habit-violet",
    soft: "bg-habit-violet/15",
    accent: "text-habit-violet",
    value: "var(--color-habit-violet)",
  },
  rose: {
    label: "Pink",
    swatch: "bg-habit-rose",
    soft: "bg-habit-rose/15",
    accent: "text-habit-rose",
    value: "var(--color-habit-rose)",
  },
  orange: {
    label: "Orange",
    swatch: "bg-habit-orange",
    soft: "bg-habit-orange/15",
    accent: "text-habit-orange",
    value: "var(--color-habit-orange)",
  },
  amber: {
    label: "Yellow",
    swatch: "bg-habit-amber",
    soft: "bg-habit-amber/15",
    accent: "text-habit-amber",
    value: "var(--color-habit-amber)",
  },
} as const satisfies Record<string, HabitColorStyle>;

export type HabitColor = keyof typeof HABIT_COLORS;

export const HABIT_COLOR_KEYS = Object.keys(HABIT_COLORS) as HabitColor[];

export const DEFAULT_HABIT_COLOR: HabitColor = "emerald";

function isHabitColor(color: string): color is HabitColor {
  return Object.hasOwn(HABIT_COLORS, color);
}

/** Styles for a stored colour, falling back to the default for unknown values. */
export function habitColor(color: string): HabitColorStyle {
  return HABIT_COLORS[isHabitColor(color) ? color : DEFAULT_HABIT_COLOR];
}
