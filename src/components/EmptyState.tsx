import type { ReactNode } from "react";

type EmptyStateProps = {
  children: ReactNode;
  /** E.g. a button or link to get started. */
  action?: ReactNode;
};

export function EmptyState({ children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-line p-6 text-center">
      <p className="text-muted">{children}</p>
      {action}
    </div>
  );
}
