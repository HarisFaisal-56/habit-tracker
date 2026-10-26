import clsx from "clsx";
import { habitColor } from "./habitColors";

type HabitIconProps = {
  emoji: string;
  color: string;
};

/** A habit's emoji on its colour tint. The emoji is read out with the habit's name. */
export function HabitIcon({ emoji, color }: HabitIconProps) {
  return (
    <span
      className={clsx(
        "flex size-10 shrink-0 items-center justify-center rounded-xl text-xl",
        habitColor(color).soft,
      )}
    >
      {emoji}
    </span>
  );
}
