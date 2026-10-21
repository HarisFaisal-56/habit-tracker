import clsx from "clsx";
import { Ellipsis } from "lucide-react";
import { IconButton } from "../../components/Button";
import { CompletionMark } from "../../components/CompletionMark";
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
  normal: "text-stone-500 dark:text-stone-400",
  warning: "text-amber-700 dark:text-amber-400",
  success: "text-emerald-700 dark:text-emerald-400",
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

  return (
    <li className="flex items-center rounded-2xl bg-white shadow-sm dark:bg-stone-900">
      <button
        type="button"
        aria-pressed={isDone(completion)}
        onClick={onToggle}
        {...longPress}
        className="flex min-h-16 min-w-0 flex-1 touch-manipulation items-center gap-3 rounded-2xl p-3 text-left select-none touch-callout-none"
      >
        <HabitIcon emoji={habit.emoji} color={habit.color} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{habit.name}</span>
          {summary && (
            <span className={clsx("block truncate text-sm", TONE_CLASS[summary.tone])}>
              {summary.text}
            </span>
          )}
          {completion?.kind === "minimum" && habit.minimumVersion && (
            <span className="block truncate text-sm text-stone-500 dark:text-stone-400">
              Minimum: {habit.minimumVersion}
            </span>
          )}
          {completion?.note && (
            <span className="block truncate text-sm text-stone-500 italic dark:text-stone-400">
              “{completion.note}”
            </span>
          )}
          <span className="sr-only">, {STATUS_TEXT[completion?.kind ?? "none"]}</span>
        </span>
        <CompletionMark kind={completion?.kind} color={habit.color} />
      </button>
      <IconButton
        label={`More options for ${habit.name}`}
        icon={Ellipsis}
        onClick={onOpenOptions}
        className="mr-1"
      />
    </li>
  );
}
