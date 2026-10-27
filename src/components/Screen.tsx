import clsx from "clsx";
import type { ReactNode } from "react";

/** Each screen's coloured haze, as in the design. Dark mode only. */
const GLOWS = {
  today: "glow-today",
  habits: "glow-habits",
  history: "glow-history",
  stats: "glow-stats",
  review: "glow-review",
  settings: "glow-settings",
} as const;

type ScreenProps = {
  title: string;
  /** A short caption above the title, shown in the spaced-out mono style. */
  subtitle?: ReactNode;
  /** Buttons shown next to the title. */
  actions?: ReactNode;
  /** Line the actions up with the top of the header, or centre them on it (default). */
  actionsAt?: "top" | "middle";
  glow?: keyof typeof GLOWS;
  /** Space between the sections, in the design's 18px or 20px. */
  gap?: "default" | "loose";
  children?: ReactNode;
};

export function Screen({
  title,
  subtitle,
  actions,
  actionsAt = "middle",
  glow,
  gap = "default",
  children,
}: ScreenProps) {
  return (
    <section
      aria-labelledby="screen-title"
      className={clsx("relative isolate flex flex-col", gap === "loose" ? "gap-5" : "gap-4.5")}
    >
      {glow && <div aria-hidden="true" className={clsx("screen-glow", GLOWS[glow])} />}
      <header className="flex animate-rise items-center justify-between gap-3 px-1 pt-screen">
        <div className="min-w-0">
          {subtitle && <p className="eyebrow mb-2.5 flex items-center gap-2">{subtitle}</p>}
          <h1 id="screen-title" className="text-gradient text-title font-normal">
            {title}
          </h1>
        </div>
        {actions && (
          <div
            className={clsx(
              "flex shrink-0 items-center gap-2",
              actionsAt === "top" && "self-start",
            )}
          >
            {actions}
          </div>
        )}
      </header>
      {children}
    </section>
  );
}
