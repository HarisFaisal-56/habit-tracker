import { useId, useState, type SubmitEvent } from "react";
import { useToday } from "../../app/useToday";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { HabitIcon } from "../../components/HabitIcon";
import { IdentityStatement } from "../../components/IdentityStatement";
import { Screen } from "../../components/Screen";
import { SegmentedControl } from "../../components/SegmentedControl";
import { useRepository } from "../../data/RepositoryContext";
import { useCompletions, useHabits, useWeeklyReviews } from "../../data/useData";
import { addDays, startOfWeek, type DateKey } from "../../domain/dates";
import type { WeeklyReview } from "../../domain/habit";
import { AddHabitLink } from "../habits/AddHabitLink";
import { WeekProgressBar } from "../stats/WeekProgressBar";
import {
  formatWeekRange,
  INTENTION_MAX_LENGTH,
  isReviewDay,
  isReviewEmpty,
  REVIEW_TEXT_MAX_LENGTH,
  summarizeWeek,
  trimReview,
  type ReviewFields,
} from "./reviewData";

type WeekChoice = "last" | "this";

const WEEK_OPTIONS: { value: WeekChoice; label: string }[] = [
  { value: "last", label: "Last week" },
  { value: "this", label: "This week" },
];

export function ReviewScreen() {
  const today = useToday();
  const habits = useHabits();
  const completions = useCompletions();
  const reviews = useWeeklyReviews();
  const [choice, setChoice] = useState<WeekChoice>("this");

  if (!habits || !completions || !reviews) return <Screen title="Weekly review" />;

  if (habits.length === 0 && reviews.length === 0) {
    return (
      <Screen title="Weekly review">
        <EmptyState action={<AddHabitLink />}>
          Each Sunday, look back on your week: what went well, what got in the way, and one thing to
          focus on next.
        </EmptyState>
      </Screen>
    );
  }

  const thisWeek = startOfWeek(today);
  const weekStart = choice === "this" ? thisWeek : addDays(thisWeek, -7);
  const weekLabel = choice === "this" ? "This week" : "Last week";
  const review = reviews.find((r) => r.weekStart === weekStart);
  const intentionForWeek = reviews.find((r) => r.weekStart === addDays(weekStart, -7))?.intention;
  const summary = summarizeWeek(habits, completions, weekStart, today);
  const pastReviews = reviews.filter((r) => r.weekStart !== weekStart);

  return (
    <Screen title="Weekly review" subtitle={formatWeekRange(weekStart)}>
      <SegmentedControl label="Week" options={WEEK_OPTIONS} value={choice} onChange={setChoice} />

      {choice === "this" && isReviewDay(today) && !review && (
        <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          It’s Sunday, a good moment to look back on your week. It only takes two minutes.
        </p>
      )}

      {intentionForWeek && (
        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Your intention for {choice === "this" ? "this" : "that"} week
          </p>
          <p className="font-medium">“{intentionForWeek}”</p>
        </div>
      )}

      <section aria-labelledby="week-summary-heading" className="flex flex-col gap-2">
        <h2 id="week-summary-heading" className="text-lg font-semibold">
          How the week went
        </h2>
        {summary.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">No habits that week.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {summary.map(({ habit, progress }) => (
              <li
                key={habit.id}
                className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm dark:bg-stone-900"
              >
                <div className="flex items-center gap-3">
                  <HabitIcon emoji={habit.emoji} color={habit.color} />
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{habit.name}</h3>
                    <IdentityStatement identity={habit.identity} />
                  </div>
                </div>
                <WeekProgressBar habit={habit} week={progress} label={weekLabel} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Keyed by week so switching weeks starts from that week's saved review. */}
      <ReviewForm key={weekStart} weekStart={weekStart} review={review} />

      {pastReviews.length > 0 && <PastReviews reviews={pastReviews} />}
    </Screen>
  );
}

const fieldClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-900 placeholder:text-stone-400 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function ReviewForm({ weekStart, review }: { weekStart: DateKey; review?: WeeklyReview }) {
  const repository = useRepository();
  const [fields, setFields] = useState<ReviewFields>({
    wins: review?.wins ?? "",
    struggles: review?.struggles ?? "",
    intention: review?.intention ?? "",
  });
  const [status, setStatus] = useState<SaveStatus>("idle");
  const headingId = useId();
  const winsId = useId();
  const strugglesId = useId();
  const intentionId = useId();

  const trimmed = trimReview(fields);
  const unchanged =
    review !== undefined &&
    trimmed.wins === review.wins &&
    trimmed.struggles === review.struggles &&
    trimmed.intention === review.intention;
  const canSave = !isReviewEmpty(fields) && !unchanged && status !== "saving";

  const update = (changes: Partial<ReviewFields>) => {
    setFields((current) => ({ ...current, ...changes }));
    setStatus("idle");
  };

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!canSave) return;
    setStatus("saving");
    try {
      await repository.saveWeeklyReview({ weekStart, ...trimmed });
      // Show exactly what was saved, so later edits start from the trimmed text.
      setFields(trimmed);
      setStatus("saved");
    } catch (error) {
      console.error("Couldn't save review", error);
      setStatus("error");
    }
  }

  return (
    <form
      aria-labelledby={headingId}
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="flex flex-col gap-4 rounded-3xl bg-white p-4 shadow-sm dark:bg-stone-900"
    >
      <h2 id={headingId} className="text-lg font-semibold">
        Your reflection
      </h2>
      <div>
        <label htmlFor={winsId} className="mb-1 block text-sm font-medium">
          Wins
        </label>
        <textarea
          id={winsId}
          value={fields.wins}
          onChange={(event) => {
            update({ wins: event.target.value });
          }}
          rows={3}
          maxLength={REVIEW_TEXT_MAX_LENGTH}
          placeholder="What went well? Small wins count."
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor={strugglesId} className="mb-1 block text-sm font-medium">
          Struggles
        </label>
        <textarea
          id={strugglesId}
          value={fields.struggles}
          onChange={(event) => {
            update({ struggles: event.target.value });
          }}
          rows={3}
          maxLength={REVIEW_TEXT_MAX_LENGTH}
          placeholder="What got in the way? No judgement."
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor={intentionId} className="mb-1 block text-sm font-medium">
          One intention for next week
        </label>
        <input
          id={intentionId}
          value={fields.intention}
          onChange={(event) => {
            update({ intention: event.target.value });
          }}
          maxLength={INTENTION_MAX_LENGTH}
          autoComplete="off"
          placeholder="e.g. Lay out my running shoes the night before"
          className={`${fieldClass} min-h-11`}
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        <p role="status" className="text-sm text-stone-500 dark:text-stone-400">
          {status === "saved" && "Saved."}
          {status === "error" && (
            <span className="text-rose-700 dark:text-rose-400">
              Couldn’t save. Please try again.
            </span>
          )}
        </p>
        <Button type="submit" disabled={!canSave}>
          {review ? "Update review" : "Save review"}
        </Button>
      </div>
    </form>
  );
}

const PAST_FIELDS: { key: keyof ReviewFields; label: string }[] = [
  { key: "wins", label: "Wins" },
  { key: "struggles", label: "Struggles" },
  { key: "intention", label: "Intention" },
];

function PastReviews({ reviews }: { reviews: readonly WeeklyReview[] }) {
  return (
    <section aria-labelledby="past-reviews-heading" className="flex flex-col gap-2">
      <h2 id="past-reviews-heading" className="text-lg font-semibold">
        Past reviews
      </h2>
      <ul className="flex flex-col gap-2">
        {reviews.map((review) => (
          <li key={review.id} className="rounded-2xl bg-white shadow-sm dark:bg-stone-900">
            <details>
              <summary className="flex min-h-11 cursor-pointer items-center rounded-2xl px-4 py-3 font-medium">
                {formatWeekRange(review.weekStart)}
              </summary>
              <dl className="flex flex-col gap-3 px-4 pb-4">
                {PAST_FIELDS.filter(({ key }) => review[key] !== "").map(({ key, label }) => (
                  <div key={key}>
                    <dt className="text-sm text-stone-500 dark:text-stone-400">{label}</dt>
                    <dd className="whitespace-pre-line">{review[key]}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
