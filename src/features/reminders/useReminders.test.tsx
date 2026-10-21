import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NewHabit } from "../../data/repository";
import {
  cancelScheduledNotifications,
  getNotificationPermission,
  scheduleNotifications,
} from "../../platform/notifications";
import { useSettings } from "../../store/settingsStore";
import { createTestRepository, renderApp } from "../../test/renderApp";

vi.mock("../../platform/notifications", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../platform/notifications")>()),
  getNotificationPermission: vi.fn(() => "granted"),
  scheduleNotifications: vi.fn(),
  cancelScheduledNotifications: vi.fn(),
}));

const reading: NewHabit = {
  name: "Read",
  emoji: "📚",
  color: "emerald",
  schedule: { type: "daily" },
  minimumVersion: "One page",
  reminderTime: "20:00",
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2025, 0, 8, 9, 0)); // Wednesday morning
  useSettings.getState().setRemindersEnabled(true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(scheduleNotifications).mockClear();
  vi.mocked(cancelScheduledNotifications).mockClear();
  vi.mocked(getNotificationPermission).mockReturnValue("granted");
});

/** The notifications passed to the most recent scheduleNotifications call. */
function lastSchedule() {
  return vi.mocked(scheduleNotifications).mock.lastCall?.[0];
}

describe("useReminders", () => {
  it("schedules today's reminders when they're turned on and allowed", async () => {
    const repository = createTestRepository();
    const habit = await repository.createHabit(reading);
    renderApp("/", repository);

    await waitFor(() => {
      expect(lastSchedule()).toEqual([
        {
          title: "📚 Time for Read",
          body: "Short on time? “One page” still counts.",
          tag: `reminder-${habit.id}`,
          at: new Date(2025, 0, 8, 20, 0),
        },
      ]);
    });
  });

  it("drops a reminder once the habit is checked off", async () => {
    const repository = createTestRepository();
    await repository.createHabit(reading);
    const { user } = renderApp("/", repository);
    await waitFor(() => {
      expect(lastSchedule()).toHaveLength(1);
    });

    const tile = (await screen.findByText("Read", { selector: "button span" })).closest("button");
    if (!tile) throw new Error("no tile");
    await user.click(tile);

    await waitFor(() => {
      expect(lastSchedule()).toEqual([]);
    });
  });

  it("schedules nothing when reminders are off", async () => {
    useSettings.getState().setRemindersEnabled(false);
    const repository = createTestRepository();
    await repository.createHabit(reading);
    renderApp("/", repository);

    await screen.findByText("Read", { selector: "button span" });
    expect(scheduleNotifications).not.toHaveBeenCalled();
    expect(cancelScheduledNotifications).toHaveBeenCalled();
  });

  it("schedules nothing without notification permission", async () => {
    vi.mocked(getNotificationPermission).mockReturnValue("denied");
    const repository = createTestRepository();
    await repository.createHabit(reading);
    renderApp("/", repository);

    await screen.findByText("Read", { selector: "button span" });
    expect(scheduleNotifications).not.toHaveBeenCalled();
  });
});
