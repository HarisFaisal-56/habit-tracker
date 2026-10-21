import type { ReactNode } from "react";

type EmptyStateProps = {
  children: ReactNode;
  /** E.g. a button or link to get started. */
  action?: ReactNode;
};

export function EmptyState({ children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-stone-300 p-6 text-center dark:border-stone-700">
      <p className="text-stone-500 dark:text-stone-400">{children}</p>
      {action}
    </div>
  );
}
