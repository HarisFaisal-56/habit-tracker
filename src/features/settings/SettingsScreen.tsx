import clsx from "clsx";
import { format } from "date-fns";
import {
  BellRing,
  Check,
  ChevronRight,
  CircleCheck,
  Download,
  Send,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useInstallState } from "../../app/useInstall";
import { useToday } from "../../app/useToday";
import { Button } from "../../components/Button";
import { habitColor, tint } from "../../components/habitColors";
import { Screen } from "../../components/Screen";
import { Switch } from "../../components/Switch";
import type { Backup } from "../../data/backup";
import type { Habit } from "../../domain/habit";
import { useRepository } from "../../data/RepositoryContext";
import { useCompletions, useHabits, useWeeklyReviews } from "../../data/useData";
import { pickTextFile, saveTextFile } from "../../platform/files";
import { isInstalled, isIos, promptInstall } from "../../platform/install";
import {
  getNotificationPermission,
  REMINDERS_WORK_WHEN_CLOSED,
  requestNotificationPermission,
  showNotification,
} from "../../platform/notifications";
import { useSettings, type ThemePreference } from "../../store/settingsStore";
import { countLoggedDays } from "../history/historyData";
import { formatReminderTime } from "../reminders/reminderText";
import { describeData } from "./describeData";

/**
 * A tiny picture of the app in each theme. These show the themes themselves, so
 * they use each theme's own colours rather than the current one's.
 */
const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  preview: { background: string; line: string; line2: string };
}[] = [
  {
    value: "dark",
    label: "Dark",
    preview: {
      background: "linear-gradient(180deg,#0d0e12,#07080b)",
      line: "#1f2126",
      line2: "#2a2d33",
    },
  },
  {
    value: "light",
    label: "Light",
    preview: {
      background: "linear-gradient(180deg,#ffffff,#f0f0ea)",
      line: "#e2e2da",
      line2: "#d3d3ca",
    },
  },
  {
    value: "system",
    label: "System",
    preview: {
      background: "linear-gradient(115deg,#f6f6f1 0 50%,#07080b 50% 100%)",
      line: "rgb(140 140 140 / 0.35)",
      line2: "rgb(140 140 140 / 0.5)",
    },
  },
];

// Backups pull in Zod, so they load on first use rather than with the app.
// The service worker precaches the chunk, so this still works offline.
const loadBackup = () => import("../../data/backup");

const mutedText = "text-sm text-muted";

type Message = { tone: "success" | "error"; text: string };

export function SettingsScreen() {
  return (
    <Screen title="Settings" subtitle="Mission control" glow="settings" gap="loose">
      <AppCard />
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
  /** Rows separated by lines, edge to edge, in a card; otherwise the children as they are. */
  list?: boolean;
  /** Shown under the card, e.g. a status message. */
  footer?: ReactNode;
  /** Seconds before the section rises into place. */
  delay: number;
};

function SettingsSection({ title, children, list = false, footer, delay }: SettingsSectionProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex animate-rise flex-col gap-3"
      style={{ animationDelay: `${String(delay)}s` }}
    >
      <h2 id={headingId} className="section-label px-1">
        {title}
      </h2>
      {list ? (
        <div className="card flex flex-col divide-y divide-ink/5 overflow-hidden rounded-card">
          {children}
        </div>
      ) : (
        children
      )}
      {footer}
    </section>
  );
}

/** Extra text or controls under a list's rows, e.g. a confirmation or a status message. */
function RowNote({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 px-4 py-3.5">{children}</div>;
}

function StatusMessage({
  message,
  centered = false,
}: {
  message: Message | null;
  centered?: boolean;
}) {
  return (
    <p
      role="status"
      className={clsx(
        "flex animate-rise-fast items-center gap-1.5 px-1 text-sm empty:hidden",
        centered && "justify-center",
        message?.tone === "error" ? "text-danger" : "text-accent-text",
      )}
    >
      {message?.tone === "success" && (
        <CircleCheck aria-hidden="true" className="size-3.75 shrink-0" />
      )}
      {message?.text}
    </p>
  );
}

/** An icon on a small raised tile, lit in the accent. */
function IconTile({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-b from-raised to-surface text-accent-text shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
      <Icon aria-hidden="true" className="size-4.5" strokeWidth={1.8} />
    </span>
  );
}

type ActionRowProps = {
  icon: LucideIcon;
  label: string;
  /** A line under the label, e.g. "Save everything as one file". */
  detail?: string;
  /** A short mono tag on the right, e.g. "JSON". Decorative. */
  tag?: string;
  onClick: () => void;
};

/** A tappable list row: an icon on a tile, the action, and a tag or a chevron. */
function ActionRow({ icon, label, detail, tag, onClick }: ActionRowProps) {
  const labelId = useId();
  const detailId = useId();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-labelledby={labelId}
      aria-describedby={detail ? detailId : undefined}
      className="flex min-h-15 w-full items-center gap-3.5 px-4 py-2.5 text-left hover:bg-raised/50 active:bg-raised/50"
    >
      <IconTile icon={icon} />
      <span className="min-w-0 flex-1">
        <span id={labelId} className="block text-base">
          {label}
        </span>
        {detail && (
          <span id={detailId} className="mt-0.5 block text-note text-faint">
            {detail}
          </span>
        )}
      </span>
      {tag ? (
        <span
          aria-hidden="true"
          className="rounded-md border border-line-strong px-1.75 py-0.75 font-mono text-2xs tracking-[0.06em] text-muted"
        >
          {tag}
        </span>
      ) : (
        <ChevronRight aria-hidden="true" className="size-4 text-dim" />
      )}
    </button>
  );
}

/** The app itself: icon, version, and how much is stored on this device. */
function AppCard() {
  const habits = useHabits();
  const completions = useCompletions();
  const reviews = useWeeklyReviews();
  const counts = [
    { value: habits?.length, label: "Habits" },
    { value: completions && countLoggedDays(completions), label: "Days logged" },
    { value: reviews?.length, label: "Reviews" },
  ];
  return (
    <div
      className="card relative animate-rise overflow-hidden rounded-card [--card-edge:rgb(255_255_255/0.16)] [--card-wash:radial-gradient(90%_120%_at_100%_0%,color-mix(in_oklab,var(--color-accent)_12%,transparent),transparent_55%)]"
      style={{ animationDelay: "0.05s" }}
    >
      <div className="flex items-center gap-3.5 p-4">
        <img
          src="/pwa-512x512.png"
          alt=""
          className="block size-13 rounded-icon shadow-[0_10px_24px_-8px_rgb(0_0_0/0.7),inset_0_0_0_1px_rgb(255_255_255/0.1)]"
        />
        <div className="min-w-0 flex-1">
          <p className="text-lead font-medium tracking-tight">Habit Tracker</p>
          <p className="mt-0.75 flex items-center gap-1.5 font-mono text-2xs tracking-[0.08em] text-muted uppercase">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-habit-teal shadow-[0_0_6px_var(--color-habit-teal)]"
            />
            V{__APP_VERSION__} · Offline ready
          </p>
        </div>
        <span className="flex h-6.5 items-center gap-1.25 rounded-full border border-accent-text/25 bg-accent/8 px-2.25 font-mono text-micro tracking-[0.08em] text-accent-text">
          <ShieldCheck aria-hidden="true" className="size-3" />
          LOCAL
        </span>
      </div>
      <dl className="grid grid-cols-3 border-t border-ink/5">
        {counts.map(({ value, label }, index) => (
          <div
            key={label}
            className={clsx(
              "flex flex-col-reverse px-4 py-3",
              index > 0 && "border-l border-ink/5",
            )}
          >
            <dt className="mt-0.75 font-mono text-micro tracking-widest text-muted uppercase">
              {label}
            </dt>
            <dd className="text-emoji font-extralight tabular-nums">{value ?? "–"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function AppearanceSection() {
  const theme = useSettings((state) => state.theme);
  const setTheme = useSettings((state) => state.setTheme);
  const name = useId();
  return (
    <SettingsSection title="Appearance" delay={0.1}>
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2.5">
        {THEME_OPTIONS.map(({ value, label, preview }) => {
          const selected = theme === value;
          return (
            <label key={value} className="flex cursor-pointer flex-col items-center gap-2.25">
              <input
                type="radio"
                name={name}
                value={value}
                checked={selected}
                onChange={() => {
                  setTheme(value);
                }}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={clsx(
                  "relative aspect-[0.82] w-full overflow-hidden rounded-field peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-accent-text motion-safe:transition-[box-shadow,transform] motion-safe:duration-250",
                  selected
                    ? "shadow-[0_0_0_2px_var(--color-accent),0_0_0_6px_color-mix(in_oklab,var(--color-accent)_12%,transparent),0_14px_30px_-12px_color-mix(in_oklab,var(--color-accent)_40%,transparent)]"
                    : "scale-96 shadow-[0_0_0_1px_var(--color-line-strong)]",
                )}
                style={{ background: preview.background }}
              >
                <span
                  className="absolute inset-x-3 top-3.5 h-1.25 rounded-xs"
                  style={{ background: preview.line }}
                />
                <span
                  className="absolute top-6 left-3 h-1.25 w-2/5 rounded-xs"
                  style={{ background: preview.line2 }}
                />
                <span
                  className="absolute top-[44%] left-1/2 -ml-4.25 size-8.5 rounded-full border-3 border-accent"
                  style={{ borderRightColor: preview.line2, borderBottomColor: preview.line2 }}
                />
                <span
                  className="absolute inset-x-3 bottom-3 h-3 rounded-md"
                  style={{ background: preview.line }}
                />
                {selected && (
                  <span className="absolute top-1.75 right-1.75 flex size-4.5 animate-pop items-center justify-center rounded-full bg-accent text-accent-ink">
                    <Check className="size-2.75" strokeWidth={3.5} />
                  </span>
                )}
              </span>
              <span className={clsx("text-sm", selected ? "font-semibold text-ink" : "text-muted")}>
                {label}
              </span>
            </label>
          );
        })}
      </div>
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

  const withReminder = habits?.filter((habit) => habit.reminderTime !== undefined) ?? [];
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
  } else if (withReminder.length === 0) {
    detail = "No habit has a reminder time yet. Add one when editing a habit.";
  } else {
    detail =
      withReminder.length === 1
        ? "1 habit nudges you if it’s still open."
        : `${String(withReminder.length)} habits nudge you if they’re still open.`;
  }

  return (
    <SettingsSection
      title="Reminders"
      list
      footer={<StatusMessage message={message} />}
      delay={0.15}
    >
      <div className="flex items-center gap-3.5 px-4 py-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[radial-gradient(100%_100%_at_30%_20%,color-mix(in_oklab,var(--color-accent)_25%,transparent),color-mix(in_oklab,var(--color-accent)_6%,transparent))] text-accent-text shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-accent)_25%,transparent)]">
          <BellRing aria-hidden="true" className="size-4.5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base">Habit reminders</p>
          <p className="mt-0.5 text-sm leading-snug text-muted">{detail}</p>
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
      {on && withReminder.length > 0 && (
        <ul aria-label="Reminder times">
          {withReminder.map((habit) => (
            <ReminderRow key={habit.id} habit={habit} />
          ))}
        </ul>
      )}
      {on && <ActionRow icon={Send} label="Send a test" onClick={() => void sendTest()} />}
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

/** A habit with a reminder, and its time on a chip. */
function ReminderRow({ habit }: { habit: Habit }) {
  const { value } = habitColor(habit.color);
  return (
    <li className="flex items-center gap-3 py-2.75 pr-4 pl-16.5">
      <span aria-hidden="true" className="text-md">
        {habit.emoji}
      </span>
      <span className="min-w-0 flex-1 truncate text-md text-ink/90">{habit.name}</span>
      <span className="flex h-7 items-center gap-1.5 rounded-lg bg-raised/80 px-2.5 font-mono text-xs tabular-nums shadow-[inset_0_0_0_1px_var(--color-line-strong)]">
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full"
          style={{ background: value, boxShadow: `0 0 6px ${tint(value, 0.9)}` }}
        />
        {habit.reminderTime && formatReminderTime(habit.reminderTime)}
      </span>
    </li>
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
    <SettingsSection
      title="Your data"
      list
      footer={<StatusMessage message={message} />}
      delay={0.2}
    >
      <ActionRow
        icon={Download}
        label="Export backup"
        detail="Save everything as one file"
        tag="JSON"
        onClick={() => void exportBackup()}
      />
      <ActionRow
        icon={Upload}
        label="Import backup"
        detail="Replaces what’s on this device"
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
                variant="secondary"
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
          detail="Opens full-screen, works offline"
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
          className="flex w-full animate-rise-fast flex-col gap-3 rounded-3xl border border-danger/30 bg-[radial-gradient(120%_100%_at_0%_0%,color-mix(in_oklab,var(--color-danger)_12%,transparent),transparent_60%)] bg-surface p-4"
        >
          <p className="leading-snug">
            Delete all habits, check-ins and reviews on this device? Export a backup first if you
            might want them back.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
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
        <Button
          variant="danger-ghost"
          icon={Trash2}
          onClick={() => {
            setMessage(null);
            setConfirming(true);
          }}
        >
          Delete all data
        </Button>
      )}
      <StatusMessage message={message} centered />
    </section>
  );
}

function AboutFooter() {
  return (
    <footer className="pb-1 text-center font-mono text-caption leading-relaxed tracking-widest text-balance text-dim uppercase">
      Habit Tracker {__APP_VERSION__} · Your data stays on this device
    </footer>
  );
}
