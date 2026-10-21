import { useId } from "react";

type SegmentedControlProps<T extends string | number> = {
  /** Accessible name for the group. */
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** A row of mutually exclusive options, built on native radios (arrow keys move between them). */
export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-800"
    >
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => {
              onChange(option.value);
            }}
            className="peer sr-only"
          />
          <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-1 text-center text-sm font-medium text-stone-600 peer-checked:bg-white peer-checked:text-stone-900 peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-emerald-600 dark:text-stone-300 dark:peer-checked:bg-stone-950 dark:peer-checked:text-stone-100">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
