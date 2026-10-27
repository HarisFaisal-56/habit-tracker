import clsx from "clsx";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

const VARIANTS = {
  /** Full width, a raised grey segment for the choice, e.g. forms. */
  neutral: {
    group: "grid auto-cols-fr grid-flow-col rounded-2xl bg-raised",
    option:
      "touch-target h-9.5 rounded-xl px-1 text-base peer-checked:bg-ink/15 peer-checked:font-medium peer-checked:text-ink",
    thumb: undefined,
  },
  /** Compact 48px cells and mono labels, a glossy lime thumb sliding between them, e.g. the Stats time range. */
  accent: {
    group:
      "inline-grid auto-cols-[3rem] grid-flow-col rounded-2xl border border-line-strong bg-ink/5 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]",
    option:
      "touch-target h-9 font-mono text-sm font-medium peer-checked:text-accent-ink motion-safe:duration-250",
    thumb: "lime-gloss top-1 left-1 h-9 w-12 rounded-xl",
  },
  /** Pills sized to their labels with a count badge, a raised thumb sliding between them, e.g. Active / Archived. */
  pill: {
    group: "inline-flex rounded-full border border-line bg-surface/70",
    option:
      "h-8.5 gap-2 rounded-full pr-2 pl-3.5 text-md font-medium peer-checked:text-ink motion-safe:duration-200",
    thumb:
      "top-1 bottom-1 rounded-full bg-linear-to-b from-raised to-line shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_4px_12px_-4px_rgb(0_0_0/0.6)]",
  },
} as const;

type Option<T> = {
  value: T;
  label: string;
  /** A small count shown in a badge after the label (pill variant). */
  count?: number;
};

type SegmentedControlProps<T extends string | number> = {
  /** Accessible name for the group. */
  label: string;
  options: readonly Option<T>[];
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
  const index = options.findIndex((option) => option.value === value);
  const [groupRef, pillThumbStyle] = usePillThumb(variant === "pill", index);

  let thumbStyle: CSSProperties | undefined;
  if (variant === "accent") {
    // Cells are 48px with a 4px gap between them.
    thumbStyle = { transform: `translateX(calc(${String(index)} * (100% + 4px)))` };
  } else if (variant === "pill") {
    thumbStyle = pillThumbStyle;
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      className={clsx("relative gap-1 p-1", styles.group)}
    >
      {styles.thumb && thumbStyle && index >= 0 && (
        <span
          aria-hidden="true"
          className={clsx(
            "absolute motion-safe:transition-[transform,left,width] motion-safe:duration-400 motion-safe:ease-slide",
            styles.thumb,
          )}
          style={thumbStyle}
        />
      )}
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label key={option.value} className="relative">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              aria-label={
                option.count === undefined ? undefined : `${option.label} (${String(option.count)})`
              }
              onChange={() => {
                onChange(option.value);
              }}
              className="peer sr-only"
            />
            <span
              className={clsx(
                "flex cursor-pointer items-center justify-center text-center text-muted peer-focus-visible:outline-2 peer-focus-visible:outline-accent-text motion-safe:transition-colors",
                styles.option,
                // Without a measured thumb (e.g. no ResizeObserver), mark the choice itself.
                variant === "pill" && !pillThumbStyle && "peer-checked:bg-raised",
              )}
            >
              {option.label}
              {option.count !== undefined && (
                <span
                  className={clsx(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-caption motion-safe:transition-colors motion-safe:duration-250",
                    checked ? "bg-accent text-accent-ink" : "bg-raised text-muted",
                  )}
                >
                  {option.count}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** Measures the chosen pill so the thumb can slide to it and match its width. */
function usePillThumb(enabled: boolean, index: number) {
  const groupRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties | undefined>();

  useEffect(() => {
    const group = groupRef.current;
    if (!enabled || !group || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const target = group.querySelectorAll("label")[index];
      if (target) setStyle({ left: target.offsetLeft, width: target.offsetWidth });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    return () => {
      observer.disconnect();
    };
  }, [enabled, index]);

  return [groupRef, style] as const;
}
