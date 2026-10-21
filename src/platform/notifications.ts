// Notifications, web implementation.
//
// Browsers can't schedule a notification for later (the Notification Triggers
// API was abandoned, and Push needs a server). So on the web, scheduled
// reminders are timers that only fire while the app is open or in a background
// tab. A Capacitor build can implement the same functions with the Local
// Notifications plugin, which schedules them with the OS so they fire even
// when the app is closed.

export type NotificationPermissionState = "unsupported" | NotificationPermission;

/** Whether scheduled notifications still arrive after the app is closed. */
// Typed as boolean: a native implementation of this module sets it to true.
export const REMINDERS_WORK_WHEN_CLOSED: boolean = false;

export function getNotificationPermission(): NotificationPermissionState {
  if (!("Notification" in globalThis)) return "unsupported";
  return Notification.permission;
}

/** Asks the user for permission (only works in response to a tap or click). */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (getNotificationPermission() === "unsupported") return "unsupported";
  return Notification.requestPermission();
}

export type AppNotification = {
  title: string;
  body: string;
  /** Notifications with the same tag replace each other instead of piling up. */
  tag: string;
};

/**
 * Shows a notification now. Prefers the service worker, which mobile browsers
 * require and which lets a tap open the app (see public/notification-click.js).
 */
export async function showNotification({ title, body, tag }: AppNotification): Promise<void> {
  if (getNotificationPermission() !== "granted") return;
  const options: NotificationOptions = { body, tag, icon: "/pwa-192x192.png" };
  const registration =
    "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (registration) {
    await registration.showNotification(title, options);
    return;
  }
  // No service worker (e.g. the dev server): desktop browsers support this directly.
  const notification = new Notification(title, options);
  notification.addEventListener("click", () => {
    window.focus();
    notification.close();
  });
}

export type ScheduledNotification = AppNotification & { at: Date };

const timers = new Map<string, number>();

/** Cancels every pending scheduled notification. */
export function cancelScheduledNotifications(): void {
  for (const timer of timers.values()) window.clearTimeout(timer);
  timers.clear();
}

/**
 * Replaces the pending schedule with `items`. Items in the past are ignored.
 * Web: fires only while this page stays alive (see the note at the top).
 */
export function scheduleNotifications(items: readonly ScheduledNotification[]): void {
  cancelScheduledNotifications();
  const now = Date.now();
  for (const item of items) {
    const delay = item.at.getTime() - now;
    if (delay < 0) continue;
    const timer = window.setTimeout(() => {
      timers.delete(item.tag);
      showNotification(item).catch((error: unknown) => {
        console.error("Couldn't show reminder", error);
      });
    }, delay);
    timers.set(item.tag, timer);
  }
}

/** How many notifications are waiting to fire. */
export function scheduledNotificationCount(): number {
  return timers.size;
}
