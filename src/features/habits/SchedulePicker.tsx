import clsx from "clsx";
import { Minus, Plus } from "lucide-react";
import { useId } from "react";
import { IconButton } from "../../components/Button";
import type { Weekday } from "../../domain/dates";
import type { Schedule } from "../../domain/habit";
import { WEEKDAY_NAMES, WEEKDAYS_MONDAY_FIRST } from "./describeSchedule";
import {
  MAX_TIMES_PER_WEEK,
  MIN_TIMES_PER_WEEK,
  type HabitFormErrors,
  type HabitFormValues,
} from "./habitFormValues";

const SCHEDULE_TYPES: { type: Schedule["type"]; label: string }[] = [
  { type: "daily", label: "Every day" },
  { type: "days", label: "Some days" },
  { type: "weekly", label: "Weekly goal" },
];

type SchedulePickerProps = {
  values: HabitFormValues;
  errors: HabitFormErrors;
  onChange: (changes: Partial<HabitFormValues>) => void;
};

const errorText = "text-sm text-rose-700 dark:text-rose-400";

export function SchedulePicker({ values, errors, onChange }: SchedulePickerProps) {
  const name = useId();
  const daysErrorId = useId();
  const timesErrorId = useId();

  const toggleDay = (day: Weekday) => {
    onChange({
      days: values.days.includes(day)
        ? values.days.filter((d) => d !== day)
        : [...values.days, day],
    });
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-sm font-medium">How often</legend>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-800">
        {SCHEDULE_TYPES.map(({ type, label }) => (
          <label key={type}>
            <input
              type="radio"
              name={name}
              value={type}
              checked={values.scheduleType === type}
              onChange={() => {
                onChange({ scheduleType: type });
              }}
              className="peer sr-only"
            />
            <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-1 text-center text-sm font-medium text-stone-600 peer-checked:bg-white peer-checked:text-stone-900 peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-emerald-600 dark:text-stone-300 dark:peer-checked:bg-stone-950 dark:peer-checked:text-stone-100">
              {label}
            </span>
          </label>
        ))}
      </div>

      {values.scheduleType === "days" && (
        <fieldset aria-describedby={errors.days ? daysErrorId : undefined}>
          <legend className="sr-only">Days</legend>
          <div className="flex justify-between gap-1">
            {WEEKDAYS_MONDAY_FIRST.map((day) => {
              const checked = values.days.includes(day);
              return (
                <label key={day}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      toggleDay(day);
                    }}
                    aria-label={WEEKDAY_NAMES[day]}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "flex size-11 cursor-pointer items-center justify-center rounded-full text-sm font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-600",
                      checked
                        ? "bg-emerald-700 text-white dark:bg-emerald-600"
                        : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
                    )}
                  >
                    {WEEKDAY_NAMES[day].charAt(0)}
                  </span>
                </label>
              );
            })}
          </div>
          {errors.days && (
            <p id={daysErrorId} className={clsx("mt-2", errorText)}>
              {errors.days}
            </p>
          )}
        </fieldset>
      )}

      {values.scheduleType === "weekly" && (
        <div>
          <div className="flex items-center gap-3">
            <IconButton
              label="Fewer times"
              icon={Minus}
              disabled={values.timesPerWeek <= MIN_TIMES_PER_WEEK}
              onClick={() => {
                onChange({ timesPerWeek: values.timesPerWeek - 1 });
              }}
              className="bg-stone-100 dark:bg-stone-800"
            />
            <output
              aria-live="polite"
              aria-describedby={errors.timesPerWeek ? timesErrorId : undefined}
              className="min-w-28 text-center font-medium"
            >
              {values.timesPerWeek === 1
                ? "Once a week"
                : `${String(values.timesPerWeek)} times a week`}
            </output>
            <IconButton
              label="More times"
              icon={Plus}
              disabled={values.timesPerWeek >= MAX_TIMES_PER_WEEK}
              onClick={() => {
                onChange({ timesPerWeek: values.timesPerWeek + 1 });
              }}
              className="bg-stone-100 dark:bg-stone-800"
            />
          </div>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            Any days you like. Your streak counts weeks where you hit the goal.
          </p>
          {errors.timesPerWeek && (
            <p id={timesErrorId} className={clsx("mt-2", errorText)}>
              {errors.timesPerWeek}
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}
