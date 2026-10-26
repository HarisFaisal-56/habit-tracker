import clsx from "clsx";
import { Check } from "lucide-react";
import { useId } from "react";
import { HABIT_COLOR_KEYS, HABIT_COLORS } from "./habitColors";

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Colour</legend>
      <div className="flex flex-wrap gap-1">
        {HABIT_COLOR_KEYS.map((key) => (
          <label key={key} className="relative">
            <input
              type="radio"
              name={name}
              value={key}
              checked={value === key}
              onChange={() => {
                onChange(key);
              }}
              aria-label={HABIT_COLORS[key].label}
              className="peer sr-only"
            />
            <span className="flex size-11 cursor-pointer items-center justify-center rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-text">
              <span
                className={clsx(
                  "flex size-8 items-center justify-center rounded-full text-accent-ink",
                  HABIT_COLORS[key].swatch,
                )}
              >
                {value === key && <Check aria-hidden="true" className="size-5" strokeWidth={3} />}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
