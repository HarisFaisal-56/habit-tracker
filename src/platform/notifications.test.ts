// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { installFakeNotification } from "../test/fakeNotification";
import {
  cancelScheduledNotifications,
  getNotificationPermission,
  requestNotificationPermission,
  scheduledNotificationCount,
  scheduleNotifications,
  showNotification,
} from "./notifications";

const reminder = { title: "📚 Time for Read", body: "One page counts.", tag: "reminder-read" };

afterEach(() => {
  cancelScheduledNotifications();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("permission", () => {
  it("reports unsupported when the browser has no Notification API", async () => {
    expect(getNotificationPermission()).toBe("unsupported");
    await expect(requestNotificationPermission()).resolves.toBe("unsupported");
  });

  it("reports and requests the browser permission", async () => {
    const { FakeNotification } = installFakeNotification("default", "granted");
    expect(getNotificationPermission()).toBe("default");

    await expect(requestNotificationPermission()).resolves.toBe("granted");

    expect(FakeNotification.requestPermission).toHaveBeenCalledOnce();
    expect(getNotificationPermission()).toBe("granted");
  });
});

describe("showNotification", () => {
  it("shows nothing without permission", async () => {
    const { shown } = installFakeNotification("denied");
    await showNotification(reminder);
    expect(shown).toEqual([]);
  });

  it("uses the service worker when one is registered", async () => {
    const { shown } = installFakeNotification("granted");
    const registration = { showNotification: vi.fn(() => Promise.resolve()) };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistration: () => Promise.resolve(registration) },
    });

    try {
      await showNotification(reminder);
    } finally {
      Reflect.deleteProperty(navigator, "serviceWorker");
    }

    expect(registration.showNotification).toHaveBeenCalledWith("📚 Time for Read", {
      body: "One page counts.",
      tag: "reminder-read",
      icon: "/pwa-192x192.png",
    });
    expect(shown).toEqual([]);
  });

  it("falls back to a page notification without a service worker", async () => {
    const { shown } = installFakeNotification("granted");

    await showNotification(reminder);

    expect(shown).toEqual([
      {
        title: "📚 Time for Read",
        options: { body: "One page counts.", tag: "reminder-read", icon: "/pwa-192x192.png" },
      },
    ]);
  });
});

describe("scheduleNotifications", () => {
  const at = (hours: number, minutes = 0) => new Date(2025, 0, 8, hours, minutes);

  it("fires each notification at its time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(7));
    const { shown } = installFakeNotification("granted");

    scheduleNotifications([
      { ...reminder, at: at(8) },
      { ...reminder, title: "🚶 Time for Walk", tag: "reminder-walk", at: at(9, 30) },
    ]);
    expect(scheduledNotificationCount()).toBe(2);

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000 - 1);
    expect(shown).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(shown.map((n) => n.title)).toEqual(["📚 Time for Read"]);
    expect(scheduledNotificationCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(90 * 60 * 1000);
    expect(shown.map((n) => n.title)).toEqual(["📚 Time for Read", "🚶 Time for Walk"]);
  });

  it("replaces the previous schedule", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(7));
    const { shown } = installFakeNotification("granted");

    scheduleNotifications([{ ...reminder, at: at(8) }]);
    scheduleNotifications([]); // e.g. the habit was checked off

    await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);
    expect(shown).toEqual([]);
    expect(scheduledNotificationCount()).toBe(0);
  });

  it("ignores times that have already passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(10));
    installFakeNotification("granted");

    scheduleNotifications([{ ...reminder, at: at(8) }]);

    expect(scheduledNotificationCount()).toBe(0);
  });

  it("can be cancelled", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(7));
    const { shown } = installFakeNotification("granted");

    scheduleNotifications([{ ...reminder, at: at(8) }]);
    cancelScheduledNotifications();

    await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000);
    expect(shown).toEqual([]);
  });
});
