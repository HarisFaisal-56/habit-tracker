import clsx from "clsx";

type SwitchProps = {
  /** Accessible name, e.g. "Habit reminders". */
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** An on/off toggle: lime with a dark knob on the right when on. */
export function Switch({ label, checked, onChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        onChange(!checked);
      }}
      className={clsx(
        "touch-target inline-flex h-8 w-13 shrink-0 items-center rounded-full border-2 p-0.5 motion-safe:transition-colors disabled:opacity-40",
        checked ? "border-accent bg-accent" : "border-line-strong bg-raised",
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "size-6 rounded-full motion-safe:transition-transform",
          checked ? "translate-x-5 bg-accent-ink" : "bg-muted",
        )}
      />
    </button>
  );
}
