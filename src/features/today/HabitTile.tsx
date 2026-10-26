import clsx from "clsx";
import { Ellipsis } from "lucide-react";
import { IconButton } from "../../components/Button";
import { CompletionMark } from "../../components/CompletionMark";
import { habitColor } from "../../components/habitColors";
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

type HabitTileProps = {
  item: TodayItem;
  /** Tap: mark done, or undo if already done. */
  onToggle: () => void;
  /** Long press or the ⋯ button: minimum, skip and notes. */
  onOpenOptions: () => void;
};

export function HabitTile({ item, onToggle, onOpenOptions }: HabitTileProps) {
  const { habit, completion } = item;
  const longPress = useLongPress(onOpenOptions);
  const summary = summarizeItem(item);
  const { accent } = habitColor(habit.color);
  const minimum =
    completion?.kind === "minimum" && habit.minimumVersion ? ` · Min ${habit.minimumVersion}` : "";

  return (
    <li className="flex items-center rounded-2xl border border-line bg-surface">
      <button
        type="button"
        aria-pressed={isDone(completion)}
        onClick={onToggle}
        {...longPress}
        className="flex min-h-12 min-w-0 flex-1 touch-manipulation items-center gap-3.5 rounded-2xl py-2 pr-3.5 pl-4 text-left select-none touch-callout-none"
      >
        <span
          aria-hidden="true"
          className={clsx("glow-current size-2 shrink-0 rounded-full bg-current", accent)}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base leading-tight font-medium">{habit.name}</span>
          <span className={clsx("label mt-0.5 block truncate", TONE_CLASS[summary.tone])}>
            {summary.text}
            {minimum}
          </span>
          {completion?.note && (
            <span className="mt-1 block truncate text-sm text-muted italic">
              “{completion.note}”
            </span>
          )}
          <span className="sr-only">, {STATUS_TEXT[completion?.kind ?? "none"]}</span>
        </span>
        <CompletionMark kind={completion?.kind} color={habit.color} />
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
