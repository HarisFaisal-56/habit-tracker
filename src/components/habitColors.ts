import type { CSSProperties } from "react";

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

/** Inline styles that may also set CSS custom properties, e.g. `--hc`. */
export type StyleWithVars = CSSProperties & Partial<Record<`--${string}`, string>>;

/** A colour at `alpha` opacity (0 to 1), e.g. a habit colour as a faint wash. */
export function tint(color: string, alpha: number): string {
  return `color-mix(in oklab, ${color} ${String(Math.round(alpha * 100))}%, transparent)`;
}

/**
 * Sets `--hc` to a habit's colour for the utilities that read it (e.g.
 * `habit-tile`), plus any other styles given.
 */
export function habitStyle(color: string, style?: StyleWithVars): StyleWithVars {
  return { "--hc": habitColor(color).value, ...style };
}

/**
 * A `card` washed with a habit's colour from the top-left corner, its edge lit in
 * the same colour. The alphas vary a little between screens in the design.
 */
export function habitCardStyle(color: string, wash: number, edge: number): StyleWithVars {
  const { value } = habitColor(color);
  return {
    "--card-wash": `radial-gradient(110% 80% at 0% 0%, ${tint(value, wash)}, transparent 55%)`,
    "--card-edge": tint(value, edge),
  };
}
