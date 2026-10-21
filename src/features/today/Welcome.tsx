import clsx from "clsx";
import { Feather, HeartHandshake, NotebookPen, Plus, Repeat, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/Button";
import { habitColor } from "../../components/habitColors";
import { useRepository } from "../../data/RepositoryContext";
import type { NewHabit } from "../../data/repository";
import { useSettings } from "../../store/settingsStore";
import { NEW_HABIT_PARAM } from "../habits/HabitsScreen";
import { describeSchedule } from "../habits/describeSchedule";
import { STARTER_HABITS } from "./starterHabits";

const PRINCIPLES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Repeat,
    title: "Never miss twice",
    text: "One missed day won’t break your streak. Two in a row will.",
  },
  {
    icon: Feather,
    title: "Minimum version",
    text: "On hard days, do a tiny version. It still counts.",
  },
  {
    icon: HeartHandshake,
    title: "Skip days",
    text: "Sick or travelling? Skip, and your streak is safe.",
  },
  {
    icon: NotebookPen,
    title: "Weekly review",
    text: "Each Sunday, look back and choose one thing to focus on.",
  },
];

/** First-run introduction on Today, shown until dismissed or a habit exists. */
export function Welcome() {
  const repository = useRepository();
  const dismissWelcome = useSettings((state) => state.dismissWelcome);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const addStarter = async (habit: NewHabit) => {
    try {
      await repository.createHabit(habit);
      dismissWelcome();
    } catch (caught) {
      console.error("Couldn't add starter habit", caught);
      setError("Couldn’t add that habit. Please try again.");
    }
  };

  return (
    <section
      aria-labelledby="welcome-heading"
      className="flex flex-col gap-5 rounded-3xl bg-white p-5 shadow-sm dark:bg-stone-900"
    >
      <div>
        <h2 id="welcome-heading" className="text-xl font-semibold">
          Welcome
        </h2>
        <p className="text-stone-500 dark:text-stone-400">
          A calm habit tracker that forgives bad days. Everything stays on this device.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {PRINCIPLES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3">
            <Icon
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-400"
            />
            <p>
              <span className="font-medium">{title}.</span>{" "}
              <span className="text-stone-600 dark:text-stone-300">{text}</span>
            </p>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Start with one of these</h3>
        <ul className="grid grid-cols-2 gap-2">
          {STARTER_HABITS.map((habit) => (
            <li key={habit.name}>
              <button
                type="button"
                onClick={() => void addStarter(habit)}
                className={clsx(
                  "flex min-h-14 w-full items-center gap-2 rounded-2xl p-3 text-left hover:opacity-90 active:opacity-80",
                  habitColor(habit.color).soft,
                )}
              >
                <span aria-hidden="true" className="text-xl">
                  {habit.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{habit.name}</span>
                  <span className="block truncate text-xs text-stone-600 dark:text-stone-300">
                    {describeSchedule(habit.schedule)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">
            {error}
          </p>
        )}
      </div>

      <Button
        icon={Plus}
        onClick={() => {
          dismissWelcome();
          void navigate(`/habits?${NEW_HABIT_PARAM}`);
        }}
      >
        Create my own habit
      </Button>
    </section>
  );
}
