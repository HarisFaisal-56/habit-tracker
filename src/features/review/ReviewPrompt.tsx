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
      className="flex min-h-14 items-center gap-3 rounded-3xl border border-accent/30 bg-accent/10 p-4 text-ink hover:bg-accent/15 active:bg-accent/15"
    >
      <NotebookPen aria-hidden="true" className="size-5 shrink-0 text-accent-text" />
      <span className="flex-1">
        <span className="block font-medium">It’s Sunday: time for your weekly review</span>
        <span className="block text-sm text-muted">
          Two minutes to look back and set an intention.
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
    </Link>
  );
}
