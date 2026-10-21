/** Tailwind classes for one entry in the fixed habit palette. */
export type HabitColorStyle = {
  /** Name for screen readers. */
  label: string;
  /** Solid fill, e.g. for colour swatches. */
  swatch: string;
  /** Light tint behind a habit's emoji. */
  soft: string;
  /** Text colour; SVG marks draw with `currentColor`. */
  accent: string;
};

// Full class names (not built from strings) so Tailwind can find them.
export const HABIT_COLORS = {
  emerald: {
    label: "Green",
    swatch: "bg-emerald-600",
    soft: "bg-emerald-100 dark:bg-emerald-950",
    accent: "text-emerald-600 dark:text-emerald-500",
  },
  teal: {
    label: "Teal",
    swatch: "bg-teal-600",
    soft: "bg-teal-100 dark:bg-teal-950",
    accent: "text-teal-600 dark:text-teal-500",
  },
  sky: {
    label: "Blue",
    swatch: "bg-sky-600",
    soft: "bg-sky-100 dark:bg-sky-950",
    accent: "text-sky-600 dark:text-sky-500",
  },
  indigo: {
    label: "Indigo",
    swatch: "bg-indigo-600",
    soft: "bg-indigo-100 dark:bg-indigo-950",
    accent: "text-indigo-600 dark:text-indigo-400",
  },
  violet: {
    label: "Purple",
    swatch: "bg-violet-600",
    soft: "bg-violet-100 dark:bg-violet-950",
    accent: "text-violet-600 dark:text-violet-400",
  },
  rose: {
    label: "Pink",
    swatch: "bg-rose-600",
    soft: "bg-rose-100 dark:bg-rose-950",
    accent: "text-rose-600 dark:text-rose-500",
  },
  orange: {
    label: "Orange",
    swatch: "bg-orange-600",
    soft: "bg-orange-100 dark:bg-orange-950",
    accent: "text-orange-600 dark:text-orange-500",
  },
  amber: {
    label: "Yellow",
    swatch: "bg-amber-500",
    soft: "bg-amber-100 dark:bg-amber-950",
    accent: "text-amber-600 dark:text-amber-500",
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
