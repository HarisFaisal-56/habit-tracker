import clsx from "clsx";
import { format } from "date-fns";
import { Bell, Download, Smartphone, Upload, type LucideIcon } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useInstallState } from "../../app/useInstall";
import { useToday } from "../../app/useToday";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Switch } from "../../components/Switch";
import type { Backup } from "../../data/backup";
import { useRepository } from "../../data/RepositoryContext";
import { useHabits } from "../../data/useData";
import { pickTextFile, saveTextFile } from "../../platform/files";
import { isInstalled, isIos, promptInstall } from "../../platform/install";
import {
  getNotificationPermission,
  REMINDERS_WORK_WHEN_CLOSED,
  requestNotificationPermission,
  showNotification,
} from "../../platform/notifications";
import { useSettings, type ThemePreference } from "../../store/settingsStore";
import { describeData } from "./describeData";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

// Backups pull in Zod, so they load on first use rather than with the app.
// The service worker precaches the chunk, so this still works offline.
const loadBackup = () => import("../../data/backup");

const mutedText = "text-sm text-muted";

type Message = { tone: "success" | "error"; text: string };

export function SettingsScreen() {
  return (
    <Screen title="Settings" subtitle="Mission control" glow="settings" gap="loose">
      <AppearanceSection />
      <RemindersSection />
      <DataSection />
      <ResetSection />
      <AboutFooter />
    </Screen>
  );
}

type SettingsSectionProps = {
  title: string;
  children: ReactNode;
  /** Rows separated by lines, edge to edge; otherwise one padded block. */
  list?: boolean;
  /** Shown under the card, e.g. a status message. */
  footer?: ReactNode;
};

function SettingsSection({ title, children, list = false, footer }: SettingsSectionProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="section-label px-1">
        {title}
      </h2>
      <div
        className={clsx(
          "flex flex-col rounded-3xl border border-line bg-surface",
          list ? "divide-y divide-line overflow-hidden" : "gap-3 p-3.5",
        )}
      >
        {children}
      </div>
      {footer}
    </section>
  );
}

/** Extra text or controls under a list's rows, e.g. a confirmation or a status message. */
function RowNote({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 px-4 py-3.5">{children}</div>;
}

function StatusMessage({ message }: { message: Message | null }) {
  return (
    <p
      role="status"
      className={clsx(
        "px-1 text-sm empty:hidden",
        message?.tone === "error" ? "text-danger" : "text-accent-text",
      )}
    >
      {message?.text}
    </p>
  );
}

type ActionRowProps = {
  icon: LucideIcon;
  label: string;
  /** A short mono tag on the right, e.g. "JSON". Decorative. */
  tag: string;
  onClick: () => void;
};

/** A tappable list row: an icon on a tile, the action, and a tag. */
function ActionRow({ icon: Icon, label, tag, onClick }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-4 px-4 py-2.5 text-left hover:bg-raised/50 active:bg-raised/50"
    >
      <span className="flex size-8.5 shrink-0 items-center justify-center rounded-xl bg-raised">
        <Icon aria-hidden="true" className="size-5 text-accent-text" strokeWidth={1.75} />
      </span>
      <span className="flex-1 text-base">{label}</span>
      <span aria-hidden="true" className="label tracking-normal">
        {tag}
      </span>
    </button>
  );
}

function AppearanceSection() {
  const theme = useSettings((state) => state.theme);
  const setTheme = useSettings((state) => state.setTheme);
  return (
    <SettingsSection title="Appearance">
      <SegmentedControl label="Theme" options={THEME_OPTIONS} value={theme} onChange={setTheme} />
    </SettingsSection>
  );
}

function RemindersSection() {
  const enabled = useSettings((state) => state.remindersEnabled);
  const setEnabled = useSettings((state) => state.setRemindersEnabled);
  const habits = useHabits();
  const [permission, setPermission] = useState(getNotificationPermission);
  const [message, setMessage] = useState<Message | null>(null);

  // The user may change the permission in the browser's site settings meanwhile.
  useEffect(() => {
    const refresh = () => {
      setPermission(getNotificationPermission());
    };
    document.addEventListener("visibilitychange", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const withReminder = habits?.filter((habit) => habit.reminderTime !== undefined).length ?? 0;
  const on = enabled && permission === "granted";

  const turnOn = async () => {
    setMessage(null);
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      setEnabled(true);
    } else if (result === "denied") {
      setMessage({
        tone: "error",
        text: "Notifications were blocked, so reminders can’t be sent.",
      });
    }
  };

  const sendTest = async () => {
    try {
      await showNotification({
        title: "🔔 Reminders are working",
        body: "You’ll get a nudge like this at each habit’s reminder time.",
        tag: "reminder-test",
      });
      setMessage({ tone: "success", text: "Test notification sent." });
    } catch (error) {
      console.error("Test notification failed", error);
      setMessage({ tone: "error", text: "Couldn’t show a notification on this device." });
    }
  };

  let detail: string;
  if (permission === "unsupported") {
    detail =
      isIos() && !isInstalled()
        ? "On iPhone and iPad, install the app to your Home Screen first, then turn on reminders here."
        : "This browser can’t show notifications, so reminders aren’t available here.";
  } else if (permission === "denied") {
    detail =
      "Notifications are blocked for this site. Allow them in your browser’s site settings, then come back here.";
  } else if (!on) {
    detail = "At each habit’s time, if it’s still open";
  } else if (withReminder === 0) {
    detail = "No habit has a reminder time yet. Add one when editing a habit.";
  } else {
    detail = `${String(withReminder)} habit${withReminder === 1 ? " has" : "s have"} a reminder time. Change times when editing a habit.`;
  }

  return (
    <SettingsSection title="Reminders" list footer={<StatusMessage message={message} />}>
      <div className="flex items-center gap-4 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-base">Habit reminders</p>
          <p className="text-md text-soft">{detail}</p>
        </div>
        <Switch
          label="Habit reminders"
          checked={on}
          disabled={permission === "unsupported" || permission === "denied"}
          onChange={(checked) => {
            if (checked) {
              void turnOn();
            } else {
              setEnabled(false);
              setMessage(null);
            }
          }}
        />
      </div>
      {on && (
        <ActionRow icon={Bell} label="Send a test" tag="Test" onClick={() => void sendTest()} />
      )}
      {on && !REMINDERS_WORK_WHEN_CLOSED && (
        <RowNote>
          <p className={mutedText}>
            Reminders arrive while the app is open or running in the background. Fully closing it
            pauses them until you open it again.
          </p>
        </RowNote>
      )}
    </SettingsSection>
  );
}

function DataSection() {
  const repository = useRepository();
  const today = useToday();
  const installState = useInstallState();
  const [message, setMessage] = useState<Message | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [installHelp, setInstallHelp] = useState(false);

  const exportBackup = async () => {
    try {
      const { backupFileName, createBackup, serializeBackup } = await loadBackup();
      const data = await repository.exportData();
      saveTextFile(
        backupFileName(today),
        serializeBackup(createBackup(data, new Date())),
        "application/json",
      );
      setMessage({ tone: "success", text: `Exported ${describeData(data)}.` });
    } catch (error) {
      console.error("Export failed", error);
      setMessage({ tone: "error", text: "Couldn’t export your data. Please try again." });
    }
  };

  const chooseBackup = async () => {
    setMessage(null);
    const text = await pickTextFile(".json,application/json");
    if (text === null) return;
    const { parseBackup } = await loadBackup();
    const result = parseBackup(text);
    if (result.ok) {
      setPending(result.backup);
    } else {
      setMessage({ tone: "error", text: result.error });
    }
  };

  const restore = async (backup: Backup) => {
    try {
      await repository.replaceAllData(backup);
      setPending(null);
      setMessage({ tone: "success", text: `Restored ${describeData(backup)}.` });
    } catch (error) {
      console.error("Import failed", error);
      setPending(null);
      setMessage({
        tone: "error",
        text: "Couldn’t restore the backup. Your existing data hasn’t changed.",
      });
    }
  };

  const install = async () => {
    setMessage(null);
    if (installState !== "available") {
      // No prompt to show: explain how to install from the browser instead.
      setInstallHelp((shown) => !shown);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === "accepted") setMessage({ tone: "success", text: "Installing…" });
  };

  return (
    <SettingsSection title="Your data" list footer={<StatusMessage message={message} />}>
      <ActionRow
        icon={Download}
        label="Export backup"
        tag="JSON"
        onClick={() => void exportBackup()}
      />
      <ActionRow
        icon={Upload}
        label="Import backup"
        tag="JSON"
        onClick={() => void chooseBackup()}
      />
      {pending && (
        <RowNote>
          <div role="group" aria-label="Confirm import" className="flex flex-col gap-3">
            <p>
              Replace all current data with this backup from{" "}
              {format(new Date(pending.exportedAt), "d MMMM yyyy")}? It has {describeData(pending)}.
              This can’t be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => {
                  setPending(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => void restore(pending)}>
                Replace my data
              </Button>
            </div>
          </div>
        </RowNote>
      )}
      {installState !== "installed" && (
        <ActionRow
          icon={Smartphone}
          label="Install on this device"
          tag="PWA"
          onClick={() => void install()}
        />
      )}
      {installHelp && installState !== "installed" && installState !== "available" && (
        <RowNote>
          <p className={mutedText}>
            {installState === "ios" ? (
              <>
                In Safari, tap the Share button, then <strong>Add to Home Screen</strong>.
              </>
            ) : (
              <>
                Look for <strong>Install app</strong> or <strong>Add to Home screen</strong> in your
                browser’s menu. Not every browser offers it.
              </>
            )}
          </p>
        </RowNote>
      )}
    </SettingsSection>
  );
}

function ResetSection() {
  const repository = useRepository();
  const resetWelcome = useSettings((state) => state.resetWelcome);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const reset = async () => {
    try {
      await repository.clearAllData();
      resetWelcome();
      setMessage({ tone: "success", text: "All data deleted." });
    } catch (error) {
      console.error("Reset failed", error);
      setMessage({ tone: "error", text: "Couldn’t delete your data. Please try again." });
    }
    setConfirming(false);
  };

  return (
    <section aria-labelledby="reset-heading" className="flex flex-col items-center gap-3">
      <h2 id="reset-heading" className="sr-only">
        Reset
      </h2>
      {confirming ? (
        <div
          role="group"
          aria-label="Confirm reset"
          className="flex w-full flex-col gap-3 rounded-3xl border border-line bg-surface p-4"
        >
          <p>
            Delete all habits, check-ins and reviews on this device? Export a backup first if you
            might want them back.
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setConfirming(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={() => void reset()}>
              Delete everything
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setConfirming(true);
          }}
          className="min-h-11 rounded-2xl px-4 text-lg text-danger hover:bg-raised active:bg-raised"
        >
          Delete all data
        </button>
      )}
      <p
        role="status"
        className={clsx(
          "text-sm empty:hidden",
          message?.tone === "error" ? "text-danger" : "text-accent-text",
        )}
      >
        {message?.text}
      </p>
    </section>
  );
}

function AboutFooter() {
  return (
    <footer className="section-label pb-2 text-center leading-relaxed text-balance">
      Habit Tracker {__APP_VERSION__} · Your data stays on this device
    </footer>
  );
}
