import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost" | "cta";

const VARIANTS: Record<ButtonVariant, string> = {
  /** Solid lime, e.g. "Save note" and "Done". */
  primary:
    "rounded-2xl bg-accent text-accent-ink hover:brightness-95 active:brightness-95 disabled:opacity-50",
  /** A raised grey pill, e.g. "Cancel". */
  secondary: "rounded-2xl bg-raised text-soft hover:text-ink active:text-ink disabled:opacity-50",
  /** Quieter than secondary, e.g. "Clear today". */
  ghost:
    "rounded-2xl bg-raised/60 text-muted hover:bg-raised hover:text-ink active:bg-raised disabled:opacity-50",
  /** Solid red with a red glow, for confirming something destructive. */
  danger:
    "rounded-2xl bg-danger text-accent-ink shadow-[0_10px_24px_-10px_var(--color-danger)] hover:brightness-95 active:brightness-95 disabled:opacity-50",
  /** Red text only, for the first step of something destructive. */
  "danger-ghost":
    "rounded-2xl text-base font-normal text-danger hover:bg-danger/8 active:bg-danger/8 disabled:opacity-50",
  /**
   * A screen's one big action, e.g. starting from the welcome card. Pass its
   * height and type size. Stays opaque when disabled.
   */
  cta: "lime-gloss lime-glow-lg rounded-full font-semibold text-accent-ink disabled:bg-raised disabled:bg-none disabled:text-muted disabled:shadow-none",
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
        "inline-flex items-center justify-center gap-2 px-4.5 active:scale-98 motion-safe:transition",
        // A big call to action takes its height and type size from the caller.
        variant !== "cta" && "min-h-11.5",
        variant !== "cta" && variant !== "danger-ghost" && "text-sm font-semibold",
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {Icon && <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />}
      {children}
    </button>
  );
}

const ICON_VARIANTS = {
  ghost:
    "size-11 rounded-full text-muted hover:bg-raised hover:text-ink active:bg-raised disabled:opacity-30",
  /** A round raised button, e.g. the reorder arrows. */
  round:
    "size-11 rounded-full bg-raised text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] disabled:opacity-30",
  /** The screen's main action, e.g. adding a habit: glossy lime, turning as it's pressed. */
  primary:
    "lime-gloss lime-glow-lg size-13 rounded-field text-accent-ink active:scale-92 active:rotate-90 motion-safe:duration-200 motion-safe:ease-spring [&_svg]:size-6",
  /** A square with a lit edge, e.g. the month arrows on History. */
  tile: "card size-11 rounded-2xl text-soft active:scale-94 disabled:text-muted/35",
} as const;

type IconButtonProps = Omit<ComponentProps<"button">, "children" | "aria-label"> & {
  /** Accessible name; also shown as a tooltip. */
  label: string;
  icon: LucideIcon;
  variant?: keyof typeof ICON_VARIANTS;
  /** Stroke width of the icon. */
  strokeWidth?: number;
};

export function IconButton({
  label,
  icon: Icon,
  variant = "ghost",
  strokeWidth = 2,
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
      <Icon aria-hidden="true" className="size-5" strokeWidth={strokeWidth} />
    </button>
  );
}
