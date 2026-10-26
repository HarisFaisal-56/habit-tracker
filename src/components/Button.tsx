import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "cta";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "min-h-11 rounded-2xl bg-accent text-sm text-accent-ink hover:brightness-95 active:brightness-95 disabled:opacity-50",
  secondary:
    "min-h-11 rounded-2xl border border-line bg-surface text-sm text-ink hover:bg-raised active:bg-raised disabled:opacity-50",
  ghost:
    "min-h-11 rounded-2xl text-sm text-muted hover:bg-raised hover:text-ink active:bg-raised disabled:opacity-50",
  danger:
    "min-h-11 rounded-2xl text-sm text-danger hover:bg-raised active:bg-raised disabled:opacity-50",
  /**
   * A screen's one big action, e.g. saving the weekly review. Stays opaque when
   * disabled, so it can be pinned over scrolling content.
   */
  cta: "glow-accent min-h-13 rounded-full bg-accent text-lg text-accent-ink hover:brightness-95 active:brightness-95 disabled:bg-raised disabled:text-muted disabled:shadow-none",
};

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  icon?: LucideIcon;
};

export function Button({
  variant = "primary",
  icon: Icon,
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center gap-2 px-5 font-semibold motion-safe:transition-colors",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {Icon && <Icon aria-hidden="true" className="size-5" />}
      {children}
    </button>
  );
}

const ICON_VARIANTS = {
  ghost:
    "size-11 rounded-full text-muted hover:bg-raised hover:text-ink active:bg-raised disabled:opacity-40",
  /** The screen's main action, e.g. adding a habit. */
  primary:
    "glow-accent size-12 rounded-2xl bg-accent text-accent-ink hover:brightness-95 active:brightness-95",
  /** A bordered square, e.g. the month arrows on History. */
  tile: "size-11 rounded-2xl border border-line bg-surface text-soft hover:bg-raised active:bg-raised disabled:text-muted/50",
} as const;

type IconButtonProps = Omit<ComponentProps<"button">, "children" | "aria-label"> & {
  /** Accessible name; also shown as a tooltip. */
  label: string;
  icon: LucideIcon;
  variant?: keyof typeof ICON_VARIANTS;
};

export function IconButton({
  label,
  icon: Icon,
  variant = "ghost",
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center motion-safe:transition",
        ICON_VARIANTS[variant],
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}
