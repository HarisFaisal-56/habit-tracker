import clsx from "clsx";
import { format } from "date-fns";
import { Download, Smartphone, Trash, Upload } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useInstallState } from "../../app/useInstall";
import { useToday } from "../../app/useToday";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { SegmentedControl } from "../../components/SegmentedControl";
import type { Backup } from "../../data/backup";
import { useRepository } from "../../data/RepositoryContext";
import { pickTextFile, saveTextFile } from "../../platform/files";
import { promptInstall } from "../../platform/install";
import { useSettings, type ThemePreference } from "../../store/settingsStore";
import { describeData } from "./describeData";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

// Backups pull in Zod, so they load on first use rather than with the app.
// The service worker precaches the chunk, so this still works offline.
const loadBackup = () => import("../../data/backup");

const mutedText = "text-sm text-stone-500 dark:text-stone-400";

type Message = { tone: "success" | "error"; text: string };

export function SettingsScreen() {
  return (
    <Screen title="Settings">
      <AppearanceSection />
      <InstallSection />
      <BackupSection />
      <ResetSection />
      <AboutSection />
    </Screen>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-sm font-semibold text-stone-500 dark:text-stone-400">
        {title}
      </h2>
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
        {children}
      </div>
    </section>
  );
}

function StatusMessage({ message }: { message: Message | null }) {
  return (
    <p
      role="status"
      className={clsx(
        "text-sm empty:hidden",
        message?.tone === "error"
          ? "text-rose-700 dark:text-rose-400"
          : "text-emerald-700 dark:text-emerald-400",
      )}
    >
      {message?.text}
    </p>
  );
}

function AppearanceSection() {
  const theme = useSettings((state) => state.theme);
  const setTheme = useSettings((state) => state.setTheme);
  return (
    <SettingsSection title="Appearance">
      <SegmentedControl label="Theme" options={THEME_OPTIONS} value={theme} onChange={setTheme} />
      <p className={mutedText}>System follows your device’s light or dark setting.</p>
    </SettingsSection>
  );
}

function InstallSection() {
  const installState = useInstallState();
  const [message, setMessage] = useState<Message | null>(null);

  if (installState === "installed") return null;

  const install = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") setMessage({ tone: "success", text: "Installing…" });
  };

  return (
    <SettingsSection title="Install">
      <p>Add Habit Tracker to your home screen. It opens like an app and works fully offline.</p>
      {installState === "available" && (
        <Button icon={Smartphone} onClick={() => void install()}>
          Install app
        </Button>
      )}
      {installState === "ios" && (
        <p className={mutedText}>
          In Safari, tap the Share button, then <strong>Add to Home Screen</strong>.
        </p>
      )}
      {installState === "unavailable" && (
        <p className={mutedText}>
          Look for <strong>Install app</strong> or <strong>Add to Home screen</strong> in your
          browser’s menu. Not every browser offers it.
        </p>
      )}
      <StatusMessage message={message} />
    </SettingsSection>
  );
}

function BackupSection() {
  const repository = useRepository();
  const today = useToday();
  const [message, setMessage] = useState<Message | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);

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

  return (
    <SettingsSection title="Backup">
      <p>
        Your data lives only on this device. Export a backup now and then, and import it to restore
        or move to another device.
      </p>
      {pending ? (
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
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="secondary"
            icon={Download}
            className="flex-1"
            onClick={() => void exportBackup()}
          >
            Export backup
          </Button>
          <Button
            variant="secondary"
            icon={Upload}
            className="flex-1"
            onClick={() => void chooseBackup()}
          >
            Import backup
          </Button>
        </div>
      )}
      <StatusMessage message={message} />
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
    <SettingsSection title="Reset">
      {confirming ? (
        <div role="group" aria-label="Confirm reset" className="flex flex-col gap-3">
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
        <Button
          variant="danger"
          icon={Trash}
          onClick={() => {
            setMessage(null);
            setConfirming(true);
          }}
        >
          Delete all data
        </Button>
      )}
      <StatusMessage message={message} />
    </SettingsSection>
  );
}

function AboutSection() {
  return (
    <SettingsSection title="About">
      <p>
        <span className="font-medium">Habit Tracker</span>{" "}
        <span className={mutedText}>version {__APP_VERSION__}</span>
      </p>
      <p className={mutedText}>
        A calm habit tracker that forgives bad days. No account, no tracking: everything stays on
        this device and works offline.
      </p>
    </SettingsSection>
  );
}
