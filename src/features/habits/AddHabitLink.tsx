import { Plus } from "lucide-react";
import { Link } from "react-router";
import { NEW_HABIT_PARAM } from "./HabitsScreen";

/** Goes to the Habits tab with the add-habit sheet open. For empty states. */
export function AddHabitLink() {
  return (
    <Link
      to={`/habits?${NEW_HABIT_PARAM}`}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 active:bg-emerald-800 dark:bg-emerald-600"
    >
      <Plus aria-hidden="true" className="size-5" />
      Add your first habit
    </Link>
  );
}
