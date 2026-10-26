import { useId } from "react";

// prettier-ignore
const HABIT_EMOJIS = [
  "✅", "📚", "🏃", "🧘", "💧", "🥗",
  "😴", "✍️", "🚶", "🏋️", "🚴", "🧠",
  "🎸", "🎨", "🌱", "☀️", "🧹", "💊",
  "🦷", "🍎", "📵", "🙏", "💰", "🗣️",
];

type EmojiPickerProps = {
  value: string;
  onChange: (emoji: string) => void;
};

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Emoji</legend>
      <div className="grid grid-cols-6 gap-1">
        {HABIT_EMOJIS.map((emoji) => (
          <label key={emoji} className="relative">
            <input
              type="radio"
              name={name}
              value={emoji}
              checked={value === emoji}
              onChange={() => {
                onChange(emoji);
              }}
              className="peer sr-only"
            />
            <span className="flex h-12 cursor-pointer items-center justify-center rounded-xl text-2xl peer-checked:bg-accent/15 peer-checked:ring-2 peer-checked:ring-accent-text peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-text">
              {emoji}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
