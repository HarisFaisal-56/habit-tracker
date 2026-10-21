import type { ReactNode } from "react";

type ScreenProps = {
  title: string;
  subtitle?: ReactNode;
  /** Buttons shown next to the title. */
  actions?: ReactNode;
  children?: ReactNode;
};

export function Screen({ title, subtitle, actions, children }: ScreenProps) {
  return (
    <section aria-labelledby="screen-title" className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          {subtitle && <p className="text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>}
          <h1 id="screen-title" className="text-2xl font-semibold tracking-tight">
            {title}
          </h1>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
