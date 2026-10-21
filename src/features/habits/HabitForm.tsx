import { useId, useRef, useState, type SubmitEvent } from "react";
import { Button } from "../../components/Button";
import { ColorPicker } from "../../components/ColorPicker";
import { EmojiPicker } from "../../components/EmojiPicker";
import { useRepository } from "../../data/RepositoryContext";
import type { Habit } from "../../domain/habit";
import {
  emptyHabitForm,
  formToHabit,
  habitToForm,
  hasErrors,
  IDENTITY_MAX_LENGTH,
  MINIMUM_MAX_LENGTH,
  validateHabitForm,
  type HabitFormValues,
} from "./habitFormValues";
import { SchedulePicker } from "./SchedulePicker";

const inputClass =
  "min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900 placeholder:text-stone-400 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100";
const errorClass = "mt-1 text-sm text-rose-700 dark:text-rose-400";
const hintClass = "mt-1 text-sm text-stone-500 dark:text-stone-400";

type HabitFormProps = {
  /** The habit to edit; omit to create a new one. */
  habit?: Habit;
  onDone: () => void;
};

export function HabitForm({ habit, onDone }: HabitFormProps) {
  const repository = useRepository();
  const [values, setValues] = useState<HabitFormValues>(() =>
    habit ? habitToForm(habit) : emptyHabitForm(),
  );
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const nameId = useId();
  const nameErrorId = useId();
  const minimumId = useId();
  const minimumHintId = useId();
  const identityId = useId();
  const identityHintId = useId();

  const errors = validateHabitForm(values);
  // Only nag after the first save attempt.
  const shownErrors = submitted ? errors : {};

  const update = (changes: Partial<HabitFormValues>) => {
    setValues((current) => ({ ...current, ...changes }));
  };

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (hasErrors(errors)) {
      if (errors.name) nameRef.current?.focus();
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const input = formToHabit(values);
      if (habit) {
        await repository.updateHabit(habit.id, input);
      } else {
        await repository.createHabit(input);
      }
      onDone();
    } catch (error) {
      console.error("Couldn't save habit", error);
      setSaveError("Couldn't save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="flex flex-col gap-5"
    >
      <div>
        <label htmlFor={nameId} className="mb-1 block text-sm font-medium">
          Name
        </label>
        <input
          ref={nameRef}
          id={nameId}
          value={values.name}
          onChange={(event) => {
            update({ name: event.target.value });
          }}
          placeholder="e.g. Read"
          autoComplete="off"
          enterKeyHint="done"
          aria-invalid={shownErrors.name ? true : undefined}
          aria-describedby={shownErrors.name ? nameErrorId : undefined}
          className={inputClass}
        />
        {shownErrors.name && (
          <p id={nameErrorId} className={errorClass}>
            {shownErrors.name}
          </p>
        )}
      </div>

      <EmojiPicker
        value={values.emoji}
        onChange={(emoji) => {
          update({ emoji });
        }}
      />
      <ColorPicker
        value={values.color}
        onChange={(color) => {
          update({ color });
        }}
      />
      <SchedulePicker values={values} errors={shownErrors} onChange={update} />

      <div>
        <label htmlFor={minimumId} className="mb-1 block text-sm font-medium">
          Minimum version <span className="font-normal text-stone-500">(optional)</span>
        </label>
        <input
          id={minimumId}
          value={values.minimumVersion}
          onChange={(event) => {
            update({ minimumVersion: event.target.value });
          }}
          placeholder="e.g. Read one page"
          maxLength={MINIMUM_MAX_LENGTH}
          autoComplete="off"
          aria-describedby={minimumHintId}
          className={inputClass}
        />
        <p id={minimumHintId} className={hintClass}>
          A tiny version for hard days. It still counts towards your streak.
        </p>
      </div>

      <div>
        <label htmlFor={identityId} className="mb-1 block text-sm font-medium">
          Who you’re becoming <span className="font-normal text-stone-500">(optional)</span>
        </label>
        <input
          id={identityId}
          value={values.identity}
          onChange={(event) => {
            update({ identity: event.target.value });
          }}
          placeholder="e.g. I am someone who reads"
          maxLength={IDENTITY_MAX_LENGTH}
          autoComplete="off"
          aria-describedby={identityHintId}
          className={inputClass}
        />
        <p id={identityHintId} className={hintClass}>
          Each check-off is a vote for this person. It’s shown with the habit and in your weekly
          review.
        </p>
      </div>

      {saveError && (
        <p role="alert" className={errorClass}>
          {saveError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {habit ? "Save changes" : "Add habit"}
        </Button>
      </div>
    </form>
  );
}
