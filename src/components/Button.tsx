import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-700 text-white hover:bg-emerald-800 active:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:active:bg-emerald-700",
  secondary:
    "bg-stone-200 text-stone-900 hover:bg-stone-300 active:bg-stone-300 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700 dark:active:bg-stone-700",
  ghost:
    "text-stone-700 hover:bg-stone-200 active:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800 dark:active:bg-stone-800",
  danger:
    "bg-rose-50 text-rose-700 hover:bg-rose-100 active:bg-rose-100 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900 dark:active:bg-rose-900",
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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold motion-safe:transition-colors disabled:opacity-50",
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

type IconButtonProps = Omit<ComponentProps<"button">, "children" | "aria-label"> & {
  /** Accessible name; also shown as a tooltip. */
  label: string;
  icon: LucideIcon;
};

export function IconButton({
  label,
  icon: Icon,
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
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-200 active:bg-stone-200 disabled:opacity-40 dark:text-stone-400 dark:hover:bg-stone-800 dark:active:bg-stone-800 motion-safe:transition-colors",
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}
