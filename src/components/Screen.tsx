import type { ReactNode } from "react";

type ScreenProps = {
  title: string;
  children?: ReactNode;
};

export function Screen({ title, children }: ScreenProps) {
  return (
    <section aria-labelledby="screen-title" className="flex flex-col gap-4">
      <h1 id="screen-title" className="text-2xl font-semibold tracking-tight">
        {title}
      </h1>
      {children}
    </section>
  );
}
