import clsx from "clsx";
import { Ellipsis, Quote } from "lucide-react";
import { IconButton } from "../../components/Button";
import { CompletionMark } from "../../components/CompletionMark";
import { habitColor, tint, type StyleWithVars } from "../../components/habitColors";
import { HabitIcon } from "../../components/HabitIcon";
import { useLongPress } from "../../components/useLongPress";
import { isDone } from "../../domain/completions";
import type { CompletionKind } from "../../domain/habit";
import { summarizeItem, type ItemSummary, type TodayItem } from "./todayList";

const STATUS_TEXT: Record<CompletionKind | "none", string> = {
  full: "Done",
  minimum: "Minimum version done",
  skipped: "Skipped",
  none: "Not done yet",
};

const TONE_CLASS: Record<ItemSummary["tone"], string> = {
  normal: "text-muted",
  warning: "text-habit-amber",
  success: "text-accent-text",
};

/** How strongly a tile is washed and edged in its habit's colour once logged. */
const WASH: Record<CompletionKind | "none", { wash: number; edge: number }> = {
  full: { wash: 0.15, edge: 0.55 },
  minimum: { wash: 0.08, edge: 0.32 },
  skipped: { wash: 0, edge: 0 },
  none: { wash: 0, edge: 0 },
};

type HabitTileProps = {
  item: TodayItem;
  /** Seconds before the tile rises into place, to stagger the list. */
  delay?: number;
  /** Tap: mark done, or undo if already done. */
  onToggle: () => void;
  /** Long press or the ⋯ button: minimum, skip and notes. */
  onOpenOptions: () => void;
};

export function HabitTile({ item, delay = 0, onToggle, onOpenOptions }: HabitTileProps) {
  const { habit, completion, week } = item;
  const longPress = useLongPress(onOpenOptions);
  const summary = summarizeItem(item);
  const { value } = habitColor(habit.color);
  const kind = completion?.kind;
  const { wash, edge } = WASH[kind ?? "none"];
  const minimum =
    kind === "minimum" && habit.minimumVersion ? ` · Min ${habit.minimumVersion}` : "";

  const style: StyleWithVars = {
    "--card-wash": `linear-gradient(100deg, ${tint(value, wash)} 0%, transparent 62%)`,
    ...(edge > 0 && { "--card-edge": tint(value, edge) }),
    boxShadow:
      kind === "full"
        ? `0 18px 36px -24px ${tint(value, 0.7)}, inset 0 1px 0 rgb(255 255 255 / 0.04)`
        : "inset 0 1px 0 rgb(255 255 255 / 0.03)",
    animationDelay: `${String(delay)}s`,
  };

  return (
    <li
      className="card relative flex animate-rise items-center rounded-tile motion-safe:transition-shadow motion-safe:duration-400"
      style={style}
    >
      <button
        type="button"
        aria-pressed={isDone(completion)}
        onClick={onToggle}
        {...longPress}
        className="flex min-h-15.5 min-w-0 flex-1 touch-manipulation items-center gap-3.5 rounded-tile px-3.5 py-2.75 text-left select-none touch-callout-none active:scale-[0.975] motion-safe:transition-transform motion-safe:duration-180 motion-safe:ease-spring"
      >
        <HabitIcon emoji={habit.emoji} color={habit.color} size="sm" dot />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base leading-tight font-medium tracking-tight">
            {habit.name}
          </span>
          <span className="mt-1.25 flex min-w-0 items-center gap-2">
            <span className={clsx("label truncate", TONE_CLASS[summary.tone])}>
              {summary.run && (
                <>
                  <span className={clsx(summary.tone === "normal" && "text-soft")}>
                    {summary.run}
                  </span>
                  {" · "}
                </>
              )}
              {summary.details}
              {minimum}
            </span>
            {week && week.target > 0 && (
              <span aria-hidden="true" className="flex shrink-0 gap-0.75">
                {Array.from({ length: week.target }, (_, index) => {
                  const lit = index < week.done;
                  return (
                    <span
                      key={index}
                      className={clsx(
                        "h-0.75 w-3 rounded-xs motion-safe:transition-colors motion-safe:duration-300",
                        !lit && "bg-ink/10",
                      )}
                      style={
                        lit
                          ? { background: value, boxShadow: `0 0 6px ${tint(value, 0.6)}` }
                          : undefined
                      }
                    />
                  );
                })}
              </span>
            )}
          </span>
          {completion?.note && (
            <span className="mt-1.5 flex items-center gap-1.5 overflow-hidden text-note whitespace-nowrap text-muted italic">
              <Quote aria-hidden="true" className="size-3 shrink-0" />
              <span className="truncate">{completion.note}</span>
            </span>
          )}
          <span className="sr-only">, {STATUS_TEXT[kind ?? "none"]}</span>
        </span>
        <CompletionMark kind={kind} color={habit.color} />
      </button>
      {/* Touch uses a long press and mouse a right-click; this is for keyboards and screen readers. */}
      <IconButton
        label={`More options for ${habit.name}`}
        icon={Ellipsis}
        onClick={onOpenOptions}
        className="sr-only focus-visible:not-sr-only focus-visible:mr-1.5 focus-visible:size-11"
      />
    </li>
  );
}
