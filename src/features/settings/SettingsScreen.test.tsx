import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBackup, serializeBackup } from "../../data/backup";
import type { NewHabit } from "../../data/repository";
import { pickTextFile, saveTextFile } from "../../platform/files";
import { initInstallPrompt } from "../../platform/install";
import { useSettings } from "../../store/settingsStore";
import { installFakeNotification } from "../../test/fakeNotification";
import { makeHabit } from "../../test/factories";
import { createTestRepository, renderApp } from "../../test/renderApp";

vi.mock("../../platform/files", () => ({
  saveTextFile: vi.fn(),
  pickTextFile: vi.fn(),
}));

const reading: NewHabit = {
  name: "Read",
  emoji: "📚",
  color: "emerald",
  schedule: { type: "daily" },
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2025, 0, 8, 9, 0));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.mocked(saveTextFile).mockReset();
  vi.mocked(pickTextFile).mockReset();
});

function section(name: string) {
  return within(screen.getByRole("region", { name }));
}

/** A valid backup file containing one habit named `name`. */
function backupText(name: string) {
  return serializeBackup(
    createBackup(
      {
        habits: [makeHabit({ id: "imported", name })],
        completions: [{ id: "c1", habitId: "imported", date: "2025-01-02", kind: "full" }],
        weeklyReviews: [],
      },
      new Date("2025-01-05T10:00:00Z"),
    ),
  );
}

describe("SettingsScreen", () => {
  describe("appearance", () => {
    it("switches between system, light and dark themes and remembers the choice", async () => {
      const { user } = renderApp("/settings");
      const appearance = section("Appearance");
      const root = document.documentElement;

      expect(appearance.getByRole("radio", { name: "System" })).toBeChecked();
      expect(root).not.toHaveClass("dark"); // the test system is light

      await user.click(appearance.getByRole("radio", { name: "Dark" }));
      expect(root).toHaveClass("dark");
      expect(useSettings.getState().theme).toBe("dark");

      await user.click(appearance.getByRole("radio", { name: "Light" }));
      expect(root).not.toHaveClass("dark");
      expect(root.style.colorScheme).toBe("light");
    });
  });

  describe("backup", () => {
    it("exports all data as a dated JSON file", async () => {
      const repository = createTestRepository();
      const habit = await repository.createHabit(reading);
      await repository.setHabitArchived(habit.id, true);
      const { user } = renderApp("/settings", repository);

      await user.click(section("Your data").getByRole("button", { name: "Export backup" }));

      expect(await screen.findByText("Exported 1 habit, 0 check-ins and 0 reviews.")).toBeVisible();
      const [fileName, contents, mimeType] = vi.mocked(saveTextFile).mock.calls[0] ?? [];
      expect(fileName).toBe("habit-tracker-backup-2025-01-08.json");
      expect(mimeType).toBe("application/json");
      expect(JSON.parse(contents ?? "")).toMatchObject({
        app: "habit-tracker",
        schemaVersion: 1,
        habits: [{ name: "Read", archived: true }],
      });
    });

    it("imports a backup after confirmation, replacing current data", async () => {
      const repository = createTestRepository();
      await repository.createHabit(reading);
      vi.mocked(pickTextFile).mockResolvedValue(backupText("Imported habit"));
      const { user } = renderApp("/settings", repository);

      await user.click(section("Your data").getByRole("button", { name: "Import backup" }));

      const confirm = await screen.findByRole("group", { name: "Confirm import" });
      expect(confirm).toHaveTextContent("5 January 2025");
      expect(confirm).toHaveTextContent("1 habit, 1 check-in and 0 reviews");
      // Nothing changes until confirmed.
      expect((await repository.listHabits())[0]?.name).toBe("Read");

      await user.click(within(confirm).getByRole("button", { name: "Replace my data" }));

      expect(await screen.findByText("Restored 1 habit, 1 check-in and 0 reviews.")).toBeVisible();
      expect((await repository.listHabits()).map((h) => h.name)).toEqual(["Imported habit"]);
    });

    it("keeps current data when the import is cancelled at confirmation", async () => {
      const repository = createTestRepository();
      await repository.createHabit(reading);
      vi.mocked(pickTextFile).mockResolvedValue(backupText("Imported habit"));
      const { user } = renderApp("/settings", repository);

      await user.click(section("Your data").getByRole("button", { name: "Import backup" }));
      const confirm = await screen.findByRole("group", { name: "Confirm import" });
      await user.click(within(confirm).getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("group", { name: "Confirm import" })).not.toBeInTheDocument();
      expect((await repository.listHabits())[0]?.name).toBe("Read");
    });

    it("explains why an invalid file can't be imported", async () => {
      const repository = createTestRepository();
      await repository.createHabit(reading);
      vi.mocked(pickTextFile).mockResolvedValue('{"app":"something-else"}');
      const { user } = renderApp("/settings", repository);

      await user.click(section("Your data").getByRole("button", { name: "Import backup" }));

      expect(await screen.findByText("This file isn't a Habit Tracker backup.")).toBeVisible();
      expect(screen.queryByRole("group", { name: "Confirm import" })).not.toBeInTheDocument();
      expect(await repository.listHabits()).toHaveLength(1);
    });

    it("does nothing when no file is chosen", async () => {
      vi.mocked(pickTextFile).mockResolvedValue(null);
      const { user } = renderApp("/settings");

      await user.click(section("Your data").getByRole("button", { name: "Import backup" }));

      await waitFor(() => {
        expect(pickTextFile).toHaveBeenCalledWith(".json,application/json");
      });
      expect(screen.queryByRole("group", { name: "Confirm import" })).not.toBeInTheDocument();
      expect(section("Your data").getByRole("status")).toBeEmptyDOMElement();
    });
  });

  describe("reset", () => {
    it("deletes everything after confirmation and brings back the welcome", async () => {
      const repository = createTestRepository();
      const habit = await repository.createHabit(reading);
      await repository.setCompletion({ habitId: habit.id, date: "2025-01-08", kind: "full" });
      useSettings.getState().dismissWelcome();
      const { user } = renderApp("/settings", repository);

      await user.click(section("Reset").getByRole("button", { name: "Delete all data" }));
      const confirm = screen.getByRole("group", { name: "Confirm reset" });
      await user.click(within(confirm).getByRole("button", { name: "Delete everything" }));

      expect(await screen.findByText("All data deleted.")).toBeVisible();
      expect(await repository.exportData()).toEqual({
        habits: [],
        completions: [],
        weeklyReviews: [],
      });
      expect(useSettings.getState().welcomeDismissed).toBe(false);
    });

    it("can be cancelled", async () => {
      const repository = createTestRepository();
      await repository.createHabit(reading);
      const { user } = renderApp("/settings", repository);

      await user.click(section("Reset").getByRole("button", { name: "Delete all data" }));
      await user.click(
        within(screen.getByRole("group", { name: "Confirm reset" })).getByRole("button", {
          name: "Cancel",
        }),
      );

      expect(await repository.listHabits()).toHaveLength(1);
    });
  });

  describe("reminders", () => {
    it("explains when the browser can't show notifications", () => {
      renderApp("/settings");
      expect(section("Reminders").getByText(/can’t show notifications/)).toBeInTheDocument();
      expect(section("Reminders").getByRole("switch", { name: "Habit reminders" })).toBeDisabled();
    });

    it("asks for permission and turns reminders on", async () => {
      const { FakeNotification } = installFakeNotification("default", "granted");
      const repository = createTestRepository();
      await repository.createHabit({ ...reading, reminderTime: "20:00" });
      const { user } = renderApp("/settings", repository);

      const toggle = section("Reminders").getByRole("switch", { name: "Habit reminders" });
      expect(toggle).toHaveAttribute("aria-checked", "false");
      await user.click(toggle);

      expect(FakeNotification.requestPermission).toHaveBeenCalledOnce();
      await waitFor(() => {
        expect(toggle).toHaveAttribute("aria-checked", "true");
      });
      expect(useSettings.getState().remindersEnabled).toBe(true);
      expect(section("Reminders").getByText(/1 habit nudges you if it’s still open/)).toBeVisible();
      // The web can't deliver reminders to a closed app; say so plainly.
      expect(section("Reminders").getByText(/Fully closing it pauses them/)).toBeVisible();
    });

    it("sends a test notification", async () => {
      const { shown } = installFakeNotification("granted");
      useSettings.getState().setRemindersEnabled(true);
      const { user } = renderApp("/settings");

      await user.click(section("Reminders").getByRole("button", { name: "Send a test" }));

      expect(await section("Reminders").findByText("Test notification sent.")).toBeVisible();
      expect(shown.map((n) => n.title)).toEqual(["🔔 Reminders are working"]);
    });

    it("turns reminders off without needing the browser", async () => {
      installFakeNotification("granted");
      useSettings.getState().setRemindersEnabled(true);
      const { user } = renderApp("/settings");

      const toggle = section("Reminders").getByRole("switch", { name: "Habit reminders" });
      expect(toggle).toHaveAttribute("aria-checked", "true");
      await user.click(toggle);

      expect(useSettings.getState().remindersEnabled).toBe(false);
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });

    it("explains how to recover when notifications are blocked", async () => {
      installFakeNotification("default", "denied");
      const { user } = renderApp("/settings");

      await user.click(section("Reminders").getByRole("switch", { name: "Habit reminders" }));

      expect(await section("Reminders").findByText(/blocked for this site/)).toBeVisible();
      expect(section("Reminders").getByText(/reminders can’t be sent/)).toBeVisible();
      expect(useSettings.getState().remindersEnabled).toBe(false);
    });
  });

  describe("install", () => {
    it("explains how to install when the browser offers no prompt", async () => {
      const { user } = renderApp("/settings");
      expect(section("Your data").queryByText(/in your browser’s menu/)).not.toBeInTheDocument();

      await user.click(
        section("Your data").getByRole("button", { name: "Install on this device" }),
      );

      expect(section("Your data").getByText(/in your browser’s menu/)).toBeInTheDocument();
    });

    it("offers an Install button once the browser allows it", async () => {
      initInstallPrompt();
      const { user } = renderApp("/settings");
      const prompt = vi.fn(() => Promise.resolve());
      const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
        prompt,
        userChoice: Promise.resolve({ outcome: "accepted" as const }),
      });

      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true); // the browser's own banner is suppressed
      await user.click(
        section("Your data").getByRole("button", { name: "Install on this device" }),
      );
      expect(prompt).toHaveBeenCalledOnce();
      expect(await screen.findByText("Installing…")).toBeVisible();
    });
  });

  it("shows the app version", () => {
    renderApp("/settings");
    expect(
      screen.getByText(/^Habit Tracker \d+\.\d+\.\d+ · Your data stays on this device$/),
    ).toBeInTheDocument();
  });
});
