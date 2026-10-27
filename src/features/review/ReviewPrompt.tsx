import { ChevronRight, NotebookPen } from "lucide-react";
import { Link } from "react-router";
import { useWeeklyReviews } from "../../data/useData";
import { startOfWeek, type DateKey } from "../../domain/dates";
import { isReviewDay } from "./reviewData";

/** On Sundays, nudges towards the weekly review until this week's is saved. */
export function ReviewPrompt({ today }: { today: DateKey }) {
  const reviews = useWeeklyReviews();
  const weekStart = startOfWeek(today);
  if (!isReviewDay(today) || !reviews || reviews.some((r) => r.weekStart === weekStart)) {
    return null;
  }
  return (
    <Link
      to="/review"
      className="card flex min-h-14 animate-rise items-center gap-3 rounded-tile p-4 text-ink [--card-edge:color-mix(in_oklab,var(--color-accent)_40%,transparent)] [--card-wash:radial-gradient(120%_100%_at_0%_0%,color-mix(in_oklab,var(--color-accent)_12%,transparent),transparent_60%)] hover:brightness-110 active:scale-98 motion-safe:transition"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent-text shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-accent)_25%,transparent)]">
        <NotebookPen aria-hidden="true" className="size-4.5" strokeWidth={1.9} />
      </span>
      <span className="flex-1">
        <span className="block font-medium">It’s Sunday: time for your weekly review</span>
        <span className="block text-note text-muted">
          Two minutes to look back and set an intention.
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-dim" />
    </Link>
  );
}
