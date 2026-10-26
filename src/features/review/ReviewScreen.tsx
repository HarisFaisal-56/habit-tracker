import clsx from "clsx";
import { useId, useState, type ReactNode, type SubmitEvent } from "react";
import { useToday } from "../../app/useToday";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { habitColor } from "../../components/habitColors";
import { PillSelect } from "../../components/PillSelect";
import { Screen } from "../../components/Screen";
import { useRepository } from "../../data/RepositoryContext";
import { useCompletions, useHabits, useWeeklyReviews } from "../../data/useData";
import { addDays, startOfWeek, type DateKey } from "../../domain/dates";
import type { WeeklyReview } from "../../domain/habit";
import { AddHabitLink } from "../habits/AddHabitLink";
import {
  formatWeekRange,
  formatWeekRangeShort,
  getWeekCheckins,
  getWeekNumber,
  INTENTION_MAX_LENGTH,
  isReviewDay,
  isReviewEmpty,
  REVIEW_TEXT_MAX_LENGTH,
  summarizeWeek,
  trimReview,
  type ReviewFields,
  type WeekCheckins,
  type WeekHabitSummary,
} from "./reviewData";

type WeekChoice = "last" | "this";

function isWeekChoice(value: string): value is WeekChoice {
  return value === "last" || value === "this";
}

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

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
  const review = reviews.find((r) => r.weekStart === weekStart);
  const intentionForWeek = reviews.find((r) => r.weekStart === addDays(weekStart, -7))?.intention;
  const summary = summarizeWeek(habits, completions, weekStart, today);
  const checkins = getWeekCheckins(habits, completions, weekStart, today);
  const pastReviews = reviews.filter((r) => r.weekStart !== weekStart);

  return (
    <Screen
      title="Weekly review"
      subtitle={
        <>
          Week {getWeekNumber(weekStart)} ·{" "}
          {/* Short on screen, as in the designs; spelled out for screen readers. */}
          <span aria-hidden="true">{formatWeekRangeShort(weekStart)}</span>
          <span className="sr-only">{formatWeekRange(weekStart)}</span>
        </>
      }
      actions={
        <PillSelect
          label="Week"
          value={choice}
          onChange={(value) => {
            if (isWeekChoice(value)) setChoice(value);
          }}
        >
          <option value="this">This week</option>
          <option value="last">Last week</option>
        </PillSelect>
      }
      glow="rose"
    >
      {choice === "this" && isReviewDay(today) && !review && (
        <p className="rounded-3xl border border-accent/30 bg-accent/10 p-4 text-sm">
          It’s Sunday, a good moment to look back on your week. It only takes two minutes.
        </p>
      )}

      {intentionForWeek && (
        <div className="rounded-3xl border border-accent/30 bg-linear-to-br from-accent/14 to-accent/2 p-5">
          <p className="section-label text-accent-text">
            {choice === "this" ? "Last week you promised" : "The week before you promised"}
          </p>
          <p className="mt-2.5 text-lg leading-snug">“{intentionForWeek}”</p>
        </div>
      )}

      {checkins.expected > 0 && <CheckinsCard checkins={checkins} today={today} />}

      <IdentityVotes summary={summary} />

      {/* Keyed by week so switching weeks starts from that week's saved review. */}
      <ReviewForm key={weekStart} weekStart={weekStart} review={review} />

      {pastReviews.length > 0 && <PastReviews reviews={pastReviews} />}
    </Screen>
  );
}

/** Bar height for a day: a stub when nothing was done, the full height when everything was. */
function barHeight(done: number, expected: number): string {
  if (expected === 0) return "40%";
  return `${String(40 + 60 * Math.min(1, done / expected))}%`;
}

function barTone(done: number, expected: number): string {
  if (expected === 0) return "bg-ink/8";
  if (done >= expected) return "bg-accent";
  if (done === 0) return "bg-ink/10";
  return done / expected >= 0.5 ? "bg-accent-mark/70" : "bg-accent-mark/55";
}

function CheckinsCard({ checkins, today }: { checkins: WeekCheckins; today: DateKey }) {
  return (
    <section
      aria-label="Check-ins"
      className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-4"
    >
      <div className="shrink-0">
        <p className="text-4xl font-light tabular-nums">
          {checkins.done}
          <span className="text-xl text-muted">/{checkins.expected}</span>
        </p>
        <p className="section-label mt-2">Check-ins</p>
      </div>
      <div aria-hidden="true" className="flex flex-1 items-end justify-between gap-1">
        {checkins.days.map(({ date, done, expected }, index) => (
          <div key={date} className="flex flex-col items-center gap-2">
            <div className="flex h-9 items-end">
              <div
                className={clsx(
                  "w-4 rounded-lg",
                  date > today ? "bg-ink/8" : barTone(done, expected),
                )}
                style={{ height: barHeight(done, expected) }}
              />
            </div>
            <span className="label text-2xs">{DAY_LETTERS[index]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Each identity statement, with a "vote" for every day it was acted on this week. */
function IdentityVotes({ summary }: { summary: readonly WeekHabitSummary[] }) {
  const withIdentity = summary.filter(({ habit }) => habit.identity);
  if (withIdentity.length === 0) return null;
  return (
    <section aria-label="Identity votes">
      <ul className="grid grid-cols-3 gap-2.5">
        {withIdentity.map(({ habit, progress }) => (
          <li
            key={habit.id}
            className="flex flex-col justify-between gap-2 rounded-3xl border border-line bg-surface p-3.5"
          >
            <p className="text-sm leading-snug">{habit.identity}</p>
            <p className={clsx("font-mono text-eyebrow", habitColor(habit.color).accent)}>
              {progress.done} {progress.done === 1 ? "vote" : "votes"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

const fieldClass =
  "w-full resize-none bg-transparent text-base leading-snug text-soft placeholder:text-muted focus:outline-none";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function ReviewForm({ weekStart, review }: { weekStart: DateKey; review?: WeeklyReview }) {
  const repository = useRepository();
  const [fields, setFields] = useState<ReviewFields>({
    wins: review?.wins ?? "",
    struggles: review?.struggles ?? "",
    intention: review?.intention ?? "",
  });
  const [status, setStatus] = useState<SaveStatus>("idle");
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
  const nextWeek = getWeekNumber(addDays(weekStart, 7));

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
      aria-label="Your reflection"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="flex flex-col gap-3"
    >
      <FieldCard htmlFor={winsId} label="Wins">
        <textarea
          id={winsId}
          value={fields.wins}
          onChange={(event) => {
            update({ wins: event.target.value });
          }}
          rows={2}
          maxLength={REVIEW_TEXT_MAX_LENGTH}
          placeholder="What went well? Small wins count."
          className={fieldClass}
        />
      </FieldCard>
      <FieldCard htmlFor={strugglesId} label="Friction">
        <textarea
          id={strugglesId}
          value={fields.struggles}
          onChange={(event) => {
            update({ struggles: event.target.value });
          }}
          rows={2}
          maxLength={REVIEW_TEXT_MAX_LENGTH}
          placeholder="What got in the way? No judgement."
          className={fieldClass}
        />
      </FieldCard>
      <FieldCard htmlFor={intentionId} label="Next week, I will">
        <input
          id={intentionId}
          value={fields.intention}
          onChange={(event) => {
            update({ intention: event.target.value });
          }}
          maxLength={INTENTION_MAX_LENGTH}
          autoComplete="off"
          placeholder="e.g. Lay out my running shoes the night before"
          className={clsx(fieldClass, "min-h-6")}
        />
      </FieldCard>

      <p role="status" className="min-h-5 text-center text-sm text-muted">
        {status === "saved" && "Saved."}
        {status === "error" && (
          <span className="text-danger">Couldn’t save. Please try again.</span>
        )}
      </p>
      {/* Once there is something to save, pinned to the bottom while the form scrolls. */}
      <Button
        type="submit"
        variant="cta"
        disabled={!canSave}
        className={clsx(canSave && "sticky bottom-3")}
      >
        {review ? `Update week ${String(nextWeek)}` : `Lock in week ${String(nextWeek)}`}
      </Button>
    </form>
  );
}

function FieldCard({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-3xl border border-line bg-surface px-4 py-3.5 focus-within:border-ink/30">
      <label htmlFor={htmlFor} className="section-label text-soft">
        {label}
      </label>
      {children}
    </div>
  );
}

const PAST_FIELDS: { key: keyof ReviewFields; label: string }[] = [
  { key: "wins", label: "Wins" },
  { key: "struggles", label: "Friction" },
  { key: "intention", label: "Next week, I will" },
];

function PastReviews({ reviews }: { reviews: readonly WeeklyReview[] }) {
  return (
    <section aria-labelledby="past-reviews-heading" className="flex flex-col gap-3">
      <h2 id="past-reviews-heading" className="section-label px-1">
        Past reviews
      </h2>
      <ul className="flex flex-col gap-3">
        {reviews.map((review) => (
          <li key={review.id} className="rounded-3xl border border-line bg-surface">
            <details>
              <summary className="flex min-h-11 cursor-pointer items-center rounded-3xl px-4 py-3 font-medium">
                {formatWeekRange(review.weekStart)}
              </summary>
              <dl className="flex flex-col gap-3 px-4 pb-4">
                {PAST_FIELDS.filter(({ key }) => review[key] !== "").map(({ key, label }) => (
                  <div key={key}>
                    <dt className="label">{label}</dt>
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
