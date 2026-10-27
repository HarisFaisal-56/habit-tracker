import clsx from "clsx";
import {
  ChevronDown,
  CircleCheck,
  Flag,
  Lock,
  Sparkles,
  Target,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { useId, useState, type ReactNode, type SubmitEvent } from "react";
import { useToday } from "../../app/useToday";
import { EmptyState } from "../../components/EmptyState";
import { habitCardStyle, habitColor, tint } from "../../components/habitColors";
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
/** Pips on an identity vote card: one per day of the week. */
const VOTE_PIPS = 7;

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
        <span>
          Week {getWeekNumber(weekStart)} ·{" "}
          {/* Short on screen, as in the design; spelled out for screen readers. */}
          <span aria-hidden="true">{formatWeekRangeShort(weekStart)}</span>
          <span className="sr-only">{formatWeekRange(weekStart)}</span>
        </span>
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
      glow="review"
    >
      {choice === "this" && isReviewDay(today) && !review && (
        <p className="card animate-rise rounded-tile p-4 text-sm [--card-edge:color-mix(in_oklab,var(--color-accent)_35%,transparent)]">
          It’s Sunday, a good moment to look back on your week. It only takes two minutes.
        </p>
      )}

      {intentionForWeek && (
        <PromiseCard
          label={choice === "this" ? "Last week you promised" : "The week before you promised"}
          intention={intentionForWeek}
        />
      )}

      {checkins.expected > 0 && <CheckinsCard checkins={checkins} today={today} />}

      <IdentityVotes summary={summary} />

      {/* Keyed by week so switching weeks starts from that week's saved review. */}
      <ReviewForm key={weekStart} weekStart={weekStart} review={review} />

      {pastReviews.length > 0 && <PastReviews reviews={pastReviews} />}
    </Screen>
  );
}

/** Last week's intention, in a card with a slowly circling lime edge. */
function PromiseCard({ label, intention }: { label: string; intention: string }) {
  return (
    <div
      className="relative animate-rise overflow-hidden rounded-card p-px shadow-[0_24px_50px_-28px_color-mix(in_oklab,var(--color-accent)_45%,transparent)]"
      style={{ animationDelay: "0.05s" }}
    >
      <span
        aria-hidden="true"
        className="conic-accent absolute -inset-[80%] animate-orbit-slow [--conic-base:8%]"
      />
      <div className="promise-surface relative overflow-hidden rounded-[calc(var(--radius-card)-1px)] px-5 pt-5 pb-5.5">
        <span
          aria-hidden="true"
          className="absolute -top-7.5 right-3 font-serif text-9xl leading-none text-accent/8"
        >
          ”
        </span>
        <p className="relative flex items-center gap-2 font-mono text-mini tracking-widest text-accent-text uppercase">
          <Flag aria-hidden="true" className="size-3" strokeWidth={2.2} />
          {label}
        </p>
        <p className="relative mt-3 text-2xl leading-tight font-normal tracking-tight text-pretty">
          “{intention}”
        </p>
      </div>
    </div>
  );
}

/** Bar height for a day: a stub when nothing was done, the full height when everything was. */
function barHeight(done: number, expected: number): string {
  if (expected === 0) return "26%";
  return `${String(30 + 70 * Math.min(1, done / expected))}%`;
}

function barStyle(done: number, expected: number): string {
  if (done >= expected) {
    return "bg-linear-to-b from-accent-hi via-accent via-40% to-accent-lo shadow-[0_0_14px_color-mix(in_oklab,var(--color-accent)_45%,transparent)]";
  }
  if (done === 0) return "bg-ink/10";
  return done / expected >= 0.5
    ? "bg-linear-to-b from-accent-mark/80 to-accent-mark/35"
    : "bg-linear-to-b from-accent-mark/60 to-accent-mark/35";
}

function CheckinsCard({ checkins, today }: { checkins: WeekCheckins; today: DateKey }) {
  const kept = Math.round((checkins.done / checkins.expected) * 100);
  return (
    <section
      aria-label="Check-ins"
      className="card flex animate-rise items-center gap-4.5 rounded-card px-4.5 py-4"
      style={{ animationDelay: "0.1s" }}
    >
      <div className="shrink-0">
        <p className="text-4xl leading-none font-extralight tracking-tight tabular-nums">
          {checkins.done}
          <span className="text-xl tracking-normal text-faint">/{checkins.expected}</span>
        </p>
        <p className="mt-2 font-mono text-caption tracking-widest text-muted uppercase">
          Check-ins
        </p>
        <p className="mt-1.5 inline-flex rounded-md bg-accent/12 px-1.75 py-0.75 font-mono text-2xs tracking-[0.06em] text-accent-text">
          {kept}% KEPT
        </p>
      </div>
      <div aria-hidden="true" className="flex flex-1 items-end justify-between gap-1">
        {checkins.days.map(({ date, done, expected }, index) => {
          const future = date > today;
          const counted = !future && expected > 0;
          return (
            <div key={date} className="flex flex-col items-center gap-1.75">
              <span className="h-2.5 font-mono text-nano text-faint">
                {counted ? `${String(done)}/${String(expected)}` : ""}
              </span>
              <div className="flex h-13 items-end">
                <div
                  className={clsx(
                    "w-3.75 rounded-lg motion-safe:transition-[height] motion-safe:duration-500 motion-safe:ease-spring",
                    future || expected === 0 ? "bg-hatch" : barStyle(done, expected),
                  )}
                  style={{ height: future ? "26%" : barHeight(done, expected) }}
                />
              </div>
              <span
                className={clsx(
                  "font-mono text-2xs",
                  date === today ? "font-bold text-ink" : future ? "text-dim" : "text-muted",
                )}
              >
                {DAY_LETTERS[index]}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Each identity statement, with a "vote" for every day it was acted on this week. */
function IdentityVotes({ summary }: { summary: readonly WeekHabitSummary[] }) {
  const withIdentity = summary.filter(({ habit }) => habit.identity);
  if (withIdentity.length === 0) return null;
  return (
    <section
      aria-labelledby="votes-heading"
      className="flex animate-rise flex-col gap-2.5"
      style={{ animationDelay: "0.15s" }}
    >
      <h2 id="votes-heading" className="section-label px-1">
        Identity votes
      </h2>
      <ul className="grid grid-cols-2 gap-2.5">
        {withIdentity.map(({ habit, progress }) => {
          const { value } = habitColor(habit.color);
          return (
            <li
              key={habit.id}
              className="card flex flex-col justify-between gap-3.5 rounded-3xl p-3.5"
              style={habitCardStyle(habit.color, 0.12, 0.3)}
            >
              <p className="text-sm leading-snug text-pretty">{habit.identity}</p>
              <div className="flex items-end justify-between gap-1.5">
                <span className="flex items-baseline gap-1.25">
                  <span
                    className="text-2xl leading-none font-extralight tabular-nums"
                    style={{ color: value, textShadow: `0 0 14px ${tint(value, 0.5)}` }}
                  >
                    {progress.done}
                  </span>
                  <span className="font-mono text-2xs tracking-[0.06em] text-muted uppercase">
                    {progress.done === 1 ? " vote" : " votes"}
                  </span>
                </span>
                <span aria-hidden="true" className="flex items-end gap-0.75 pb-0.5">
                  {Array.from({ length: VOTE_PIPS }, (_, index) => {
                    const lit = index < progress.done;
                    return (
                      <span
                        key={index}
                        className={clsx("w-1.25 rounded-xs", lit ? "h-3.5" : "h-1.5 bg-ink/10")}
                        style={
                          lit
                            ? { background: value, boxShadow: `0 0 6px ${tint(value, 0.6)}` }
                            : undefined
                        }
                      />
                    );
                  })}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const fieldClass =
  "w-full resize-none bg-transparent text-base leading-snug text-ink/90 focus:outline-none";

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
  const saved = status === "saved";
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

  let ctaLabel = review ? `Update week ${String(nextWeek)}` : `Lock in week ${String(nextWeek)}`;
  if (saved) ctaLabel = "Locked in";
  const CtaIcon = saved ? CircleCheck : Lock;

  return (
    <form
      aria-label="Your reflection"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="flex animate-rise flex-col gap-3"
      style={{ animationDelay: "0.2s" }}
    >
      <FieldCard
        htmlFor={winsId}
        label="Wins"
        icon={Sparkles}
        count={fields.wins.length}
        max={REVIEW_TEXT_MAX_LENGTH}
      >
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
      <FieldCard
        htmlFor={strugglesId}
        label="Friction"
        icon={Wind}
        count={fields.struggles.length}
        max={REVIEW_TEXT_MAX_LENGTH}
      >
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
      <FieldCard
        htmlFor={intentionId}
        label="Next week, I will"
        icon={Target}
        count={fields.intention.length}
        max={INTENTION_MAX_LENGTH}
      >
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

      <p
        role="status"
        className="mt-0.5 flex min-h-5 items-center justify-center text-sm text-accent-text"
      >
        {saved && `Week ${String(nextWeek)} is locked in. See you Sunday.`}
        {status === "error" && (
          <span className="text-danger">Couldn’t save. Please try again.</span>
        )}
      </p>
      {/* Once there is something to save, pinned above the tab bar while the form scrolls. */}
      <button
        type="submit"
        disabled={!canSave}
        className={clsx(
          "relative z-2 flex min-h-14 items-center justify-center overflow-hidden rounded-full text-lg font-semibold tracking-tight motion-safe:transition-all motion-safe:duration-300",
          canSave &&
            "lime-gloss lime-glow-lg sticky bottom-tab-bar text-accent-ink active:scale-98",
          !canSave &&
            saved &&
            "bg-accent/8 text-accent-text shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-accent)_30%,transparent)]",
          !canSave &&
            !saved &&
            "bg-raised/70 text-muted shadow-[inset_0_0_0_1px_var(--color-line)]",
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            "shine absolute inset-0 animate-shine motion-safe:transition-opacity",
            canSave ? "opacity-100" : "opacity-0",
          )}
        />
        <span className="relative flex items-center gap-2.25">
          <CtaIcon aria-hidden="true" className="size-4.5" strokeWidth={2.2} />
          {ctaLabel}
        </span>
      </button>
    </form>
  );
}

type FieldCardProps = {
  htmlFor: string;
  label: string;
  icon: LucideIcon;
  count: number;
  max: number;
  children: ReactNode;
};

/** A reflection field as a card; it lights up lime while you type in it. */
function FieldCard({ htmlFor, label, icon: Icon, count, max, children }: FieldCardProps) {
  return (
    <div className="group card flex flex-col gap-1.75 rounded-3xl px-4 py-3.5 motion-safe:transition-shadow motion-safe:duration-250 focus-within:shadow-[0_0_0_5px_color-mix(in_oklab,var(--color-accent)_5%,transparent),0_20px_40px_-24px_color-mix(in_oklab,var(--color-accent)_40%,transparent)] focus-within:[--card-edge:color-mix(in_oklab,var(--color-accent)_60%,transparent)]">
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-1.75 font-mono text-mini tracking-widest text-soft uppercase motion-safe:transition-colors group-focus-within:text-accent-text"
        >
          <Icon aria-hidden="true" className="size-3" />
          {label}
        </label>
        <span
          aria-hidden="true"
          className="font-mono text-micro text-dim opacity-0 motion-safe:transition-opacity group-focus-within:opacity-100"
        >
          {count} / {max}
        </span>
      </div>
      {children}
    </div>
  );
}

const PAST_FIELDS: { key: keyof ReviewFields; label: string; rule: string }[] = [
  { key: "wins", label: "Wins", rule: "border-habit-teal" },
  { key: "struggles", label: "Friction", rule: "border-habit-rose" },
  { key: "intention", label: "Next week, I will", rule: "border-accent-mark" },
];

function PastReviews({ reviews }: { reviews: readonly WeeklyReview[] }) {
  return (
    <section aria-labelledby="past-reviews-heading" className="flex flex-col gap-3">
      <h2 id="past-reviews-heading" className="section-label px-1">
        Past reviews
      </h2>
      <ul className="flex flex-col gap-2.5">
        {reviews.map((review) => (
          <PastReview key={review.id} review={review} />
        ))}
      </ul>
    </section>
  );
}

function PastReview({ review }: { review: WeeklyReview }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <li className="overflow-hidden rounded-3xl border border-line bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((shown) => !shown);
        }}
        className="flex min-h-14.5 w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="rounded-lg border border-accent/18 bg-accent/8 px-2 py-1 font-mono text-caption tracking-[0.06em] text-accent-text">
          W{getWeekNumber(review.weekStart)}
        </span>
        <span className="flex-1 font-medium">{formatWeekRange(review.weekStart)}</span>
        <ChevronDown
          aria-hidden="true"
          className={clsx(
            "size-4 text-muted motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-spring",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <dl id={panelId} className="flex animate-rise-fast flex-col gap-3 px-4 pt-0.5 pb-4">
          {PAST_FIELDS.filter(({ key }) => review[key] !== "").map(({ key, label, rule }) => (
            <div key={key} className={clsx("border-l-2 pl-3", rule)}>
              <dt className="font-mono text-2xs tracking-widest text-muted uppercase">{label}</dt>
              <dd className="mt-1 leading-snug whitespace-pre-line text-ink/90">{review[key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}
