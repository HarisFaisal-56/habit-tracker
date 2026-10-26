import { Plus } from "lucide-react";
import { Link } from "react-router";
import { NEW_HABIT_PARAM } from "./HabitsScreen";

/** Goes to the Habits tab with the add-habit sheet open. For empty states. */
export function AddHabitLink() {
  return (
    <Link
      to={`/habits?${NEW_HABIT_PARAM}`}
      className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-accent px-5 text-sm font-semibold text-accent-ink hover:brightness-95 active:brightness-95"
    >
      <Plus aria-hidden="true" className="size-5" />
      Add your first habit
    </Link>
  );
}
