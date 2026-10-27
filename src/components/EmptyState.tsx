import type { ReactNode } from "react";

type EmptyStateProps = {
  children: ReactNode;
  /** E.g. a button or link to get started. */
  action?: ReactNode;
};

export function EmptyState({ children, action }: EmptyStateProps) {
  return (
    <div className="card flex animate-rise flex-col items-center gap-4 rounded-card px-6 py-8 text-center">
      <p className="text-md text-muted">{children}</p>
      {action}
    </div>
  );
}
