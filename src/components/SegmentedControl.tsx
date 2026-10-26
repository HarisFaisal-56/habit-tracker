import clsx from "clsx";
import { useId } from "react";

const VARIANTS = {
  /** Full width, a raised grey segment for the choice, e.g. forms and the theme setting. */
  neutral: {
    group: "grid auto-cols-fr grid-flow-col rounded-2xl bg-raised",
    option:
      "touch-target h-9.5 rounded-xl px-1 text-base peer-checked:bg-ink/15 peer-checked:font-medium peer-checked:text-ink",
  },
  /** Compact, a lime segment and mono labels, e.g. the Stats time range. */
  accent: {
    group: "inline-grid grid-flow-col rounded-2xl border border-line-strong bg-ink/8",
    option:
      "touch-target h-9 min-w-11 rounded-xl px-2.5 font-mono text-sm peer-checked:bg-accent peer-checked:text-accent-ink",
  },
} as const;

type SegmentedControlProps<T extends string | number> = {
  /** Accessible name for the group. */
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  variant?: keyof typeof VARIANTS;
};

/** A row of mutually exclusive options, built on native radios (arrow keys move between them). */
export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
  variant = "neutral",
}: SegmentedControlProps<T>) {
  const name = useId();
  const styles = VARIANTS[variant];
  return (
    <div role="radiogroup" aria-label={label} className={clsx("gap-1 p-1", styles.group)}>
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
          <span
            className={clsx(
              "flex cursor-pointer items-center justify-center text-center text-muted peer-focus-visible:outline-2 peer-focus-visible:outline-accent-text motion-safe:transition-colors",
              styles.option,
            )}
          >
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
