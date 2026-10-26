import { useId } from "react";
import { Button } from "../../components/Button";
import { getNotificationPermission } from "../../platform/notifications";
import { useSettings } from "../../store/settingsStore";
import { errorClass, hintClass, inputClass } from "./formStyles";

type ReminderFieldProps = {
  /** "HH:mm", or "" for no reminder. */
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

export function ReminderField({ value, error, onChange }: ReminderFieldProps) {
  const id = useId();
  const hintId = useId();
  const errorId = useId();
  const remindersEnabled = useSettings((state) => state.remindersEnabled);
  const ready = remindersEnabled && getNotificationPermission() === "granted";

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        Reminder <span className="font-normal text-muted">(optional)</span>
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="time"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          className={inputClass}
        />
        {value !== "" && (
          <Button
            variant="ghost"
            aria-label="Remove reminder"
            onClick={() => {
              onChange("");
            }}
          >
            Remove
          </Button>
        )}
      </div>
      <p id={hintId} className={hintClass}>
        {ready
          ? "You’ll get a notification at this time on days it’s due, unless you’ve already logged it."
          : "Turn on reminders in Settings to get a notification at this time."}
      </p>
      {error && (
        <p id={errorId} className={errorClass}>
          {error}
        </p>
      )}
    </div>
  );
}
