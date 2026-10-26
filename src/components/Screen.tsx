import clsx from "clsx";
import type { ReactNode } from "react";

/** Each screen's coloured haze, as in the designs. Dark mode only. */
const GLOWS = {
  rings: "glow-at-rings glow-lime",
  lime: "glow-at-top glow-lime",
  chart: "glow-at-chart glow-lime",
  neutral: "glow-at-top-right glow-neutral",
  violet: "glow-at-top-right glow-violet",
  sky: "glow-at-top-left glow-sky",
  rose: "glow-at-top-right glow-rose",
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
  children?: ReactNode;
};

export function Screen({
  title,
  subtitle,
  actions,
  actionsAt = "middle",
  glow,
  children,
}: ScreenProps) {
  return (
    <section aria-labelledby="screen-title" className="relative isolate flex flex-col gap-5">
      {glow && <div aria-hidden="true" className={clsx("screen-glow", GLOWS[glow])} />}
      <header className="flex items-center justify-between gap-3 px-1 pt-screen">
        <div className="min-w-0">
          {subtitle && <p className="eyebrow mb-2.5">{subtitle}</p>}
          <h1 id="screen-title" className="text-title font-normal">
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
