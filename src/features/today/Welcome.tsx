import { Feather, HeartHandshake, NotebookPen, Plus, Repeat, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../../components/Button";
import { habitStyle } from "../../components/habitColors";
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
      className="card flex animate-rise flex-col gap-5 rounded-card p-5 [--card-edge:color-mix(in_oklab,var(--color-accent)_30%,transparent)] [--card-wash:radial-gradient(90%_60%_at_100%_0%,color-mix(in_oklab,var(--color-accent)_10%,transparent),transparent_60%)]"
    >
      <div>
        <h2 id="welcome-heading" className="text-heading font-medium">
          Welcome
        </h2>
        <p className="mt-1 text-md text-soft">
          A calm habit tracker that forgives bad days. Everything stays on this device.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {PRINCIPLES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-b from-raised to-surface text-accent-text shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
              <Icon aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
            </span>
            <p className="text-md">
              <span className="font-medium">{title}.</span>{" "}
              <span className="text-muted">{text}</span>
            </p>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <h3 className="section-label">Start with one of these</h3>
        <ul className="grid grid-cols-2 gap-2">
          {STARTER_HABITS.map((habit) => (
            <li key={habit.name}>
              <button
                type="button"
                onClick={() => void addStarter(habit)}
                className="habit-tile flex min-h-14 w-full items-center gap-2 rounded-2xl p-3 text-left hover:brightness-110 active:scale-98 motion-safe:transition"
                style={habitStyle(habit.color)}
              >
                <span aria-hidden="true" className="text-xl">
                  {habit.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{habit.name}</span>
                  <span className="label block truncate">{describeSchedule(habit.schedule)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>

      <Button
        variant="cta"
        className="min-h-13 text-base"
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
