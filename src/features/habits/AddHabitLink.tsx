import { Plus } from "lucide-react";
import { Link } from "react-router";
import { NEW_HABIT_PARAM } from "./HabitsScreen";

/** Goes to the Habits tab with the add-habit sheet open. For empty states. */
export function AddHabitLink() {
  return (
    <Link
      to={`/habits?${NEW_HABIT_PARAM}`}
      className="lime-gloss inline-flex min-h-11.5 items-center gap-2 rounded-full px-5 text-sm font-semibold text-accent-ink hover:brightness-105 active:scale-98 motion-safe:transition"
    >
      <Plus aria-hidden="true" className="size-5" />
      Add your first habit
    </Link>
  );
}
