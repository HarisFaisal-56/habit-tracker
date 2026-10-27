import clsx from "clsx";
import { habitColor, habitStyle, tint } from "./habitColors";

const SIZES = {
  /** Today's tiles. */
  sm: "size-8.5 rounded-xl text-lg",
  /** Stats cards. */
  md: "size-10.5 rounded-icon text-xl",
  /** Habits cards. */
  lg: "size-11.5 rounded-icon-lg text-emoji",
  /** Sheet headers. */
  xl: "size-12 rounded-2xl text-emoji",
} as const;

type HabitIconProps = {
  emoji: string;
  color: string;
  size?: keyof typeof SIZES;
  /** A soft glow in the habit's colour underneath. */
  glow?: boolean;
  /** A small dot in the habit's colour on the corner, as on Today. */
  dot?: boolean;
};

/** A habit's emoji on a lit tile of its colour. The emoji is read out with the habit's name. */
export function HabitIcon({
  emoji,
  color,
  size = "md",
  glow = false,
  dot = false,
}: HabitIconProps) {
  const { value } = habitColor(color);
  return (
    <span
      className={clsx("habit-tile relative flex shrink-0 items-center justify-center", SIZES[size])}
      style={habitStyle(
        color,
        glow
          ? {
              boxShadow: `inset 0 0 0 1px ${tint(value, 0.32)}, inset 0 1px 0 rgb(255 255 255 / 0.12), 0 10px 24px -10px ${tint(value, 0.55)}`,
            }
          : undefined,
      )}
    >
      {emoji}
      {dot && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -bottom-0.5 size-2.25 rounded-full ring-2 ring-surface"
          style={{ backgroundColor: value, boxShadow: `0 0 8px ${tint(value, 0.7)}` }}
        />
      )}
    </span>
  );
}
