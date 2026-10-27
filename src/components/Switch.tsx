import clsx from "clsx";

type SwitchProps = {
  /** Accessible name, e.g. "Habit reminders". */
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

/** An on/off toggle: glossy lime with a dark knob that springs to the right when on. */
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
        "touch-target inline-flex h-8 w-13.5 shrink-0 items-center rounded-full p-0.75 motion-safe:transition-all motion-safe:duration-300 disabled:opacity-40",
        checked ? "lime-gloss" : "bg-raised shadow-[inset_0_0_0_1px_var(--color-line-strong)]",
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "size-6.5 rounded-full shadow-[0_3px_8px_rgb(0_0_0/0.4),inset_0_1px_0_rgb(255_255_255/0.15)] motion-safe:transition-[transform,background-color] motion-safe:duration-350 motion-safe:ease-[cubic-bezier(0.4,1.5,0.5,1)]",
          checked ? "translate-x-5.5 bg-accent-ink" : "bg-faint",
        )}
      />
    </button>
  );
}
