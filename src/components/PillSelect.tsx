import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

type PillSelectProps = {
  /** Accessible name, e.g. "Habit". */
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** `<option>` and `<optgroup>` elements. */
  children: ReactNode;
};

/** A native select drawn as a small pill that fits its selected text, for a screen's header. */
export function PillSelect({ label, value, onChange, children }: PillSelectProps) {
  return (
    <span className="relative flex items-center">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="touch-target field-sizing-content h-9 max-w-40 appearance-none truncate rounded-full border border-line-strong bg-surface pr-8 pl-3.5 text-sm text-soft"
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 size-4 text-muted"
      />
    </span>
  );
}
